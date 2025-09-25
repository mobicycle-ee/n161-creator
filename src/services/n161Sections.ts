import type { Env } from '../types';

export interface N161FormData {
  // Section 1: Details of the appellant
  appellantName: string;
  appellantAddress: string;
  appellantPhone?: string;
  appellantEmail?: string;
  appellantRef?: string;
  
  // Section 2: Details of the respondent
  respondentName: string;
  respondentAddress?: string;
  respondentRef?: string;
  
  // Section 3: Details of the case
  courtName: string;
  caseNumber: string;
  judgeName: string;
  dateOfDecision: string;
  
  // Section 4: Permission to appeal
  permissionRequired: boolean;
  permissionGranted?: boolean;
  permissionDate?: string;
  
  // Section 5: Grounds of appeal
  groundsOfAppeal: string[];
  
  // Section 6: Time limits
  withinTimeLimit: boolean;
  extensionRequired?: boolean;
  reasonForDelay?: string;
  
  // Section 7: Other applications
  stayRequested?: boolean;
  expeditedHearing?: boolean;
  otherApplications?: string;
  
  // Section 8: Documents
  documentsListed: string[];
  skeletonArgument?: boolean;
  bundlePrepared?: boolean;
}

export class N161SectionAgent {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  // Section 1: Appellant Details Agent
  async fillAppellantSection(userInput: any): Promise<Partial<N161FormData>> {
    const prompt = `Extract appellant details from user input: ${JSON.stringify(userInput)}
    Return: name, address, phone, email, reference number if provided.
    Format as JSON matching N161 Section 1 requirements.`;

    const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    return response.response || {};
  }

  // Section 5: Grounds of Appeal Agent (Most Important)
  async generateGrounds(caseDetails: any, analysis: any): Promise<string[]> {
    const prompt = `Generate specific grounds of appeal for N161 Section 5.
    
    Case: ${caseDetails.caseNumber}
    Decision: ${caseDetails.decision}
    Analysis: ${JSON.stringify(analysis)}
    
    Each ground must:
    1. Be numbered (Ground 1, Ground 2, etc.)
    2. State the specific error (law/fact/procedure)
    3. Reference the relevant paragraph of the judgment
    4. Explain why it's wrong
    5. State what should have happened
    
    Format each ground as a complete paragraph.
    Return as JSON array of strings.`;

    const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    return response.response?.grounds || [];
  }

