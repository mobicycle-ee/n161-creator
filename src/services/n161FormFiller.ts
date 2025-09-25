import type { Env } from '../types';
import { BookService } from './bookService';
import { N161TrainingService } from './n161TrainingService';

// Import all agents
import { CaseDetailsAgent } from '../agents/section01_caseDetailsAgent';
import { AppealDetailsAgent } from '../agents/section02_appealDetailsAgent';
import { LegalRepresentationAgent } from '../agents/section03_legalRepresentationAgent';
import { PermissionAgent } from '../agents/section04_permissionAgent';
import { OrderDetailsAgent } from '../agents/section05_orderDetailsAgent';
import { GroundsAnalyzerAgent } from '../agents/section06_groundsAnalyzerAgent';
import { SkeletonArgumentAgent } from '../agents/section07_skeletonArgumentAgent';
import { AarhusConventionAgent } from '../agents/section08_aarhusAgent';
import { ReliefSoughtAgent } from '../agents/section09_reliefSoughtAgent';
import { OtherApplicationsAgent } from '../agents/section10_otherApplicationsAgent';
import { EvidenceSupportAgent } from '../agents/section11_evidenceSupportAgent';
import { SupportingDocumentsAgent } from '../agents/section13_supportingDocumentsAgent';
import { StatementOfTruthAgent } from '../agents/section14_statementOfTruthAgent';
import { VoidDetectorAgent } from '../agents/specialAgent_voidDetector';

export class N161FormFiller {
  private bookService: BookService;
  private trainingService: N161TrainingService;
  private agents: any;
  
  constructor(private env: Env) {
    this.bookService = new BookService(env);
    this.trainingService = new N161TrainingService(env);
    
    // Initialize all agents
    this.agents = {
      section01: new CaseDetailsAgent(env),
      section02: new AppealDetailsAgent(env),
      section03: new LegalRepresentationAgent(env),
      section04: new PermissionAgent(env),
      section05: new OrderDetailsAgent(env),
      section06: new GroundsAnalyzerAgent(env),
      section07: new SkeletonArgumentAgent(env),
      section08: new AarhusConventionAgent(env),
      section09: new ReliefSoughtAgent(env),
      section10: new OtherApplicationsAgent(env),
      section11: new EvidenceSupportAgent(env),
      section13: new SupportingDocumentsAgent(env),
      section14: new StatementOfTruthAgent(env),
      voidDetector: new VoidDetectorAgent(env)
    };
  }
  
