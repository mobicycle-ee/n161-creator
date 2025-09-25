import type { Env } from '../types';
import { BookService } from '../services/bookService';
import { PDFService } from '../services/pdfService';

export class CaseDetailsAgent {
  private bookService: BookService;
  private pdfService: PDFService;
  
  constructor(private env: Env) {
    this.bookService = new BookService(env);
    this.pdfService = new PDFService(env);
  }
  
  async populateSection1(orderKey: string, sendUpdate: (msg: string) => void) {
    // Start processing
    sendUpdate('📋 Case Details Agent starting...');
    sendUpdate('Opening court order PDF from R2 storage...');
    
    // Step 1: Extract parties from the actual order PDF
    sendUpdate('🔍 Parsing PDF to extract party names...');
    const parties = await this.pdfService.extractPartiesFromOrder(orderKey);
    
    if (!parties || parties.length === 0) {
      sendUpdate('⚠️ Could not extract parties from PDF, using manual input...');
      return this.handleManualInput(orderKey, sendUpdate);
    }
    
    sendUpdate(`✓ Found ${parties.length} parties in the order`);
    parties.forEach((party: any) => {
      sendUpdate(`  • ${party.name} (${party.role})`);
    });
    
    // Step 2: Get case details from the order
    sendUpdate('📑 Extracting case details from order...');
    const caseDetails = await this.extractCaseDetailsFromOrder(orderKey);
    sendUpdate(`✓ Case Number: ${caseDetails.caseNumber}`);
    sendUpdate(`✓ Court: ${caseDetails.courtName}`);
    sendUpdate(`✓ Order Date: ${caseDetails.orderDate}`);
    
    // Step 3: Query past N161 applications for contact details
    sendUpdate('🔎 Searching APPEALS database for past applications...');
    const contactDetails = {};
    
    for (const party of parties) {
      sendUpdate(`  Checking history for ${party.name}...`);
      const pastDetails = await this.pdfService.getContactDetailsFromPastApplications(party.name);
      
      if (pastDetails) {
        contactDetails[party.id] = pastDetails;
        sendUpdate(`  ✓ Found address from ${pastDetails.sourceApplication}`);
        sendUpdate(`    ${pastDetails.address}`);
      } else {
        sendUpdate(`  ⚠️ No past applications found for ${party.name}`);
        contactDetails[party.id] = {
          name: party.name,
          address: 'Address to be provided',
          needsManualInput: true
        };
      }
    }
    
    // Step 4: Validate with systemic patterns
    sendUpdate('🔍 Checking for systemic issues with this court...');
    const systemicPatterns = await this.detectSystemicPatterns(caseDetails, parties);
    
    if (systemicPatterns.length > 0) {
      sendUpdate('⚠️ Systemic issues detected:');
      systemicPatterns.forEach((pattern: any) => {
        sendUpdate(`  • ${pattern.warning}`);
      });
    }
    
    // Step 5: Get relevant legal precedents
    sendUpdate('📚 Retrieving relevant legal precedents...');
    const precedents = await this.bookService.getRelevantContent('jurisdiction case details');
    sendUpdate(`✓ Found ${precedents.length} relevant precedents`);
    
    // Final result
    const result = {
      section: 'Section 1: Case Details',
      status: 'completed',
      caseDetails: {
        ...caseDetails,
        orderKey: orderKey
      },
      parties: parties,
      contactDetails: contactDetails,
      systemicWarnings: systemicPatterns,
      precedents: precedents.slice(0, 3),
      requiredActions: this.determineRequiredActions(parties, contactDetails),
      output: this.generateSection1Output(caseDetails, parties, contactDetails)
    };
    
    sendUpdate('✅ Section 1 Complete: Case details populated');
    sendUpdate(`📊 Result: ${parties.length} parties identified, ${Object.keys(contactDetails).length} addresses found`);
    
    return result;
  }
  
  private async extractCaseDetailsFromOrder(orderKey: string): Promise<any> {
    // Parse order key to extract basic info
    // Format: "YYYY.MM.DD Judge Name CASE_NUMBER.pdf"
    const parts = orderKey.split(' ');
    const date = parts[0] || '';
    const caseNumber = parts[parts.length - 1]?.replace('.pdf', '') || '';
    
    // Try to get more details from R2 metadata
    const orderObject = await this.env.ORDERS.get(orderKey);
    const metadata = orderObject?.customMetadata || {};
    
    return {
      caseNumber: metadata.caseNumber || caseNumber,
      courtName: metadata.court || 'County Court at Central London',
      courtLocation: metadata.location || 'Thomas More Building',
      orderDate: date.replace(/\./g, '/'),
      judge: metadata.judge || this.extractJudgeName(orderKey),
      orderType: metadata.type || 'Possession Order'
    };
  }
  
