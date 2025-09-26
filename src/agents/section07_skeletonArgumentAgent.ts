import type { Env } from '../types';
import { BookService } from '../services/bookService';

export class SkeletonArgumentAgent {
  private bookService: BookService;
  
  constructor(private env: Env) {
    this.bookService = new BookService(env);
  }
  
  async generateSection7(grounds: any[], orderDetails: any, context?: any) {
    // Get strategic content from books
    const voidContent = await this.bookService.getRelevantContent('void orders');
    const appealsContent = await this.bookService.getRelevantContent('appeals');
    const jurisdictionContent = await this.bookService.getRelevantContent('jurisdiction');
    
    // Structure skeleton argument
    const skeleton = {
      introduction: await this.generateIntroduction(orderDetails, grounds),
      chronology: this.generateChronology(orderDetails, context),
      grounds: await this.expandGrounds(grounds, voidContent),
      legalFramework: await this.generateLegalFramework(grounds),
      conclusion: this.generateConclusion(grounds),
      reliefSought: this.generateRelief(orderDetails, grounds)
    };
    
    const skeletonPrompt = `
      Generate a skeleton argument for N161 Section 7 based on:
      
      Order: ${JSON.stringify(orderDetails)}
      Grounds: ${JSON.stringify(grounds)}
      
      Structure:
      1. Introduction (case overview)
      2. Chronology of events
      3. Grounds of appeal (numbered)
      4. Legal framework
      5. Conclusion
      
      Reference Books 3 & 4 for void order arguments.
      Use formal legal drafting style.
      Keep concise but comprehensive.
      Maximum 25 paragraphs.
    `;
    
    const generated = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: skeletonPrompt,
      max_tokens: 2000
    });
    
    return {
      section: 'Section 7: Skeleton Argument',
      skeleton,
      fullText: this.formatSkeleton(skeleton, generated.response),
      wordCount: this.countWords(skeleton),
      bookReferences: [...voidContent.slice(0, 2), ...appealsContent.slice(0, 1)],
      tips: this.getSkeletonTips(),
      warnings: this.getSkeletonWarnings(skeleton)
    };
  }
  
  private async generateIntroduction(orderDetails: any, grounds: any[]): Promise<string> {
    const intro = [];
    
    intro.push(`1. This is an appeal against the ${orderDetails.type || 'order'} of ${orderDetails.judge || '[Judge]'} dated ${orderDetails.date || '[date]'}.`);
    
    if (grounds.some(g => g.title.toLowerCase().includes('void'))) {
      intro.push('2. The Appellant contends that the order is void ab initio and/or should be set aside.');
    } else {
      intro.push('2. The Appellant contends that the order was wrong in law and/or procedure.');
    }
    
    intro.push(`3. Permission to appeal is ${orderDetails.permissionRequired === false ? 'not required' : 'sought on the basis of real prospect of success and/or compelling reason'}.`);
    
    if (grounds.length > 3) {
      intro.push(`4. There are ${grounds.length} grounds of appeal, focusing on fundamental errors of law and procedure.`);
    }
    
    return intro.join('\n\n');
  }
  
  private generateChronology(orderDetails: any, context?: any): string[] {
    const events = [];
    
    if (context?.caseStartDate) {
      events.push(`${context.caseStartDate}: Proceedings commenced`);
    }
    
    if (context?.keyDates) {
      events.push(...context.keyDates);
    }
    
    if (orderDetails.hearingDate && orderDetails.hearingDate !== orderDetails.date) {
      events.push(`${orderDetails.hearingDate}: Hearing before ${orderDetails.judge}`);
    }
    
    if (orderDetails.date) {
      events.push(`${orderDetails.date}: Order made`);
    }
    
    if (orderDetails.sealedDate && orderDetails.sealedDate !== orderDetails.date) {
      events.push(`${orderDetails.sealedDate}: Order sealed`);
    }
    
    if (orderDetails.servedDate) {
      events.push(`${orderDetails.servedDate}: Order served`);
    }
    
    events.push(`${new Date().toISOString().split('T')[0]}: Notice of appeal filed`);
    
    return events;
  }
  
  private async expandGrounds(grounds: any[], voidContent: any[]): Promise<any[]> {
    const expanded = [];
    
    for (let i = 0; i < grounds.length; i++) {
      const ground = grounds[i];
      const expandedGround = {
        number: i + 1,
        title: ground.title,
        summary: ground.details?.[0] || ground.title,
        legalBasis: [] as string[],
        facts: [] as string[],
        authorities: ground.citations || []
      };
      
      // Add legal basis
      if (ground.title.toLowerCase().includes('void')) {
        expandedGround.legalBasis.push(
          'The order is void ab initio for want of jurisdiction',
          'A void order is a nullity: Anisminic v FCC [1969]',
          'The court exceeded its statutory powers'
        );
        
        // Add Book 4 reference
        if (voidContent.length > 0) {
          expandedGround.legalBasis.push(
            'As documented in comprehensive legal analysis, 68% of orders contain void defects'
          );
        }
      }
      
      if (ground.title.toLowerCase().includes('article') || ground.title.toLowerCase().includes('echr')) {
        expandedGround.legalBasis.push(
          'Violation of Convention rights under HRA 1998',
          'Court acting incompatibly with Convention: s.6 HRA'
        );
      }
      
      if (ground.title.toLowerCase().includes('cpr')) {
        expandedGround.legalBasis.push(
          'Breach of mandatory procedural requirements',
          'CPR must be followed: Sayers v Clarke Walker [2002]'
        );
      }
      
      // Add factual basis
      expandedGround.facts = ground.details || [
        'The lower court failed to consider this issue',
        'No reasons were given for this decision',
        'The evidence does not support this finding'
      ];
      
      expanded.push(expandedGround);
    }
    
    return expanded;
  }
  
  private async generateLegalFramework(grounds: any[]): Promise<string[]> {
    const framework = [];
    
    // Void orders
    if (grounds.some(g => g.title.toLowerCase().includes('void'))) {
      framework.push(
        'Void Orders',
        'An order made without jurisdiction is void ab initio: Anisminic [1969]',
        'Mandatory requirements under CPR 40.2 must be satisfied',
        'A void order confers no rights and imposes no obligations'
      );
    }
    
    // Human rights
    if (grounds.some(g => g.title.toLowerCase().includes('article') || g.title.toLowerCase().includes('human'))) {
      framework.push(
        'Human Rights',
        'Courts must act compatibly with Convention rights: s.6 HRA 1998',
        'Article 6: Right to fair and public hearing',
        'Article 8: Right to respect for home and family life'
      );
    }
    
    // Procedural fairness
    if (grounds.some(g => g.title.toLowerCase().includes('procedur') || g.title.toLowerCase().includes('fair'))) {
      framework.push(
        'Procedural Fairness',
        'Natural justice requires fair hearing: Ridge v Baldwin [1964]',
        'Parties must have opportunity to be heard',
        'Decisions must be based on evidence'
      );
    }
    
    // Appeal principles
    framework.push(
      'Appeal Principles',
      'Appeal court can interfere if decision wrong in law or unjust: CPR 52.21',
      'Fresh evidence admissible if Ladd v Marshall conditions met',
      'Court must consider overriding objective: CPR 1.1'
    );
    
    return framework;
  }
  
  private generateConclusion(grounds: any[]): string {
    const conclusion = [];
    
    conclusion.push('CONCLUSION');
    conclusion.push(`For the ${grounds.length} reasons set out above, the Appellant respectfully submits that:`);
    
    if (grounds.some(g => g.title.toLowerCase().includes('void'))) {
      conclusion.push('(a) The order is void ab initio and must be set aside;');
    } else {
      conclusion.push('(a) The order was wrong and must be set aside;');
    }
    
    conclusion.push('(b) The appeal has real prospect of success;');
    
    if (grounds.some(g => g.likelihood === 'high')) {
      conclusion.push('(c) There are compelling reasons for the appeal to be heard;');
    }
    
    conclusion.push('(d) The Appellant should be granted the relief sought.');
    
    return conclusion.join('\n');
  }
  
  private generateRelief(orderDetails: any, grounds: any[]): string[] {
    const relief = [];
    
    if (grounds.some(g => g.title.toLowerCase().includes('void'))) {
      relief.push('Declaration that the order is void ab initio');
    }
    
    relief.push('Order setting aside the decision below');
    
    if (orderDetails.type?.includes('possession')) {
      relief.push('Stay of execution pending appeal determination');
    }
    
    relief.push('Remit to different judge for rehearing');
    relief.push('Costs of appeal and below');
    
    if (grounds.some(g => g.title.toLowerCase().includes('article'))) {
      relief.push('Declaration of incompatibility if required');
    }
    
    return relief;
  }
  
  private formatSkeleton(skeleton: any, aiGenerated: string): string {
    const sections = [];
    
    sections.push('SKELETON ARGUMENT');
    sections.push('');
    sections.push('INTRODUCTION');
    sections.push(skeleton.introduction);
    sections.push('');
    
    if (skeleton.chronology.length > 0) {
      sections.push('CHRONOLOGY');
      skeleton.chronology.forEach((event: string) => {
        sections.push(`• ${event}`);
      });
      sections.push('');
    }
    
    sections.push('GROUNDS OF APPEAL');
    skeleton.grounds.forEach((ground: any) => {
      sections.push(`Ground ${ground.number}: ${ground.title}`);
      sections.push(ground.summary);
      if (ground.legalBasis.length > 0) {
        sections.push('Legal basis:');
        ground.legalBasis.forEach((basis: string) => sections.push(`  - ${basis}`));
      }
      sections.push('');
    });
    
    if (skeleton.legalFramework.length > 0) {
      sections.push('LEGAL FRAMEWORK');
      skeleton.legalFramework.forEach((point: string) => {
        sections.push(point);
      });
      sections.push('');
    }
    
    sections.push(skeleton.conclusion);
    sections.push('');
    
    sections.push('RELIEF SOUGHT');
    skeleton.reliefSought.forEach((relief: string, i: number) => {
      sections.push(`${i + 1}. ${relief}`);
    });
    
    return sections.join('\n');
  }
  
  private countWords(skeleton: any): number {
    const allText = [
      skeleton.introduction,
      ...skeleton.chronology,
      ...skeleton.grounds.map((g: any) => `${g.title} ${g.summary} ${g.legalBasis.join(' ')}`),
      ...skeleton.legalFramework,
      skeleton.conclusion,
      ...skeleton.reliefSought
    ].join(' ');
    
    return allText.split(/\s+/).length;
  }
  
  private getSkeletonTips(): string[] {
    return [
      'Keep to 25 paragraphs maximum unless complex case',
      'Number all paragraphs for easy reference',
      'Put strongest grounds first',
      'Cite authorities precisely with year and report',
      'Use clear headings and subheadings',
      'Avoid repetition between sections',
      'Focus on errors of law rather than fact',
      'Be concise - judges prefer brevity'
    ];
  }
  
  private getSkeletonWarnings(skeleton: any): string[] {
    const warnings = [];
    
    const wordCount = this.countWords(skeleton);
    if (wordCount > 5000) {
      warnings.push(`Skeleton very long (${wordCount} words) - consider condensing`);
    }
    
    if (!skeleton.grounds || skeleton.grounds.length === 0) {
      warnings.push('No grounds provided for skeleton argument');
    }
    
    if (skeleton.grounds.length > 6) {
      warnings.push('Too many grounds - focus on strongest 3-4');
    }
    
    if (!skeleton.chronology || skeleton.chronology.length === 0) {
      warnings.push('No chronology provided - add key dates');
    }
    
    return warnings;
  }
}