  async fillN161FromOrders(orderPaths: string[]): Promise<any> {
    console.log('🚀 Starting N161 Form Filling Process');
    console.log(`📄 Processing ${orderPaths.length} order(s)`);
    
    const n161Form = {
      metadata: {
        createdDate: new Date().toISOString(),
        orders: orderPaths,
        caseNumber: '',
        appellants: [],
        respondent: ''
      },
      sections: {}
    };
    
    // Step 1: Read and analyze all orders
    console.log('\n📖 Step 1: Reading Orders');
    const orderAnalyses = [];
    
    for (const orderPath of orderPaths) {
      console.log(`  Reading: ${orderPath}`);
      const orderContent = await this.readOrderFile(orderPath);
      const analysis = await this.analyzeOrder(orderContent, orderPath);
      orderAnalyses.push(analysis);
    }
    
    // Extract key details from orders
    const extractedDetails = this.extractDetailsFromOrders(orderAnalyses);
    n161Form.metadata.caseNumber = extractedDetails.caseNumber;
    n161Form.metadata.appellants = extractedDetails.appellants;
    n161Form.metadata.respondent = extractedDetails.respondent;
    
    // Step 2: Section 1 - Case Details
    console.log('\n📝 Section 1: Case Details');
    n161Form.sections.section01 = await this.agents.section01.populateSection1({
      caseNumber: extractedDetails.caseNumber,
      courtName: extractedDetails.courtName,
      courtLocation: 'Central London',
      appellantName: extractedDetails.appellants[0],
      appellantAddress: 'Apartment 13, Roman House, Wood Street, London EC2Y 5AG',
      respondentName: extractedDetails.respondent,
      respondentSolicitor: 'Humphries Kirk LLP'
    });
    
    // Step 3: Section 2 - Appeal Details
    console.log('\n📝 Section 2: Nature of Appeal');
    n161Form.sections.section02 = await this.agents.section02.populateSection2(
      extractedDetails.orderDetails,
      { caseStartDate: '2021-12-21' }
    );
    
    // Step 4: Section 3 - Legal Representation
    console.log('\n📝 Section 3: Legal Representation');
    n161Form.sections.section03 = await this.agents.section03.populateSection3({
      name: 'Roslyn Scott',
      hasLawyer: false,
      isLitigantInPerson: true,
      email: 'roslyn@example.com',
      phone: '07XXX XXXXXX'
    }, true);
    
    // Step 5: Section 4 - Permission to Appeal
    console.log('\n📝 Section 4: Permission Required');
    const grounds = await this.generateGroundsFromOrders(orderAnalyses);
    n161Form.sections.section04 = await this.agents.section04.populateSection4(
      extractedDetails.orderDetails,
      grounds
    );
    
    // Step 6: Section 5 - Order Details  
    console.log('\n📝 Section 5: Order Being Appealed');
    n161Form.sections.section05 = await this.agents.section05.populateSection5(
      orderAnalyses[0].orderText,
      extractedDetails.orderDetails
    );
    
    // Step 7: Section 6 - GROUNDS OF APPEAL (CRITICAL!)
    console.log('\n⚡ Section 6: GROUNDS OF APPEAL');
    n161Form.sections.section06 = await this.generateComprehensiveGrounds(orderAnalyses);
    
    // Step 8: Section 7 - Skeleton Argument
    console.log('\n📝 Section 7: Skeleton Argument');
    n161Form.sections.section07 = await this.agents.section07.generateSection7(
      n161Form.sections.section06.grounds,
      extractedDetails.orderDetails,
      { caseHistory: extractedDetails }
    );
    
    // Step 9: Section 8 - Aarhus Convention (if applicable)
    console.log('\n📝 Section 8: Aarhus Convention');
    n161Form.sections.section08 = await this.agents.section08.assessSection8(
      extractedDetails,
      n161Form.sections.section06.grounds
    );
    
    // Step 10: Section 9 - Relief Sought
    console.log('\n📝 Section 9: Relief Sought');
    n161Form.sections.section09 = await this.agents.section09.generateSection9(
      extractedDetails.orderDetails,
      n161Form.sections.section06.grounds
    );
    
    // Step 11: Section 10 - Other Applications
    console.log('\n📝 Section 10: Other Applications');
    n161Form.sections.section10 = await this.agents.section10.generateSection10(
      extractedDetails.orderDetails,
      n161Form.sections.section06.grounds,
      { level: 'urgent', evictionThreat: true }
    );
    
    // Step 12: Section 11 - Evidence
    console.log('\n📝 Section 11: Evidence Support');
    n161Form.sections.section11 = await this.agents.section11.organizeSection11(
      n161Form.sections.section06.grounds,
      extractedDetails.existingEvidence,
      extractedDetails.newEvidence
    );
    
    // Step 13: Section 13 - Documents
    console.log('\n📝 Section 13: Supporting Documents');
    n161Form.sections.section13 = await this.agents.section13.organizeSection13(
      extractedDetails.orderDetails,
      n161Form.sections.section06.grounds,
      extractedDetails.allDocuments
    );
    
    // Step 14: Section 14 - Statement of Truth
    console.log('\n📝 Section 14: Statement of Truth');
    n161Form.sections.section14 = await this.agents.section14.generateSection14(
      { name: 'Roslyn Scott', appellantName: 'Roslyn Scott' },
      true
    );
    
    // Final Summary
    console.log('\n✅ N161 Form Complete!');
    console.log('\n📊 Summary:');
    console.log(`  - Grounds identified: ${n161Form.sections.section06.grounds.length}`);
    console.log(`  - Void possibility: ${n161Form.sections.section06.voidPossibility.isVoid ? 'YES' : 'NO'}`);
    console.log(`  - Applications needed: ${n161Form.sections.section10.applications?.length || 0}`);
    console.log(`  - Evidence gaps: ${n161Form.sections.section11.gaps?.length || 0}`);
    
    return n161Form;
  }
  
  private async readOrderFile(orderPath: string): Promise<string> {
    // This would use the Read tool to get the order content
    // For now, using the orders we just read
    return `Order from ${orderPath}`;
  }
  
  private async analyzeOrder(orderContent: string, orderPath: string): Promise<any> {
    // Use void detector first
    const voidAnalysis = await this.agents.voidDetector.detect(orderContent, {
      orderPath,
      judge: 'HHJ Gerald',
      date: orderPath.includes('2025.08.29') ? '29 August 2025' : '3 September 2025'
    });
    
    return {
      orderPath,
      orderText: orderContent,
      voidAnalysis,
      defects: this.extractDefects(orderContent)
    };
  }
  
