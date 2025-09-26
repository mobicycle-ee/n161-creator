import type { Env } from '../types';
import { BookService } from '../services/bookService';

export class ReliefSoughtAgent {
  private bookService: BookService;
  
  constructor(private env: Env) {
    this.bookService = new BookService(env);
  }
  
  async generateSection9(orderDetails: any, grounds: any[], context?: any) {
    // Determine appropriate relief based on order type and grounds
    const reliefOptions = await this.determineReliefOptions(orderDetails, grounds);
    
    // Get strategic content from books
    const voidContent = await this.bookService.getRelevantContent('void orders');
    const costsContent = await this.bookService.getRelevantContent('costs');
    
    const reliefPrompt = `
      Generate appropriate relief for N161 Section 9 based on:
      
      Order type: ${orderDetails.type}
      Grounds: ${JSON.stringify(grounds)}
      Context: ${JSON.stringify(context)}
      
      Consider:
      1. Primary relief (set aside, vary, remit)
      2. Interim relief (stay, injunction)
      3. Consequential orders
      4. Costs orders
      5. Human rights remedies if applicable
      
      If order potentially void, include declaration of voidness.
      
      Format as numbered list of specific orders sought.
    `;
    
    const generated = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: reliefPrompt,
      max_tokens: 1000
    });
    
    const relief = this.structureRelief(reliefOptions, generated.response);
    
    return {
      section: 'Section 9: Relief Sought',
      primaryRelief: relief.primary,
      interimRelief: relief.interim,
      consequentialOrders: relief.consequential,
      costsOrders: relief.costs,
      alternativeRelief: relief.alternative,
      bookReferences: [...voidContent.slice(0, 1), ...costsContent.slice(0, 1)],
      justification: this.justifyRelief(relief, grounds),
      tips: this.getReliefTips(),
      warnings: this.getReliefWarnings(relief, orderDetails)
    };
  }
  
  private async determineReliefOptions(orderDetails: any, grounds: any[]): Promise<any> {
    const options = {
      primary: [] as string[],
      interim: [] as string[],
      consequential: [] as string[],
      costs: [] as string[],
      alternative: [] as string[]
    };
    
    // Primary relief based on grounds
    if (grounds.some(g => g.title.toLowerCase().includes('void'))) {
      options.primary.push('Declaration that the order dated [date] is void ab initio');
      options.primary.push('Order setting aside the void order in its entirety');
    } else {
      options.primary.push('Order setting aside the decision of [judge] dated [date]');
    }
    
    // Consider order type
    if (orderDetails.type?.includes('possession')) {
      options.interim.push('Stay of execution of possession order pending appeal');
      options.interim.push('Order that no warrant of possession be issued pending appeal');
      options.primary.push('Discharge of possession order');
    }
    
    if (orderDetails.type?.includes('injunction')) {
      options.interim.push('Suspension of injunction pending appeal');
      options.primary.push('Discharge of injunction');
    }
    
    if (orderDetails.type?.includes('costs')) {
      options.primary.push('Set aside costs order');
      options.primary.push('Re-assessment of costs');
    }
    
    // Remittal
    if (!grounds.some(g => g.title.toLowerCase().includes('void'))) {
      options.primary.push('Remit matter to [court] for rehearing before different judge');
      options.alternative.push('Alternatively, remit with directions for reconsideration');
    }
    
    // Consequential orders
    options.consequential.push('Extension of time for compliance with any orders');
    options.consequential.push('Liberty to apply for further directions');
    
    if (orderDetails.damages || orderDetails.compensation) {
      options.consequential.push('Stay of enforcement of money judgment pending appeal');
    }
    
    // Costs
    options.costs.push('Costs of the appeal');
    options.costs.push('Costs below to be costs in the appeal');
    
    if (grounds.some(g => g.likelihood === 'high')) {
      options.costs.push('Costs on indemnity basis if unreasonable conduct proven');
    }
    
    // Human rights remedies
    if (grounds.some(g => g.title.toLowerCase().includes('article') || g.title.toLowerCase().includes('human'))) {
      options.primary.push('Declaration that decision incompatible with Convention rights');
      options.consequential.push('Damages under s.8 Human Rights Act 1998');
    }
    
    return options;
  }
  
  private structureRelief(options: any, aiResponse: string): any {
    const relief = {
      primary: options.primary || [],
      interim: options.interim || [],
      consequential: options.consequential || [],
      costs: options.costs || [],
      alternative: options.alternative || []
    };
    
    // Parse AI response for additional relief
    const lines = aiResponse.split('\n');
    for (const line of lines) {
      if (line.match(/^\d+\./)) {
        const cleanLine = line.replace(/^\d+\.\s*/, '').trim();
        
        if (line.toLowerCase().includes('stay') || line.toLowerCase().includes('suspend')) {
          if (!relief.interim.includes(cleanLine)) {
            relief.interim.push(cleanLine);
          }
        } else if (line.toLowerCase().includes('costs')) {
          if (!relief.costs.includes(cleanLine)) {
            relief.costs.push(cleanLine);
          }
        } else if (line.toLowerCase().includes('alternatively')) {
          if (!relief.alternative.includes(cleanLine)) {
            relief.alternative.push(cleanLine);
          }
        } else if (line.toLowerCase().includes('consequential') || line.toLowerCase().includes('liberty')) {
          if (!relief.consequential.includes(cleanLine)) {
            relief.consequential.push(cleanLine);
          }
        } else {
          if (!relief.primary.includes(cleanLine) && cleanLine.length > 10) {
            relief.primary.push(cleanLine);
          }
        }
      }
    }
    
    return relief;
  }
  
  private justifyRelief(relief: any, grounds: any[]): string[] {
    const justification = [];
    
    if (relief.primary.some((r: string) => r.includes('void'))) {
      justification.push('Void order creates no legal obligations and must be set aside');
    }
    
    if (relief.interim.length > 0) {
      justification.push('Interim relief necessary to preserve position pending appeal');
      
      if (relief.interim.some((r: string) => r.includes('possession'))) {
        justification.push('Eviction would cause irreparable harm if appeal succeeds');
      }
    }
    
    if (grounds.some(g => g.title.includes('Article 8'))) {
      justification.push('Article 8 rights engaged - proportionality requires stay');
    }
    
    if (grounds.some(g => g.title.includes('procedural'))) {
      justification.push('Procedural unfairness requires complete rehearing');
    }
    
    if (relief.costs.some((r: string) => r.includes('indemnity'))) {
      justification.push('Unreasonable conduct warrants indemnity costs');
    }
    
    return justification;
  }
  
  private getReliefTips(): string[] {
    return [
      'Be specific about orders sought',
      'Include fallback positions',
      'Consider interim relief to maintain status quo',
      'Request costs in any event',
      'Include liberty to apply clause',
      'Match relief to grounds of appeal',
      'Consider practical enforceability',
      'Draft orders you want court to make'
    ];
  }
  
  private getReliefWarnings(relief: any, orderDetails: any): string[] {
    const warnings = [];
    
    if (relief.primary.length === 0) {
      warnings.push('No primary relief specified - must state what order you want');
    }
    
    if (orderDetails.type?.includes('possession') && !relief.interim.some((r: string) => r.includes('stay'))) {
      warnings.push('Possession order but no stay requested - risk of eviction during appeal');
    }
    
    if (relief.primary.length > 5) {
      warnings.push('Too many relief options - focus on essential orders');
    }
    
    if (!relief.costs || relief.costs.length === 0) {
      warnings.push('No costs order requested - always seek costs');
    }
    
    return warnings;
  }
}