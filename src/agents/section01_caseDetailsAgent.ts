import type { Env } from '../types';
import { BookService } from '../services/bookService';

export class CaseDetailsAgent {
  private bookService: BookService;
  
  constructor(private env: Env) {
    this.bookService = new BookService(env);
  }
  
  async populateSection1(userInput: any) {
    // Extract case information
    const caseInfo = {
      caseNumber: userInput.caseNumber || '',
      courtName: userInput.courtName || '',
      courtLocation: userInput.courtLocation || '',
      claimNumber: userInput.claimNumber || '',
      appellant: {
        name: userInput.appellantName || '',
        address: userInput.appellantAddress || '',
        postcode: userInput.appellantPostcode || '',
        email: userInput.appellantEmail || '',
        phone: userInput.appellantPhone || ''
      },
      respondent: {
        name: userInput.respondentName || '',
        address: userInput.respondentAddress || '',
        postcode: userInput.respondentPostcode || '',
        solicitor: userInput.respondentSolicitor || ''
      }
    };
    
    // Validate and enhance with systemic patterns
    const systemicPatterns = await this.detectSystemicPatterns(caseInfo);
    
    // Get relevant precedents from Book 3
    const precedents = await this.bookService.getRelevantContent('jurisdiction');
    
    const validationPrompt = `
      Validate and enhance this case information for N161 Section 1:
      
      Case Info: ${JSON.stringify(caseInfo)}
      
      Check for:
      1. Correct court naming (e.g., "County Court at [Location]")
      2. Complete party details
      3. Missing required fields
      4. Systemic issues with this court/judge
      
      Provide:
      - Validated information
      - Missing fields that need completion
      - Warnings about known issues with this court
    `;
    
    const validation = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: validationPrompt,
      max_tokens: 800
    });
    
    return {
      section: 'Section 1: Case Details',
      data: caseInfo,
      validation: this.parseValidation(validation.response),
      systemicWarnings: systemicPatterns,
      precedents: precedents.slice(0, 3),
      requiredFields: this.getRequiredFields(caseInfo),
      tips: [
        'Always use the exact case number from the order',
        'Include full court name and location',
        'Ensure all contact details are current'
      ]
    };
  }
  
  private async detectSystemicPatterns(caseInfo: any) {
    const patterns = [];
    
    // Check Book 0 for systemic issues with this court
    const systemicContent = await this.bookService.getBookContent(0, 3); // How the Game Works
    
    if (caseInfo.courtLocation?.toLowerCase().includes('central london')) {
      patterns.push({
        warning: 'Central London County Court - High rate of void orders',
        reference: 'Book 4, Chapter 1: 68% void order rate documented',
        action: 'Consider void challenge alongside appeal'
      });
    }
    
    if (caseInfo.respondent.name?.toLowerCase().includes('council')) {
      patterns.push({
        warning: 'Local authority respondent - Check for PEA violations',
        reference: 'Book 3, Chapter 2: PEA Provisions Under Attack',
        action: 'Review Protection from Eviction Act compliance'
      });
    }
    
    return patterns;
  }
  
  private parseValidation(response: string): any {
    const validation: any = {
      isValid: true,
      missingFields: [],
      warnings: [],
      corrections: []
    };
    
    const lines = response.split('\n');
    for (const line of lines) {
      if (line.includes('missing') || line.includes('Missing')) {
        validation.missingFields.push(line.trim());
        validation.isValid = false;
      }
      if (line.includes('warning') || line.includes('Warning')) {
        validation.warnings.push(line.trim());
      }
      if (line.includes('should be') || line.includes('correct format')) {
        validation.corrections.push(line.trim());
      }
    }
    
    return validation;
  }
  
  private getRequiredFields(caseInfo: any): string[] {
    const required = [];
    
    if (!caseInfo.caseNumber) required.push('Case Number');
    if (!caseInfo.courtName) required.push('Court Name');
    if (!caseInfo.appellant.name) required.push('Appellant Name');
    if (!caseInfo.appellant.address) required.push('Appellant Address');
    if (!caseInfo.respondent.name) required.push('Respondent Name');
    
    return required;
  }
}