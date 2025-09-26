import type { Env } from '../types';
import { BookService } from '../services/bookService';

export class LegalRepresentationAgent {
  private bookService: BookService;
  
  constructor(private env: Env) {
    this.bookService = new BookService(env);
  }
  
  async populateSection3(userDetails: any, context?: any) {
    // Determine representation status
    const hasLegalRep = userDetails.hasLawyer || userDetails.hasSolicitor || false;
    const isLitigantInPerson = !hasLegalRep;
    
    // Get Book 1 content for litigants in person
    const lipContent = isLitigantInPerson ? 
      await this.bookService.getBookContent(1, 1) : null; // Chapter 1: Survival basics
    
    const representationData = {
      status: isLitigantInPerson ? 'Litigant in Person' : 'Legally Represented',
      details: isLitigantInPerson ? 
        this.getLiPDetails(userDetails) : 
        this.getLegalRepDetails(userDetails),
      specialConsiderations: [] as string[],
      supportNeeds: [] as string[]
    };
    
    // Check for vulnerability factors
    if (isLitigantInPerson) {
      representationData.specialConsiderations = await this.assessVulnerability(userDetails);
      representationData.supportNeeds = this.identifySupportNeeds(userDetails);
    }
    
    // Get strategic advice based on representation status
    const strategicPrompt = `
      Provide advice for N161 Section 3 (Legal Representation):
      
      Status: ${representationData.status}
      User details: ${JSON.stringify(userDetails)}
      
      ${isLitigantInPerson ? 
        'This is a litigant in person. Reference Book 1 survival strategies.' :
        'This appellant has legal representation.'}
      
      Advise on:
      1. How to complete this section properly
      2. Special provisions they may be entitled to
      3. Court duties toward them
      4. Common mistakes to avoid
    `;
    
    const advice = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: strategicPrompt,
      max_tokens: 800
    });
    
    return {
      section: 'Section 3: Legal Representation',
      representation: representationData,
      isLitigantInPerson,
      advice: this.parseAdvice(advice.response),
      rights: isLitigantInPerson ? this.getLiPRights() : [],
      book1Reference: isLitigantInPerson ? {
        chapter: 1,
        title: 'Understanding the Landscape',
        keyPoint: 'Courts have duty to ensure fair hearing for unrepresented parties'
      } : null,
      warnings: this.getRepresentationWarnings(isLitigantInPerson, userDetails)
    };
  }
  
  private getLiPDetails(userDetails: any): any {
    return {
      name: userDetails.name || userDetails.appellantName || '',
      address: userDetails.address || userDetails.appellantAddress || '',
      email: userDetails.email || userDetails.appellantEmail || '',
      phone: userDetails.phone || userDetails.appellantPhone || '',
      preferredContact: userDetails.preferredContact || 'email',
      requiresInterpreter: userDetails.requiresInterpreter || false,
      interpreterLanguage: userDetails.interpreterLanguage || null
    };
  }
  
  private getLegalRepDetails(userDetails: any): any {
    return {
      firmName: userDetails.lawFirm || userDetails.solicitorFirm || '',
      solicitorName: userDetails.solicitorName || userDetails.lawyerName || '',
      reference: userDetails.solicitorRef || '',
      address: userDetails.solicitorAddress || '',
      email: userDetails.solicitorEmail || '',
      phone: userDetails.solicitorPhone || '',
      dx: userDetails.solicitorDX || '',
      certificateNumber: userDetails.certificateNumber || ''
    };
  }
  
  private async assessVulnerability(userDetails: any): Promise<string[]> {
    const vulnerabilities = [];
    
    if (userDetails.disability) {
      vulnerabilities.push('Disability - requires reasonable adjustments');
    }
    
    if (userDetails.mentalHealth) {
      vulnerabilities.push('Mental health condition - may need support');
    }
    
    if (userDetails.age && (userDetails.age < 18 || userDetails.age > 70)) {
      vulnerabilities.push('Age-related vulnerability');
    }
    
    if (userDetails.englishSecondLanguage || userDetails.requiresInterpreter) {
      vulnerabilities.push('Language barrier - interpreter needed');
    }
    
    if (userDetails.homeless || userDetails.noFixedAddress) {
      vulnerabilities.push('Housing insecurity - special provisions for service');
    }
    
    return vulnerabilities;
  }
  
  private identifySupportNeeds(userDetails: any): string[] {
    const needs = [];
    
    needs.push('Right to reasonable adjustments under Equality Act 2010');
    needs.push('Court duty to ensure equal access to justice');
    
    if (userDetails.disability) {
      needs.push('Physical accessibility requirements');
      needs.push('Additional time for submissions');
    }
    
    if (userDetails.requiresInterpreter) {
      needs.push('Court-provided interpreter service');
      needs.push('Translated documents where essential');
    }
    
    return needs;
  }
  
  private getLiPRights(): string[] {
    return [
      'Right to fair hearing under Article 6 ECHR',
      'Court must ensure equality of arms',
      'Entitled to reasonable adjustments',
      'Can request McKenzie Friend assistance',
      'Court should explain procedures',
      'Judged on merits not presentation',
      'Can request more time if needed',
      'Right to understand proceedings'
    ];
  }
  
  private parseAdvice(response: string): string[] {
    const advice = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      if (line.match(/^\d+\./) || line.match(/^-/) || line.match(/^\*/)) {
        const cleaned = line.replace(/^[\d\.\-\*]+\s*/, '').trim();
        if (cleaned) advice.push(cleaned);
      }
    }
    
    return advice.length > 0 ? advice : [
      'Complete all contact details accurately',
      'Specify preferred method of contact',
      'Note any special requirements clearly'
    ];
  }
  
  private getRepresentationWarnings(isLiP: boolean, userDetails: any): string[] {
    const warnings = [];
    
    if (isLiP) {
      warnings.push('As litigant in person, clearly state any support needs');
      warnings.push('Court has duty to ensure fair hearing - assert your rights');
      
      if (!userDetails.email && !userDetails.phone) {
        warnings.push('Provide at least one contact method');
      }
    } else {
      if (!userDetails.solicitorName && !userDetails.lawFirm) {
        warnings.push('Legal representative details incomplete');
      }
    }
    
    return warnings;
  }
}