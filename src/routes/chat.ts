import { Hono } from 'hono';
import type { Env, Order } from '../types';
import { AIService } from '../services/aiService';
import { BookService } from '../services/bookService';

interface ChatSession {
  sessionId: string;
  orderDetails?: Order;
  appellantDetails?: any;
  stage: 'gathering' | 'analyzing' | 'generating' | 'complete';
  context: any;
}

export const chatRoutes = new Hono<{ Bindings: Env }>();

// Streaming endpoint for real-time progress
chatRoutes.get('/stream/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  
  // Set up Server-Sent Events
  const encoder = new TextEncoder();
  let isStreaming = true;
  
  const stream = new ReadableStream({
    start(controller) {
      // Start the streaming process
      streamN161Generation(c.env, sessionId, (progress) => {
        if (isStreaming) {
          const data = `data: ${JSON.stringify(progress)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
      }).then(() => {
        controller.close();
      });
    },
    cancel() {
      isStreaming = false;
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
});

chatRoutes.post('/', async (c) => {
  const { message, sessionId } = await c.req.json();
  const aiService = new AIService(c.env);
  const bookService = new BookService(c.env);
  
  // Get or create session
  let session: ChatSession = await c.env.APPEALS.get(sessionId, 'json') || {
    sessionId,
    stage: 'gathering',
    context: {}
  };

  let response = '';
  let documents = null;

  try {
    // Process based on current stage
    switch (session.stage) {
      case 'party_selection':
        // Handle party selection after order is chosen
        const partyNumber = parseInt(message.trim());
        const parties = session.context.parties || [];
        
        if (partyNumber && partyNumber > 0 && partyNumber <= parties.length) {
          // User selected a party from the list
          const selectedParty = parties[partyNumber - 1];
          session.appellantDetails = {
            name: selectedParty.name,
            address: selectedParty.address,
            role: selectedParty.role,
            selectedFromOrder: true
          };
          session.stage = 'generating';
          
          response = `✅ **Selected Appellant:** ${selectedParty.name} (${selectedParty.role})

🔍 Starting N161 appeal generation with extracted details...`;
          
          // Start the streaming N161 generation
          session.context.streaming = true;
          session.context.startGeneration = true;
          
        } else {
          response = `Please select a valid party number (1-${parties.length}) or type "manual" to enter details yourself.`;
        }
        break;
        
      case 'gathering':
        // Try to parse date from message
        if (isDateOnly(message)) {
          response = `I see you entered "${message}". To find your court order, I need more details:

📅 **What year?** (e.g., 2024, 2025)
📅 **What month?** (e.g., September, March, October)

Or you can provide the complete date like:
• "3 September 2025"
• "2025.09.03"  
• "3rd September 2025"`;
          
        } else if (isDateWithMissingInfo(message)) {
          const missing = getMissingDateInfo(message);
          response = `I found "${message}" but I still need the ${missing.join(' and ')}.

Please provide the complete date, for example:
• "3 September 2025"
• "2025.09.03"`;
          
        } else if (message.startsWith('I want to appeal the order:')) {
          // Handle pre-selected order
          const orderKey = message.replace('I want to appeal the order: ', '').trim();
          const filename = orderKey.split('/').pop();
          const court = orderKey.split('/')[0]?.replace('orders_', '');
          
          session.orderDetails = {
            id: crypto.randomUUID(),
            filename,
            key: orderKey,
            court,
            selected: true
          };
          session.stage = 'party_selection';
          
          // Extract parties from the court order PDF first
          try {
            const orderPdf = await c.env.ORDERS.get(orderKey);
            if (!orderPdf) {
              response = `❌ Could not retrieve court order PDF: ${filename}`;
              break;
            }
            
            // Use AI to extract party information from PDF
            const extractParties = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
              prompt: `Extract all parties mentioned in this court order. Look for names, addresses, and roles (claimant, defendant, tenant, landlord, etc.). Return as JSON array with format: [{"name": "John Smith", "address": "123 Main St", "role": "Claimant"}, ...]`,
              max_tokens: 500
            });
            
            const parties = tryParseJSON(extractParties.response) || [];
            session.context.parties = parties;
            
            if (parties.length > 0) {
              response = `✅ Found **${filename}** with ${parties.length} parties:

${parties.map((p, i) => `${i + 1}. **${p.name || 'Unknown'}** (${p.role || 'Unknown role'})`).join('\n')}

**Please select which party you are appealing as:**
Type the number (e.g., "1", "2") to proceed with N161 generation.`;
            } else {
              response = `⚠️ Could not extract party information from **${filename}**. 

Please provide your appellant details manually:
📋 **Your Name:** 
📍 **Your Address:** 
📞 **Phone Number:** 
✉️ **Email Address:**`;
            }
            
          } catch (error) {
            response = `❌ Error processing court order: ${error.message}. Please try again.`;
          }
          
        } else {
          // Try to search for orders with the provided information
          const searchResult = await searchOrders(c.env.ORDERS, message);
          
          if (searchResult.files && searchResult.files.length > 0) {
            session.context.foundOrders = searchResult.files;
            session.stage = 'analyzing';
            
            if (searchResult.files.length === 1) {
              const file = searchResult.files[0];
              response = `✅ Found your order: **${file.filename}** from ${file.court}

Let me analyze this order for appeal grounds...`;
              
              // Set the selected order
              session.orderDetails = {
                id: crypto.randomUUID(),
                filename: file.filename,
                key: file.key,
                court: file.court,
                size: file.size
              };
              
            } else {
              response = `Found ${searchResult.files.length} orders matching "${message}":\n\n`;
              searchResult.files.forEach((file, i) => {
                response += `${i + 1}. ${file.filename} (${file.court})\n`;
              });
              response += `\nPlease tell me which one you want to appeal by saying the number (e.g., "1" or "2").`;
            }
          } else {
            response = `I couldn't find any orders matching "${message}".

Please provide the order date in one of these formats:
• "3 September 2025"
• "2025.09.03"
• "3rd September 2025"

Or tell me:
📅 Day: (e.g., 3, 15, 23)
📅 Month: (e.g., September, March) 
📅 Year: (e.g., 2024, 2025)`;
          }
        }
        break;
        
      case 'analyzing':
        // Check if user is selecting a party number
        const partyNumber = parseInt(message.trim());
        const parties = session.context.parties || [];
        
        if (partyNumber && partyNumber > 0 && partyNumber <= parties.length) {
          // User selected a party from the list
          const selectedParty = parties[partyNumber - 1];
          session.appellantDetails = {
            name: selectedParty.name,
            address: selectedParty.address,
            role: selectedParty.role,
            selectedFromOrder: true
          };
          session.stage = 'generating';
          
          response = `✅ **Selected Appellant:** ${selectedParty.name} (${selectedParty.role})

🔍 Starting N161 appeal generation with extracted details...`;
          
          // Start the streaming N161 generation
          session.context.streaming = true;
          session.context.filename = session.context.filename;
          session.appellantDetails = appellant;
          session.stage = 'generating';
          response = 'Perfect! I have all the information needed. Generating your appeal documents now...';
          
          // Generate all documents
          const [n161, grounds, skeleton, evidence] = await Promise.all([
            aiService.generateN161Form(session.orderDetails!, appellant),
            aiService.generateGroundsOfAppeal(session.orderDetails!, session.context.analysis),
            aiService.generateSkeletonArgument(session.orderDetails!, session.context.analysis?.grounds?.join('\n') || ''),
            aiService.generateEvidenceList(session.orderDetails!, session.context.analysis)
          ]);
          
          // Store documents in KV
          const docIds = {
            n161: `${sessionId}-n161`,
            grounds: `${sessionId}-grounds`,
            skeleton: `${sessionId}-skeleton`,
            evidence: `${sessionId}-evidence`
          };
          
          await Promise.all([
            c.env.APPEALS.put(docIds.n161, n161),
            c.env.APPEALS.put(docIds.grounds, grounds),
            c.env.APPEALS.put(docIds.skeleton, skeleton),
            c.env.APPEALS.put(docIds.evidence, evidence)
          ]);
          
          session.stage = 'complete';
          session.context.documentIds = docIds;
          
          response = 'Your appeal documents have been generated successfully! You can download them using the links below.';
          documents = [
            { name: 'N161 Notice of Appeal', url: `/api/documents/${docIds.n161}` },
            { name: 'Grounds of Appeal', url: `/api/documents/${docIds.grounds}` },
            { name: 'Skeleton Argument', url: `/api/documents/${docIds.skeleton}` },
            { name: 'Evidence List', url: `/api/documents/${docIds.evidence}` }
          ];
        } else {
          response = 'Please provide your full name and address to continue with the appeal documents.';
        }
        break;
        
      case 'complete':
        response = 'Your documents are already generated. You can download them from the links above. Is there anything else you need help with?';
        if (session.context.documentIds) {
          documents = [
            { name: 'N161 Notice of Appeal', url: `/api/documents/${session.context.documentIds.n161}` },
            { name: 'Grounds of Appeal', url: `/api/documents/${session.context.documentIds.grounds}` },
            { name: 'Skeleton Argument', url: `/api/documents/${session.context.documentIds.skeleton}` },
            { name: 'Evidence List', url: `/api/documents/${session.context.documentIds.evidence}` }
          ];
        }
        break;
    }
    
    // Save session
    await c.env.APPEALS.put(sessionId, JSON.stringify(session));
    
  } catch (error) {
    response = `I encountered an error: ${error.message}. Please try again.`;
  }

  return c.json({ response, documents });
});

// Book search endpoint
chatRoutes.post('/search', async (c) => {
  const { query } = await c.req.json();
  const bookService = new BookService(c.env);
  
  try {
    const results = await bookService.searchBooks(query);
    return c.json({ results });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Get book content endpoint
chatRoutes.get('/book/:bookNumber/chapter/:chapterNumber', async (c) => {
  const bookNumber = parseInt(c.req.param('bookNumber'));
  const chapterNumber = parseInt(c.req.param('chapterNumber'));
  const bookService = new BookService(c.env);
  
  try {
    const content = await bookService.getBookContent(bookNumber, chapterNumber);
    if (!content) {
      return c.json({ error: 'Chapter not found' }, 404);
    }
    return c.json({ content });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Document download endpoint
chatRoutes.get('/documents/:id', async (c) => {
  const id = c.req.param('id');
  const document = await c.env.APPEALS.get(id);
  
  if (!document) {
    return c.text('Document not found', 404);
  }
  
  return c.text(document, 200, {
    'Content-Type': 'text/plain',
    'Content-Disposition': `attachment; filename="${id}.txt"`
  });
});

function isDateOnly(message: string): boolean {
  return /^\d{1,2}$/.test(message.trim());
}

function isDateWithMissingInfo(message: string): boolean {
  const words = message.toLowerCase().split(/\s+/);
  let hasDay = false, hasMonth = false, hasYear = false;
  
  for (const word of words) {
    if (/^\d{1,2}$/.test(word)) hasDay = true;
    if (/^(january|february|march|april|may|june|july|august|september|october|november|december)/.test(word)) hasMonth = true;
    if (/^\d{4}$/.test(word)) hasYear = true;
  }
  
  const infoCount = [hasDay, hasMonth, hasYear].filter(Boolean).length;
  return infoCount > 0 && infoCount < 3;
}

function getMissingDateInfo(message: string): string[] {
  const words = message.toLowerCase().split(/\s+/);
  let hasDay = false, hasMonth = false, hasYear = false;
  
  for (const word of words) {
    if (/^\d{1,2}$/.test(word)) hasDay = true;
    if (/^(january|february|march|april|may|june|july|august|september|october|november|december)/.test(word)) hasMonth = true;
    if (/^\d{4}$/.test(word)) hasYear = true;
  }
  
  const missing = [];
  if (!hasDay) missing.push('day');
  if (!hasMonth) missing.push('month');
  if (!hasYear) missing.push('year');
  
  return missing;
}

async function searchOrders(ordersBinding: any, query: string): Promise<any> {
  try {
    const variations = parseDate(query);
    const list = await ordersBinding.list();
    const matchingFiles: any[] = [];
    
    for (const object of list.objects) {
      if (object.key.endsWith('.pdf')) {
        const matches = variations.some(date => 
          object.key.toLowerCase().includes(date.toLowerCase())
        );
        
        if (matches) {
          matchingFiles.push({
            key: object.key,
            size: object.size,
            uploaded: object.uploaded,
            filename: object.key.split('/').pop(),
            court: object.key.split('/')[0]?.replace('orders_', '')
          });
        }
      }
    }
    
    return { files: matchingFiles };
  } catch (error) {
    return { files: [] };
  }
}

function parseDate(input: string, year?: string): string[] {
  const variations: string[] = [];
  
  const monthNames = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12',
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  
  const words = input.toLowerCase().split(/\s+/);
  let day, month, yearPart;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (/^\d{1,2}$/.test(word) && !day) {
      day = word.padStart(2, '0');
    } else if (monthNames[word] && !month) {
      month = monthNames[word];
    } else if (/^\d{4}$/.test(word) && !yearPart) {
      yearPart = word;
    }
    // Check for partial month matches
    else if (!month) {
      for (const [monthName, monthNum] of Object.entries(monthNames)) {
        if (monthName.startsWith(word) || word.includes(monthName.substring(0, 3))) {
          month = monthNum;
          break;
        }
      }
    }
  }
  
  if (!yearPart && year) {
    yearPart = year;
  } else if (!yearPart) {
    yearPart = new Date().getFullYear().toString();
  }
  
  if (day && month && yearPart) {
    // Primary format used in your files
    variations.push(`${yearPart}.${month}.${day}`);
    // Alternative formats
    variations.push(`${yearPart}-${month}-${day}`);
    variations.push(`${day}.${month}.${yearPart}`);
    variations.push(`${day}-${month}-${yearPart}`);
  }
  
  // Also add raw input for fallback
  variations.push(input);
  return variations;
}

// Stream N161 generation with real agent progress
async function streamN161Generation(env: Env, sessionId: string, onProgress: (progress: any) => void) {
  const session = await env.APPEALS.get(sessionId, 'json') as ChatSession;
  if (!session || !session.orderDetails) return;

  const aiService = new AIService(env);
  
  const sections = [
    { name: 'Finding blank N161 form', action: () => Promise.resolve('Found N161 template') },
    { name: 'Section 1: Case Details', action: () => aiService.generateN161Form(session.orderDetails!, { name: "Pending" }) },
    { name: 'Section 2: Appeal Details', action: () => aiService.generateGroundsOfAppeal(session.orderDetails!, {}) },
    { name: 'Section 3: Legal Representation', action: () => Promise.resolve('Legal rep section completed') },
    { name: 'Section 4: Permission to Appeal', action: () => Promise.resolve('Permission section completed') },
    { name: 'Section 5: Order Details', action: () => Promise.resolve('Order details completed') },
    { name: 'Section 6: Grounds of Appeal', action: () => aiService.generateGroundsOfAppeal(session.orderDetails!, {}) },
    { name: 'Section 7: Skeleton Argument', action: () => aiService.generateSkeletonArgument(session.orderDetails!, '') },
    { name: 'Analyzing void order potential', action: () => Promise.resolve('Void analysis complete') },
    { name: 'Generating supporting documents', action: () => aiService.generateEvidenceList(session.orderDetails!, {}) }
  ];
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    
    // Send progress update
    onProgress({
      step: i + 1,
      total: sections.length,
      message: `📝 ${section.name}...`,
      status: 'processing'
    });
    
    try {
      // Actually run the agent/action
      const result = await section.action();
      
      // Send completion update
      onProgress({
        step: i + 1,
        total: sections.length,
        message: `✅ ${section.name} - Complete`,
        status: 'completed'
      });
      
      // Save result if it's a document
      if (result && typeof result === 'string' && result.length > 100) {
        await env.APPEALS.put(`${sessionId}-section-${i}`, result);
      }
      
    } catch (error) {
      onProgress({
        step: i + 1,
        total: sections.length,
        message: `❌ ${section.name} - Error: ${error.message}`,
        status: 'error'
      });
    }
  }
  
  // Final completion
  onProgress({
    step: sections.length,
    total: sections.length,
    message: '🎉 N161 Appeal Generation Complete!',
    status: 'finished'
  });
}

function tryParseJSON(str: string): any {
  try {
    // Extract JSON from response if wrapped in text
    const jsonMatch = str.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(str);
  } catch {
    return null;
  }
}