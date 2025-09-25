import type { Env } from '../types';
import { BookService } from '../services/bookService';

export class OtherApplicationsAgent {
  private bookService: BookService;
  
  constructor(private env: Env) {
    this.bookService = new BookService(env);
  }
  
  async generateSection10(orderDetails: any, grounds: any[], urgency?: any) {
    // Determine what additional applications might be needed
    const applications = await this.identifyNeededApplications(orderDetails, grounds, urgency);
    
    if (applications.length === 0) {
      return {
        section: 'Section 10: Other Applications',
        hasApplications: false,
        guidance: 'No additional applications needed at this time'
      };
    }
    
    // Get relevant procedural content
    const appealsContent = await this.bookService.getRelevantContent('appeals');
    
    const applicationPrompt = `
      Generate other applications for N161 Section 10:
      
      Order: ${JSON.stringify(orderDetails)}
      Needed applications: ${JSON.stringify(applications)}
      
      Common applications:
      1. Stay of execution pending appeal
      2. Extension of time for filing
      3. Expedition of appeal hearing
      4. Permission to adduce fresh evidence
      5. Interim injunction/relief
      6. Transfer to different court
      7. Joinder of parties
      8. Amendment of grounds
      
      For each application provide:
      - Legal basis
      - Urgency level
      - Supporting reasons
    `;
    
    const generated = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: applicationPrompt,
      max_tokens: 1500
    });
    
    return {
      section: 'Section 10: Other Applications',
      hasApplications: true,
      applications: this.structureApplications(applications, generated.response),
      priorityOrder: this.prioritizeApplications(applications),
      bookReferences: appealsContent.slice(0, 2),
      tips: this.getApplicationTips(),
      warnings: this.getApplicationWarnings(applications)
    };
  }
  
  private async identifyNeededApplications(orderDetails: any, grounds: any[], urgency?: any): Promise<any[]> {
    const applications = [];
    
    // Stay of execution - almost always needed for possession/injunction orders
    if (orderDetails.type?.includes('possession') || orderDetails.type?.includes('injunction')) {
      applications.push({
        type: 'Stay of Execution',
        reason: 'Prevent irreparable harm pending appeal',
        urgency: 'HIGH',
        rule: 'CPR 52.16'
      });
    }
    
    // Extension of time if deadline passed
    if (orderDetails.appealDeadlinePassed) {
      applications.push({
        type: 'Extension of Time',
        reason: 'File appeal out of time',
        urgency: 'CRITICAL',
        rule: 'CPR 3.9 - relief from sanctions'
      });
    }
    
    // Expedition if urgent
    if (urgency?.level === 'urgent' || orderDetails.evictionImminent) {
      applications.push({
        type: 'Expedition',
        reason: 'Urgent circumstances require expedited hearing',
        urgency: 'HIGH',
        rule: 'CPR 52.9'
      });
    }
    
    // Fresh evidence
    if (grounds.some(g => g.newEvidence)) {
      applications.push({
        type: 'Permission for Fresh Evidence',
        reason: 'Evidence not available at trial',
        urgency: 'MEDIUM',
        rule: 'Ladd v Marshall test'
      });
    }
    
    // Transfer if wrong court
    if (orderDetails.complexityRequiresHigherCourt) {
      applications.push({
        type: 'Transfer to Higher Court',
        reason: 'Important point of principle or practice',
        urgency: 'MEDIUM',
        rule: 'CPR 52.23'
      });
    }
    
    // Void order - set aside application
    if (grounds.some(g => g.title?.toLowerCase().includes('void'))) {
      applications.push({
        type: 'Set Aside as Void',
        reason: 'Order void ab initio - nullity',
        urgency: 'HIGH',
        rule: 'Inherent jurisdiction'
      });
    }
    
    return applications;
  }
  
  private structureApplications(identified: any[], aiResponse: string): any[] {
    const structured = [];
    
    for (const app of identified) {
      structured.push({
        application: app.type,
        grounds: [
          app.reason,
          `Urgency: ${app.urgency}`,
          `Legal basis: ${app.rule}`
        ],
        evidence: this.getRequiredEvidence(app.type),
        draft: this.getDraftWording(app)
      });
    }
    
    return structured;
  }
  
  private getRequiredEvidence(applicationType: string): string[] {
    const evidenceMap: any = {
      'Stay of Execution': [
        'Evidence of irreparable harm',
        'Undertaking as to damages if required',
        'Balance of convenience assessment'
      ],
      'Extension of Time': [
        'Explanation for delay',
        'Evidence delay was not intentional',
        'Merits of underlying appeal'
      ],
      'Expedition': [
        'Evidence of urgency',
        'Consequences of delay',
        'Availability for early hearing'
      ],
      'Permission for Fresh Evidence': [
        'The new evidence',
        'Explanation why not available before',
        'How it affects the case'
      ],
      'Set Aside as Void': [
        'Evidence of jurisdictional defect',
        'Legal authorities on voidness',
        'Prejudice if not set aside'
      ]
    };
    
    return evidenceMap[applicationType] || ['Supporting evidence'];
  }
  
  private getDraftWording(application: any): string {
    const drafts: any = {
      'Stay of Execution': `The Appellant applies for a stay of execution of the order dated [date] pending determination of this appeal on the grounds that (1) there is a real prospect of success on appeal (2) the Appellant will suffer irreparable harm if stay not granted (3) the balance of convenience favors a stay.`,
      
      'Extension of Time': `The Appellant applies for an extension of time to file this appeal pursuant to CPR 3.9. The delay was [X days] caused by [reason]. The appeal has real merit and no prejudice to Respondent.`,
      
      'Expedition': `The Appellant applies for expedition of this appeal due to [urgent circumstances]. Without expedition, [consequences]. The parties can be ready for hearing within [timeframe].`,
      
      'Set Aside as Void': `The Appellant applies to set aside the order as void ab initio for want of jurisdiction. The order is a nullity because [reason - e.g., no Notice to Quit, unsealed, etc.].`
    };
    
    return drafts[application.type] || 'Application for appropriate relief';
  }
  
  private prioritizeApplications(applications: any[]): string[] {
    // Sort by urgency
    const sorted = applications.sort((a, b) => {
      const urgencyOrder: any = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
    
    return sorted.map(app => `${app.urgency}: ${app.type}`);
  }
  
  private getApplicationTips(): string[] {
    return [
      'File stay application immediately if enforcement imminent',
      'Include draft order for each application',
      'Address each element of relevant test',
      'Provide undertaking in damages for injunctions',
      'File skeleton argument if complex',
      'Serve on respondent urgently'
    ];
  }
  
  private getApplicationWarnings(applications: any[]): string[] {
    const warnings = [];
    
    if (applications.some(a => a.urgency === 'CRITICAL')) {
      warnings.push('CRITICAL applications - file TODAY');
    }
    
    if (applications.some(a => a.type === 'Stay of Execution')) {
      warnings.push('Without stay, enforcement may proceed during appeal');
    }
    
    if (applications.length > 3) {
      warnings.push('Multiple applications - consider combined hearing');
    }
    
    return warnings;
  }
}