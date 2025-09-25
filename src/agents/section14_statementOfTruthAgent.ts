import type { Env } from '../types';
import { BookService } from '../services/bookService';

export class StatementOfTruthAgent {
  private bookService: BookService;
  
  constructor(private env: Env) {
    this.bookService = new BookService(env);
  }
  
  async generateSection14(appellantDetails: any, isLiP: boolean = false) {
    // Get book content on legal formalities
    const legalContent = await this.bookService.getRelevantContent('appeals');
    
    // Generate appropriate statement of truth
    const statementType = this.determineStatementType(appellantDetails, isLiP);
    
    const statementPrompt = `
      Generate statement of truth for N161 Section 14:
      
      Appellant: ${JSON.stringify(appellantDetails)}
      Litigant in Person: ${isLiP}
      
      Requirements:
      1. Must comply with CPR 22.1
      2. State belief that facts are true
      3. Include contempt warning
      4. Proper signature format
      5. Date of signature
      
      If litigant in person:
      - First person statement
      - Personal signature
      
      If represented:
      - Solicitor can sign
      - Firm details required
      
      Include standard wording required by rules.
    `;
    
    const generated = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: statementPrompt,
      max_tokens: 500
    });
    
    const statement = this.formatStatement(statementType, appellantDetails, generated.response);
    
    return {
      section: 'Section 14: Statement of Truth',
      statement,
      signatory: this.getSignatoryDetails(appellantDetails, isLiP),
      requirements: this.getRequirements(),
      contemptWarning: this.getContemptWarning(),
      signature: this.getSignatureBlock(appellantDetails, isLiP),
      bookReferences: legalContent.slice(0, 1),
      tips: this.getStatementTips(isLiP),
      warnings: this.getStatementWarnings(appellantDetails, isLiP)
    };
  }
  
  private determineStatementType(appellantDetails: any, isLiP: boolean): string {
    if (isLiP) {
      return 'personal';
    }
    
    if (appellantDetails.solicitor || appellantDetails.legalRepresentative) {
      return 'solicitor';
    }
    
    if (appellantDetails.barrister) {
      return 'counsel';
    }
    
    return 'personal'; // Default to personal if unclear
  }
  
  private formatStatement(type: string, details: any, aiResponse?: string): string {
    let statement = '';
    
    if (type === 'personal') {
      statement = `
STATEMENT OF TRUTH

I believe that the facts stated in this Appellant's Notice are true. I understand that proceedings for contempt of court may be brought against anyone who makes, or causes to be made, a false statement in a document verified by a statement of truth without an honest belief in its truth.

I am the Appellant in these proceedings and am authorised to sign this statement on my own behalf.`;
    } else if (type === 'solicitor') {
      statement = `
STATEMENT OF TRUTH

The Appellant believes that the facts stated in this Appellant's Notice are true. I am duly authorised by the Appellant to sign this statement. I understand that proceedings for contempt of court may be brought against anyone who makes, or causes to be made, a false statement in a document verified by a statement of truth without an honest belief in its truth.

I am a solicitor acting for the Appellant in these proceedings.`;
    } else if (type === 'counsel') {
      statement = `
STATEMENT OF TRUTH

I, Counsel for the Appellant, have been specifically authorised by the Appellant to sign this statement of truth on their behalf. The Appellant believes that the facts stated in this Appellant's Notice are true. The Appellant understands that proceedings for contempt of court may be brought against anyone who makes, or causes to be made, a false statement in a document verified by a statement of truth without an honest belief in its truth.`;
    }
    
    return statement;
  }
  
  private getSignatoryDetails(details: any, isLiP: boolean): any {
    if (isLiP) {
      return {
        name: details.name || details.appellantName || '[Appellant Name]',
        capacity: 'Appellant (Litigant in Person)',
        date: new Date().toISOString().split('T')[0]
      };
    }
    
    return {
      name: details.solicitorName || details.legalRepName || '[Legal Representative]',
      capacity: details.solicitor ? 'Solicitor for Appellant' : 'Legal Representative',
      firm: details.lawFirm || details.solicitorFirm || '[Firm Name]',
      date: new Date().toISOString().split('T')[0]
    };
  }
  
  private getRequirements(): string[] {
    return [
      'Statement must comply with CPR Part 22',
      'Must state belief that facts are true',
      'Must include contempt of court warning',
      'Must be signed by appropriate person',
      'Must be dated',
      'Original signature required (not photocopy)',
      'If signed by legal representative, must state authority'
    ];
  }
  
  private getContemptWarning(): string {
    return 'Proceedings for contempt of court may be brought against anyone who makes, or causes to be made, a false statement in a document verified by a statement of truth without an honest belief in its truth.';
  }
  
  private getSignatureBlock(details: any, isLiP: boolean): any {
    const block: any = {
      signatureLine: '_______________________________',
      printName: '',
      capacity: '',
      date: 'Date: _______________________',
      additional: []
    };
    
    if (isLiP) {
      block.printName = `Print name: ${details.name || details.appellantName || ''}`;
      block.capacity = 'Appellant';
      
      if (details.address) {
        block.additional.push(`Address: ${details.address}`);
      }
      if (details.email) {
        block.additional.push(`Email: ${details.email}`);
      }
      if (details.phone) {
        block.additional.push(`Phone: ${details.phone}`);
      }
    } else {
      block.printName = `Print name: ${details.solicitorName || details.legalRepName || ''}`;
      block.capacity = 'For and on behalf of [Firm Name]';
      block.additional.push('Position in firm: [Partner/Associate/etc]');
      
      if (details.solicitorRef) {
        block.additional.push(`Reference: ${details.solicitorRef}`);
      }
    }
    
    return block;
  }
  
  private getStatementTips(isLiP: boolean): string[] {
    const tips = [
      'Read entire form before signing',
      'Ensure all facts stated are true',
      'Sign in ink (blue or black)',
      'Date the signature',
      'Keep copy of signed form'
    ];
    
    if (isLiP) {
      tips.push(
        'You must sign personally',
        'Cannot delegate to McKenzie Friend',
        'Include full name and address'
      );
    } else {
      tips.push(
        'Ensure proper authority to sign',
        'Include position in firm',
        'Use firm letterhead if submitting separately'
      );
    }
    
    return tips;
  }
  
  private getStatementWarnings(details: any, isLiP: boolean): string[] {
    const warnings = [];
    
    if (!details.name && !details.appellantName && !details.solicitorName) {
      warnings.push('No signatory name provided - must be completed');
    }
    
    if (isLiP && details.mentalCapacity === false) {
      warnings.push('If lacking capacity, litigation friend must sign');
    }
    
    if (!isLiP && !details.solicitor && !details.legalRepresentative) {
      warnings.push('Legal representative status unclear - verify authority');
    }
    
    warnings.push('FALSE STATEMENTS MAY RESULT IN CONTEMPT PROCEEDINGS');
    warnings.push('Ensure all information is accurate before signing');
    
    return warnings;
  }
}