  // Section 6: Time Limits Agent
  async assessTimeLimit(orderDate: string): Promise<Partial<N161FormData>> {
    const prompt = `Assess N161 time limit compliance.
    Order date: ${orderDate}
    Today: ${new Date().toISOString().split('T')[0]}
    
    N161 must be filed within 21 days of decision.
    Determine:
    1. Is it within time limit?
    2. If not, how many days late?
    3. What reason could justify extension?
    
    Return as JSON with: withinTimeLimit, extensionRequired, reasonForDelay`;

    const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });

    return response.response || { withinTimeLimit: true };
  }

  // Section 7: Other Applications Agent
  async determineOtherApplications(grounds: string[]): Promise<Partial<N161FormData>> {
    const prompt = `Based on these grounds of appeal: ${JSON.stringify(grounds)}
    
    Determine if the appellant should request:
    1. Stay of execution (if ongoing harm)
    2. Expedited hearing (if urgent)
    3. Other applications
    
    Return as JSON with: stayRequested, expeditedHearing, otherApplications`;

    const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });

    return response.response || {};
  }

  // Master orchestrator that uses all section agents
  async generateCompleteN161(input: any): Promise<N161FormData> {
    // Run all section agents in parallel
    const [appellant, grounds, timeLimit, otherApps] = await Promise.all([
      this.fillAppellantSection(input.appellantInfo),
      this.generateGrounds(input.caseDetails, input.analysis),
      this.assessTimeLimit(input.caseDetails.orderDate),
      this.determineOtherApplications(input.analysis?.grounds || [])
    ]);

    // Combine all sections into complete form
    return {
      // Section 1
      appellantName: appellant.appellantName || input.appellantInfo?.name || '',
      appellantAddress: appellant.appellantAddress || input.appellantInfo?.address || '',
      appellantPhone: appellant.appellantPhone,
      appellantEmail: appellant.appellantEmail,
      appellantRef: appellant.appellantRef,
      
      // Section 2
      respondentName: input.caseDetails?.respondent || 'Secretary of State',
      respondentAddress: input.caseDetails?.respondentAddress,
      
      // Section 3
      courtName: input.caseDetails?.courtName || '',
      caseNumber: input.caseDetails?.caseNumber || '',
      judgeName: input.caseDetails?.judge || '',
      dateOfDecision: input.caseDetails?.orderDate || '',
      
      // Section 4
      permissionRequired: true,
      permissionGranted: false,
      
      // Section 5
      groundsOfAppeal: grounds,
      
      // Section 6
      withinTimeLimit: timeLimit.withinTimeLimit || false,
      extensionRequired: timeLimit.extensionRequired,
      reasonForDelay: timeLimit.reasonForDelay,
      
      // Section 7
      stayRequested: otherApps.stayRequested,
      expeditedHearing: otherApps.expeditedHearing,
      otherApplications: otherApps.otherApplications,
      
      // Section 8
      documentsListed: [
        'Order being appealed',
        'Grounds of appeal',
        'Skeleton argument',
        'Bundle of authorities'
      ],
      skeletonArgument: true,
      bundlePrepared: true
    };
  }

  // Format the data into actual N161 form text
  formatN161Document(data: N161FormData): string {
    return `FORM N161
APPELLANT'S NOTICE OF APPEAL

SECTION 1: DETAILS OF THE APPELLANT
Name: ${data.appellantName}
Address: ${data.appellantAddress}
Telephone: ${data.appellantPhone || 'N/A'}
Email: ${data.appellantEmail || 'N/A'}
Reference: ${data.appellantRef || 'N/A'}

SECTION 2: DETAILS OF THE RESPONDENT
Name: ${data.respondentName}
Address: ${data.respondentAddress || 'To be confirmed'}
Reference: ${data.respondentRef || 'N/A'}

SECTION 3: DETAILS OF THE CASE
Court: ${data.courtName}
Case Number: ${data.caseNumber}
Judge: ${data.judgeName}
Date of Decision: ${data.dateOfDecision}

SECTION 4: PERMISSION TO APPEAL
Is permission required? ${data.permissionRequired ? 'Yes' : 'No'}
Has permission been granted? ${data.permissionGranted ? 'Yes' : 'No'}
${data.permissionDate ? `Date permission granted: ${data.permissionDate}` : ''}

SECTION 5: GROUNDS OF APPEAL
${data.groundsOfAppeal.map((ground, i) => `${i + 1}. ${ground}`).join('\n\n')}

SECTION 6: TIME LIMITS
Is this appeal within the time limit? ${data.withinTimeLimit ? 'Yes' : 'No'}
${!data.withinTimeLimit ? `Extension required: Yes\nReason for delay: ${data.reasonForDelay}` : ''}

SECTION 7: OTHER APPLICATIONS
Stay of execution requested? ${data.stayRequested ? 'Yes' : 'No'}
Expedited hearing requested? ${data.expeditedHearing ? 'Yes' : 'No'}
${data.otherApplications ? `Other applications: ${data.otherApplications}` : ''}

SECTION 8: DOCUMENTS
The following documents are filed with this notice:
${data.documentsListed.map(doc => `- ${doc}`).join('\n')}

Skeleton argument included: ${data.skeletonArgument ? 'Yes' : 'No'}
Bundle prepared: ${data.bundlePrepared ? 'Yes' : 'No'}

STATEMENT OF TRUTH
I believe that the facts stated in this appeal notice are true.

Signed: ________________________
Date: ${new Date().toLocaleDateString()}
`;
  }
}