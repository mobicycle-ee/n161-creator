import { Hono } from 'hono';
import type { Env } from '../types';
import { BookService } from '../services/bookService';
import { AIService } from '../services/aiService';

export const agentRoutes = new Hono<{ Bindings: Env }>();

// Agent for analyzing grounds of appeal
agentRoutes.post('/analyze-grounds', async (c) => {
  const { orderDetails, context } = await c.req.json();
  const bookService = new BookService(c.env);
  const aiService = new AIService(c.env);
  
  try {
    // Get relevant void order content from books
    const voidContent = await bookService.getRelevantContent('void orders');
    const democracyContent = await bookService.getRelevantContent('democracy');
    const systemicContent = await bookService.getRelevantContent('systemic issues');
    
    // Combine context with book knowledge
    const enhancedContext = {
      ...context,
      voidOrderKnowledge: voidContent,
      systemicIssues: [...democracyContent, ...systemicContent]
    };
    
    // Use AI to analyze with enhanced context
    const analysisPrompt = `
      Analyze this court order for appeal grounds, considering:
      1. Potential voidness (jurisdiction, mandatory breaches)
      2. International law violations
      3. Domestic law breaches
      4. Systemic/constitutional issues
      
      Order details: ${JSON.stringify(orderDetails)}
      
      Reference knowledge:
      - Void order patterns from Book 4
      - Systemic issues from Book 0
      - Procedural violations from Book 3
      
      Provide specific, actionable grounds with legal citations.
    `;
    
    const analysis = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: analysisPrompt,
      max_tokens: 2000
    });
    
    return c.json({
      grounds: analysis.response,
      bookReferences: enhancedContext,
      voidPossibility: voidContent.length > 0
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Agent for drafting specific N161 sections
agentRoutes.post('/draft-section', async (c) => {
  const { section, orderDetails, grounds, appellantDetails } = await c.req.json();
  const bookService = new BookService(c.env);
  
  try {
    // Get relevant content based on section
    let relevantContent = [];
    switch(section) {
      case 'grounds':
        relevantContent = await bookService.getRelevantContent('void orders');
        break;
      case 'facts':
        relevantContent = await bookService.getRelevantContent('systemic issues');
        break;
      case 'remedy':
        relevantContent = await bookService.getRelevantContent('appeals');
        break;
    }
    
    const draftPrompt = `
      Draft the ${section} section of an N161 appeal form.
      
      Order: ${JSON.stringify(orderDetails)}
      Grounds: ${JSON.stringify(grounds)}
      Appellant: ${JSON.stringify(appellantDetails)}
      
      Style: Clear, formal legal language
      Length: Appropriate for N161 form
      
      Reference successful examples from the legal books.
    `;
    
    const draft = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: draftPrompt,
      max_tokens: 1500
    });
    
    return c.json({
      section,
      content: draft.response,
      references: relevantContent
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Agent for void order detection
agentRoutes.post('/detect-void', async (c) => {
  const { orderText, orderDetails } = await c.req.json();
  const bookService = new BookService(c.env);
  
  try {
    // Get Book 4 content on void orders
    const book4Chapters = [];
    for (let i = 1; i <= 8; i++) {
      const chapter = await bookService.getBookContent(4, i);
      if (chapter) {
        book4Chapters.push({
          chapter: i,
          preview: chapter.substring(0, 1000)
        });
      }
    }
    
    const voidPrompt = `
      Based on the comprehensive analysis of void orders in our legal database,
      analyze this order for potential voidness:
      
      Order text: ${orderText || 'Not provided'}
      Order details: ${JSON.stringify(orderDetails)}
      
      Check for:
      1. Lack of jurisdiction (Book 4, Chapter 1)
      2. Mandatory requirement breaches (Book 3, Chapters 4-5)
      3. International law violations (Book 2, all chapters)
      4. Fundamental rights violations
      5. Ultra vires acts
      
      Provide percentage likelihood of voidness and specific reasons.
    `;
    
    const voidAnalysis = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: voidPrompt,
      max_tokens: 1000
    });
    
    return c.json({
      analysis: voidAnalysis.response,
      book4References: book4Chapters,
      warningLevel: voidAnalysis.response.includes('high') ? 'HIGH' : 
                   voidAnalysis.response.includes('medium') ? 'MEDIUM' : 'LOW'
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Agent for systemic pattern detection
agentRoutes.post('/detect-patterns', async (c) => {
  const { caseHistory, judgeHistory } = await c.req.json();
  const bookService = new BookService(c.env);
  
  try {
    // Get Book 0 content on systemic issues
    const democracyContent = await bookService.getBookContent(0, 1); // Chapter 1: Democracy Illusion
    const systemContent = await bookService.getBookContent(0, 3); // Chapter 3: How the Game Works
    
    const patternPrompt = `
      Analyze for systemic patterns of injustice:
      
      Case history: ${JSON.stringify(caseHistory)}
      Judge history: ${JSON.stringify(judgeHistory)}
      
      Reference Book 0 (Democracy Is Dead) insights on:
      - Systematic oppression patterns
      - Judicial capture
      - Procedural exhaustion tactics
      
      Identify patterns that suggest systematic bias or corruption.
    `;
    
    const patterns = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: patternPrompt,
      max_tokens: 1500
    });
    
    return c.json({
      patterns: patterns.response,
      systemicEvidence: {
        democracy: democracyContent?.substring(0, 500),
        system: systemContent?.substring(0, 500)
      }
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Agent for strategic advice
agentRoutes.post('/strategic-advice', async (c) => {
  const { situation, resources, timeline } = await c.req.json();
  const bookService = new BookService(c.env);
  
  try {
    // Get survival strategies from Book 1
    const survivalContent = await bookService.getRelevantContent('appeals');
    
    // Get systemic understanding from Book 0
    const systemicContent = await bookService.getBookContent(0, 7); // Chapter 7: Breaking the Spell
    
    const strategyPrompt = `
      Provide strategic advice for this legal situation:
      
      Situation: ${JSON.stringify(situation)}
      Resources: ${JSON.stringify(resources)}
      Timeline: ${JSON.stringify(timeline)}
      
      Consider:
      - Practical survival strategies (Book 1)
      - Systemic realities (Book 0)
      - Void order possibilities (Book 4)
      - Cost/benefit analysis
      - Alternative approaches
      
      Be realistic but empowering.
    `;
    
    const strategy = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: strategyPrompt,
      max_tokens: 2000
    });
    
    return c.json({
      advice: strategy.response,
      resources: survivalContent,
      alternativeApproaches: systemicContent?.substring(0, 1000)
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Master orchestrator agent
agentRoutes.post('/orchestrate', async (c) => {
  const { task, context } = await c.req.json();
  
  try {
    // Determine which agents to invoke based on task
    const agents = [];
    
    if (task.includes('appeal') || task.includes('N161')) {
      agents.push('analyze-grounds', 'detect-void', 'draft-section');
    }
    
    if (task.includes('pattern') || task.includes('systemic')) {
      agents.push('detect-patterns');
    }
    
    if (task.includes('strategy') || task.includes('advice')) {
      agents.push('strategic-advice');
    }
    
    // Execute agents in sequence or parallel as needed
    const results = {};
    
    for (const agent of agents) {
      const response = await fetch(`${c.req.url.origin}/api/agents/${agent}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      });
      results[agent] = await response.json();
    }
    
    return c.json({
      task,
      agents: agents,
      results
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});