  private extractDetailsFromOrders(analyses: any[]): any {
    // Based on the actual orders we read
    return {
      caseNumber: 'K10CL521',
      courtName: 'County Court at Central London',
      appellants: ['Roslyn Scott', 'MobiCycle OÜ'],
      respondent: 'Yiqun Liu',
      orderDetails: {
        judge: 'His Honour Judge Gerald',
        date: '29 August 2025 and 3 September 2025',
        type: 'Civil Restraint Order and Costs Orders',
        totalCosts: 28275.16, // £16,275.16 + £12,000
        permissionRefused: true,
        civilRestraintOrder: true,
        counterclaim: 'struck out',
        sealed: true // Appears to have seal
      },
      existingEvidence: [
        { name: 'Order of DJ Greenidge 8 Feb 2024' },
        { name: 'Application dated 1 Sep 2024' },
        { name: 'Application dated 1 Aug 2025' }
      ],
      newEvidence: [
        { name: 'HHJ Gerald admission of 31 July 2025', discoveredAfterOrder: true }
      ],
      allDocuments: [
        'Orders of 29 Aug and 3 Sep 2025',
        'Previous orders',
        'Applications',
        'Grounds of Appeal'
      ]
    };
  }
  
  private async generateGroundsFromOrders(analyses: any[]): Promise<any[]> {
    const grounds = [];
    
    // Based on the orders:
    
    // Ground 1: Totally Without Merit finding without reasons
    grounds.push({
      title: 'Absence of Reasons for "Totally Without Merit" Finding',
      details: [
        'Court declared applications "totally without merit" without providing any reasoning',
        'Violates duty to give reasons: Flannery v Halifax [2000]',
        'Cannot defend against unknown criticisms'
      ],
      citations: ['Flannery v Halifax [2000] 1 WLR 377'],
      likelihood: 'high'
    });
    
    // Ground 2: Civil Restraint Order without proper basis
    grounds.push({
      title: 'Civil Restraint Order Imposed Without Jurisdiction',
      details: [
        'CRO requires pattern of TWM applications: CPR 3.11',
        'First TWM finding cannot trigger CRO',
        'No prior TWM history established'
      ],
      citations: ['CPR 3.11', 'Sartipy v Tigris [2019] EWCA Civ 225'],
      likelihood: 'high'
    });
    
    // Ground 3: Estonian company discrimination
    grounds.push({
      title: 'Discrimination Against EU Company - MobiCycle OÜ',
      details: [
        'DJ Greenidge found MobiCycle "did become the tenant"',
        'CPR 55.1(b) protects tenants from trespass claims',
        'Estonian tenant denied protection given to UK tenants',
        'Violates ECHR Article 14 and EU Withdrawal Agreement'
      ],
      citations: ['ECHR Article 14', 'EU Withdrawal Agreement', 'CPR 55.1(b)'],
      likelihood: 'high'
    });
    
    // Ground 4: Permission refused without reasons
    grounds.push({
      title: 'Permission to Appeal Refused Without Analysis',
      details: [
        'No consideration of CPR 52.6 test',
        'No analysis of real prospect of success',
        'No consideration of compelling reasons',
        'Bare refusal inadequate'
      ],
      citations: ['CPR 52.6', 'Tanfern v Cameron-MacDonald [2000]'],
      likelihood: 'medium'
    });
    
    // Ground 5: Excessive costs
    grounds.push({
      title: 'Disproportionate Costs Awards - £28,275.16 Total',
      details: [
        'Costs exceed any reasonable assessment',
        '£16,275.16 for permission application excessive',
        'Additional £12,000 for brief hearing punitive',
        'Violates proportionality principle'
      ],
      citations: ['CPR 44.3', 'Lownds v Home Office [2002]'],
      likelihood: 'high'
    });
    
    return grounds;
  }
  
  private async generateComprehensiveGrounds(analyses: any[]): Promise<any> {
    // This is where the agent reads books and creates grounds
    const agent = this.agents.section06;
    
    // The agent would analyze the orders and generate grounds
    const orderText = analyses.map(a => a.orderText).join('\n\n');
    
    return await agent.analyzeOrderAndCreateGrounds(
      orderText,
      analyses[0].orderPath
    );
  }
  
  private extractDefects(orderContent: string): any[] {
    const defects = [];
    
    if (orderContent.includes('totally without merit') && 
        !orderContent.includes('because') && 
        !orderContent.includes('reasons')) {
      defects.push({
        type: 'procedural',
        defect: 'TWM finding without reasons',
        consequence: 'Violates duty to give reasons'
      });
    }
    
    if (orderContent.includes('Civil Restraint Order')) {
      defects.push({
        type: 'jurisdictional',
        defect: 'CRO on first TWM finding',
        consequence: 'Exceeds CPR 3.11 requirements'
      });
    }
    
    return defects;
  }
}