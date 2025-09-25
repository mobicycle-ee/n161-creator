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
        // Extract case details from message using AI
        const extractPrompt = `Extract case details from this message: "${message}"
          Look for: case number, order date, court name, judge name, reason for appeal.
          Return as JSON with keys: caseNumber, orderDate, courtName, judgeName, appealReason`;
        
        const extracted = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          prompt: extractPrompt,
          max_tokens: 500
        });
        
        // Check if we have enough info
        const parsedInfo = tryParseJSON(extracted.response);
        if (parsedInfo && parsedInfo.caseNumber) {
          // Try to fetch order from KV
          const order = await c.env.ORDERS.get(parsedInfo.caseNumber, 'json');
          
          if (order) {
            session.orderDetails = order;
            session.stage = 'analyzing';
            response = `I found your case ${parsedInfo.caseNumber}. Let me analyze the order for potential appeal grounds...`;
            
            // Start analysis with book reference
            const analysis = await aiService.analyzeOrderForAppeal(order);
            
            // Check books for relevant void order information
            const voidContent = await bookService.getRelevantContent('void orders');
            const appealContent = await bookService.getRelevantContent('appeals');
            
            // Enhance analysis with book knowledge
            if (voidContent.length > 0) {
              analysis.bookReferences = voidContent;
              analysis.voidPossibility = true;
            }
            
            session.context.analysis = analysis;
            session.context.bookReferences = [...voidContent, ...appealContent];
            
            response += `\n\nI've identified ${analysis.grounds.length} potential grounds of appeal:\n`;
            analysis.grounds.forEach((ground, i) => {
              response += `${i + 1}. ${ground}\n`;
            });
            
            if (analysis.voidPossibility) {
              response += `\n\n⚠️ IMPORTANT: Based on my analysis and reference to our legal database, this order may be VOID AB INITIO (void from the beginning). This means it may have no legal effect whatsoever. See Book 4 of our legal series for detailed information on void orders.`;
            }
            
            response += '\n\nPlease provide your appellant details (name, address, contact information) to proceed with generating the documents.';
          } else {
            // Create order from extracted info
            session.orderDetails = {
              id: crypto.randomUUID(),
              caseNumber: parsedInfo.caseNumber,
              courtName: parsedInfo.courtName || 'Unknown Court',
              judge: parsedInfo.judgeName || 'Unknown Judge',
              orderDate: parsedInfo.orderDate || new Date().toISOString().split('T')[0],
              decision: parsedInfo.appealReason || 'Decision to be appealed',
              parties: {
                claimant: 'To be determined',
                defendant: 'To be determined'
              }
            };
            response = `I understand you want to appeal case ${parsedInfo.caseNumber}. Please provide your full name and address so I can prepare the appeal documents.`;
            session.stage = 'analyzing';
          }
        } else {
          response = `I need more information. Could you please provide:\n- The case number\n- The date of the order\n- Your reason for wanting to appeal`;
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