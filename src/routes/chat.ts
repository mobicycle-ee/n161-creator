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
        // Extract appellant details
        const appellantPrompt = `Extract appellant details from: "${message}"
          Look for: name, address, phone, email.
          Return as JSON.`;
        
        const appellantData = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          prompt: appellantPrompt,
          max_tokens: 300
        });
        
        const appellant = tryParseJSON(appellantData.response);
        if (appellant && appellant.name) {
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