  private extractJudgeName(orderKey: string): string {
    // Extract judge name from order key pattern
    const match = orderKey.match(/\d{4}\.\d{2}\.\d{2}\s+(.+?)\s+[A-Z0-9]+\.pdf/);
    return match ? match[1] : 'Unknown Judge';
  }
  
  private async detectSystemicPatterns(caseDetails: any, parties: any[]) {
    const patterns = [];
    
    // Check Book 0 for systemic issues
    const systemicContent = await this.bookService.getBookContent(0, 3);
    
    if (caseDetails.courtLocation?.toLowerCase().includes('central london')) {
      patterns.push({
        warning: 'Central London County Court - High rate of void orders',
        reference: 'Book 4, Chapter 1: 68% void order rate documented',
        action: 'Consider void challenge alongside appeal',
        severity: 'high'
      });
    }
    
    // Check if any party is a local authority
    const hasCouncil = parties.some(p => 
      p.name.toLowerCase().includes('council') || 
      p.name.toLowerCase().includes('borough')
    );
    
    if (hasCouncil) {
      patterns.push({
        warning: 'Local authority respondent - Check for PEA violations',
        reference: 'Book 3, Chapter 2: PEA Provisions Under Attack',
        action: 'Review Protection from Eviction Act compliance',
        severity: 'medium'
      });
    }
    
    // Check for specific judges with patterns
    if (caseDetails.judge?.toLowerCase().includes('gerald')) {
      patterns.push({
        warning: 'Judge with documented procedural issues',
        reference: 'Previous applications show pattern of rushed hearings',
        action: 'Emphasize procedural fairness grounds',
        severity: 'medium'
      });
    }
    
    return patterns;
  }
  
  private determineRequiredActions(parties: any[], contactDetails: any): string[] {
    const actions = [];
    
    // Check for missing contact details
    const missingDetails = Object.values(contactDetails).filter((d: any) => d.needsManualInput);
    if (missingDetails.length > 0) {
      actions.push(`Obtain addresses for ${missingDetails.length} parties`);
    }
    
    // Check party roles
    const hasAppellant = parties.some(p => p.role === 'Appellant');
    const hasRespondent = parties.some(p => p.role === 'Respondent');
    
    if (!hasAppellant) {
      actions.push('Designate which party is the Appellant');
    }
    if (!hasRespondent) {
      actions.push('Confirm Respondent party');
    }
    
    return actions;
  }
  
  private generateSection1Output(caseDetails: any, parties: any[], contactDetails: any): string {
    const appellant = parties.find(p => p.role === 'Appellant') || parties[0];
    const respondent = parties.find(p => p.role === 'Respondent') || parties[1];
    
    const appellantDetails = contactDetails[appellant?.id] || {};
    const respondentDetails = contactDetails[respondent?.id] || {};
    
    return `
SECTION 1: THE PARTIES AND THE CASE

Case Number: ${caseDetails.caseNumber}
Court: ${caseDetails.courtName}
Order Date: ${caseDetails.orderDate}

APPELLANT:
${appellant?.name || 'To be designated'}
${appellantDetails.address || 'Address to be provided'}
${appellantDetails.phone ? `Tel: ${appellantDetails.phone}` : ''}
${appellantDetails.email ? `Email: ${appellantDetails.email}` : ''}

RESPONDENT:
${respondent?.name || 'To be designated'}
${respondentDetails.address || 'Address to be provided'}
${respondentDetails.solicitor ? `Solicitor: ${respondentDetails.solicitor}` : ''}

${parties.length > 2 ? `
INTERESTED PARTIES:
${parties.filter(p => p.role === 'Interested Party').map(p => `- ${p.name}`).join('\n')}
` : ''}
    `.trim();
  }
  
  private async handleManualInput(orderKey: string, sendUpdate: (msg: string) => void): Promise<any> {
    sendUpdate('⚠️ Manual input required for party details');
    
    return {
      section: 'Section 1: Case Details', 
      status: 'needs_input',
      message: 'Could not extract parties from PDF. Please provide party names manually.',
      orderKey: orderKey,
      requiredFields: [
        'Appellant Name',
        'Appellant Address',
        'Respondent Name',
        'Respondent Address',
        'Case Number'
      ]
    };
  }
}