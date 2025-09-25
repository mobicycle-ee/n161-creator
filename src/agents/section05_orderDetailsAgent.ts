import type { Env } from '../types';
import { BookService } from '../services/bookService';

export class OrderDetailsAgent {
  private bookService: BookService;
  
  constructor(private env: Env) {
    this.bookService = new BookService(env);
  }
  
  async populateSection5(orderText: string, orderInfo?: any) {
    // Extract order details from text
    const extractedDetails = await this.extractOrderDetails(orderText);
    
    // Check for void indicators
    const voidCheck = await this.checkVoidIndicators(extractedDetails, orderText);
    
    // Get relevant book content
    const voidContent = await this.bookService.getRelevantContent('void orders');
    const jurisdictionContent = await this.bookService.getRelevantContent('jurisdiction');
    
    const analysisPrompt = `
      Extract and analyze order details for N161 Section 5:
      
      Order text: ${orderText}
      Provided info: ${JSON.stringify(orderInfo)}
      
      Extract:
      1. Judge name and designation
      2. Court name and level
      3. Order date
      4. Order type (final, interim, etc)
      5. Key provisions ordered
      6. Whether sealed
      7. Method of making (hearing, paper, without notice)
      
      Check for CPR 40.2 compliance:
      - Name and judicial title
      - Bear date made
      - Court seal (if mentioned)
      
      Identify any defects that might render void.
    `;
    
    const analysis = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: analysisPrompt,
      max_tokens: 1000
    });
    
    const parsed = this.parseOrderAnalysis(analysis.response);
    const merged = this.mergeDetails(extractedDetails, parsed, orderInfo);
    
    return {
      section: 'Section 5: Details of Order Being Appealed',
      orderDetails: merged,
      voidIndicators: voidCheck,
      cpr40Compliance: this.checkCPR40Compliance(merged),
      defects: this.identifyDefects(merged, orderText),
      bookReferences: [...voidContent.slice(0, 2), ...jurisdictionContent.slice(0, 1)],
      warnings: this.getOrderWarnings(merged, voidCheck),
      tips: [
        'Quote exact wording from order',
        'Include paragraph numbers if present',
        'Note if order was made without hearing',
        'Specify if made ex parte/without notice'
      ]
    };
  }
  
  private async extractOrderDetails(orderText: string): Promise<any> {
    const details: any = {
      judge: null,
      court: null,
      date: null,
      type: null,
      provisions: [],
      sealed: false,
      method: null
    };
    
    // Extract judge
    const judgePatterns = [
      /(?:His|Her) Honour Judge ([A-Z][\w\s]+)/i,
      /(?:HHJ|H\.H\.J\.) ([A-Z][\w\s]+)/i,
      /District Judge ([A-Z][\w\s]+)/i,
      /(?:DJ|D\.J\.) ([A-Z][\w\s]+)/i,
      /Circuit Judge ([A-Z][\w\s]+)/i,
      /(?:Master|Deputy Master) ([A-Z][\w\s]+)/i,
      /(?:Mr|Mrs|Ms) Justice ([A-Z][\w\s]+)/i
    ];
    
    for (const pattern of judgePatterns) {
      const match = orderText.match(pattern);
      if (match) {
        details.judge = match[0];
        break;
      }
    }
    
    // Extract court
    const courtMatch = orderText.match(/(?:County Court at|High Court|Court of Appeal)([^,\.]+)/i);
    if (courtMatch) {
      details.court = courtMatch[0].trim();
    }
    
    // Extract date
    const datePatterns = [
      /\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i,
      /\d{1,2}\/\d{1,2}\/\d{4}/,
      /\d{4}-\d{2}-\d{2}/
    ];
    
    for (const pattern of datePatterns) {
      const match = orderText.match(pattern);
      if (match) {
        details.date = match[0];
        break;
      }
    }
    
    // Check if sealed
    if (orderText.match(/seal/i)) {
      details.sealed = true;
    }
    
    // Determine method
    if (orderText.match(/without notice|ex parte/i)) {
      details.method = 'Without notice/Ex parte';
    } else if (orderText.match(/on paper|written submissions/i)) {
      details.method = 'On paper';
    } else if (orderText.match(/hearing|heard/i)) {
      details.method = 'After hearing';
    }
    
    // Extract order type
    if (orderText.match(/final order|final judgment/i)) {
      details.type = 'Final order';
    } else if (orderText.match(/interim order|interim relief/i)) {
      details.type = 'Interim order';
    } else if (orderText.match(/case management|directions/i)) {
      details.type = 'Case management order';
    } else if (orderText.match(/possession order/i)) {
      details.type = 'Possession order';
    }
    
    return details;
  }
  
  private async checkVoidIndicators(details: any, orderText: string): Promise<any[]> {
    const indicators = [];
    
    // No judge identified
    if (!details.judge) {
      indicators.push({
        type: 'CRITICAL',
        issue: 'No judge identified',
        rule: 'CPR 40.2(2)(a) - order must state name and judicial title',
        consequence: 'Order may be void for non-compliance with mandatory requirement'
      });
    }
    
    // No date
    if (!details.date) {
      indicators.push({
        type: 'CRITICAL',
        issue: 'No date on order',
        rule: 'CPR 40.2(2)(b) - order must bear date when made',
        consequence: 'Order may be void for non-compliance with mandatory requirement'
      });
    }
    
    // Not sealed
    if (!details.sealed && !orderText.match(/draft|unsigned/i)) {
      indicators.push({
        type: 'SERIOUS',
        issue: 'Order may not be sealed',
        rule: 'CPR 40.2(2)(c) - order must be sealed',
        consequence: 'Unsealed order may not be enforceable'
      });
    }
    
    // Without notice
    if (details.method === 'Without notice/Ex parte') {
      indicators.push({
        type: 'SERIOUS',
        issue: 'Order made without notice',
        rule: 'Article 6 ECHR - right to fair hearing',
        consequence: 'May violate right to be heard - check if justified'
      });
    }
    
    return indicators;
  }
  
  private checkCPR40Compliance(details: any): any {
    const compliance = {
      compliant: true,
      missing: [],
      present: []
    };
    
    // Check requirements
    if (details.judge) {
      compliance.present.push('Judge name and title (CPR 40.2(2)(a))');
    } else {
      compliance.missing.push('Judge name and title (CPR 40.2(2)(a))');
      compliance.compliant = false;
    }
    
    if (details.date) {
      compliance.present.push('Date order made (CPR 40.2(2)(b))');
    } else {
      compliance.missing.push('Date order made (CPR 40.2(2)(b))');
      compliance.compliant = false;
    }
    
    if (details.sealed) {
      compliance.present.push('Court seal (CPR 40.2(2)(c))');
    } else {
      compliance.missing.push('Court seal (CPR 40.2(2)(c))');
    }
    
    return compliance;
  }
  
  private identifyDefects(details: any, orderText: string): string[] {
    const defects = [];
    
    if (!details.judge) {
      defects.push('Missing judge identification - fundamental defect');
    }
    
    if (!details.date) {
      defects.push('Missing date - cannot determine appeal deadline');
    }
    
    if (orderText.length < 100) {
      defects.push('Order appears incomplete or truncated');
    }
    
    if (!orderText.match(/order|ordered|direct|directed/i)) {
      defects.push('No operative provisions identified');
    }
    
    if (details.method === 'Without notice/Ex parte' && 
        !orderText.match(/urgent|emergency|risk/i)) {
      defects.push('Ex parte order without apparent justification');
    }
    
    return defects;
  }
  
  private parseOrderAnalysis(response: string): any {
    const parsed: any = {
      judge: null,
      court: null,
      date: null,
      type: null,
      provisions: [],
      method: null
    };
    
    const lines = response.split('\n');
    
    for (const line of lines) {
      const lower = line.toLowerCase();
      
      if (lower.includes('judge:') || lower.includes('judge name:')) {
        parsed.judge = line.split(':')[1]?.trim();
      }
      if (lower.includes('court:') || lower.includes('court name:')) {
        parsed.court = line.split(':')[1]?.trim();
      }
      if (lower.includes('date:') || lower.includes('order date:')) {
        parsed.date = line.split(':')[1]?.trim();
      }
      if (lower.includes('type:') || lower.includes('order type:')) {
        parsed.type = line.split(':')[1]?.trim();
      }
      if (lower.includes('method:') || lower.includes('made:')) {
        parsed.method = line.split(':')[1]?.trim();
      }
    }
    
    return parsed;
  }
  
  private mergeDetails(extracted: any, parsed: any, provided: any): any {
    return {
      judge: provided?.judge || extracted.judge || parsed.judge || 'Not identified',
      court: provided?.court || extracted.court || parsed.court || 'Not specified',
      date: provided?.date || extracted.date || parsed.date || null,
      type: provided?.type || extracted.type || parsed.type || 'Order',
      provisions: [
        ...(extracted.provisions || []),
        ...(parsed.provisions || []),
        ...(provided?.provisions || [])
      ],
      sealed: extracted.sealed || provided?.sealed || false,
      method: provided?.method || extracted.method || parsed.method || 'Unknown'
    };
  }
  
  private getOrderWarnings(details: any, voidIndicators: any[]): string[] {
    const warnings = [];
    
    if (voidIndicators.some(i => i.type === 'CRITICAL')) {
      warnings.push('CRITICAL: Order may be void - consider set aside application');
    }
    
    if (!details.date) {
      warnings.push('Cannot verify appeal deadline without order date');
    }
    
    if (details.judge === 'Not identified') {
      warnings.push('Judge not identified - major procedural defect');
    }
    
    if (!details.sealed) {
      warnings.push('Order may not be sealed - verify enforceability');
    }
    
    return warnings;
  }
}