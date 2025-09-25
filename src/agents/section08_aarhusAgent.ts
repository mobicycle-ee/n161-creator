import type { Env } from '../types';
import { BookService } from '../services/bookService';

export class AarhusConventionAgent {
  private bookService: BookService;
  
  constructor(private env: Env) {
    this.bookService = new BookService(env);
  }
  
  async assessSection8(caseDetails: any, grounds?: any[]) {
    // Aarhus Convention applies to environmental cases
    const isEnvironmental = this.checkEnvironmentalCase(caseDetails, grounds);
    
    if (!isEnvironmental) {
      return {
        section: 'Section 8: Aarhus Convention',
        applicable: false,
        reason: 'Not an environmental case',
        guidance: 'Leave this section blank unless case involves environmental law'
      };
    }
    
    // Get relevant environmental law content
    const internationalContent = await this.bookService.getRelevantContent('international law');
    
    const aarhusPrompt = `
      Assess Aarhus Convention claim for N161 Section 8:
      
      Case: ${JSON.stringify(caseDetails)}
      
      The Aarhus Convention provides:
      1. Access to environmental information
      2. Public participation in environmental decisions
      3. Access to justice in environmental matters
      4. Protection from prohibitive costs
      
      Check if:
      - Case involves environmental decision
      - Public participation was denied
      - Costs are prohibitively expensive
      - Protective costs order needed
      
      Only claim if genuine environmental issue.
    `;
    
    const analysis = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: aarhusPrompt,
      max_tokens: 800
    });
    
    return {
      section: 'Section 8: Aarhus Convention', 
      applicable: true,
      claim: this.generateAarhusClaim(caseDetails, analysis.response),
      costsProtection: this.determineCostsProtection(caseDetails),
      bookReferences: internationalContent.slice(0, 2),
      warnings: [
        'Only claim if genuine environmental issue',
        'Must file costs schedule if claiming',
        'Court will scrutinize claim carefully'
      ]
    };
  }
  
  private checkEnvironmentalCase(caseDetails: any, grounds?: any[]): boolean {
    const environmentalKeywords = [
      'planning', 'pollution', 'environmental',
      'contamination', 'waste', 'emissions',
      'conservation', 'habitat', 'species',
      'public health', 'toxic', 'chemical'
    ];
    
    const caseString = JSON.stringify(caseDetails).toLowerCase();
    const groundsString = JSON.stringify(grounds).toLowerCase();
    
    return environmentalKeywords.some(keyword => 
      caseString.includes(keyword) || groundsString.includes(keyword)
    );
  }
  
  private generateAarhusClaim(caseDetails: any, aiResponse: string): any {
    return {
      statement: 'This is an Aarhus Convention claim',
      basis: [
        'Case involves environmental matters',
        'Public interest in environmental protection',
        'Access to justice must not be prohibitively expensive'
      ],
      costsProtection: 'Claimant\'s liability for costs should be capped at £5,000 (individuals) or £10,000 (groups)',
      crossUndertaking: 'No cross-undertaking in damages should be required for interim relief'
    };
  }
  
  private determineCostsProtection(caseDetails: any): any {
    return {
      individual: '£5,000 cap on adverse costs',
      group: '£10,000 cap on adverse costs', 
      reciprocal: 'Respondent\'s liability capped at £35,000',
      variation: 'Court may vary on application'
    };
  }
}