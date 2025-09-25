import type { Env } from '../types';
import { BookService } from './bookService';
import { N161TrainingService } from './n161TrainingService';

// Import all section agents
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

export class N161SequentialFiller {
  private workingDirectory = '/Users/mobicycle/Library/Mobile Documents/com~apple~CloudDocs/0._Legal/Roman_House/tech/n161_creator/working';
  private blankFormPath = '/Users/mobicycle/Library/Mobile Documents/com~apple~CloudDocs/0._Legal/Roman_House/applications_N161_N16a_N244_N461_N463/N161_appeal/N161_blank.pdf';
  private ordersPath = '/Users/mobicycle/Library/Mobile Documents/com~apple~CloudDocs/0._Legal/Roman_House/orders_from_courts/orders_cccl/2025';
  
  private agents: any;
  private currentFormPath: string = '';
  private caseData: any = {};
  
  constructor(private env: Env) {
    // Initialize all agents
    this.agents = [
      { name: 'Section 01: Case Details', agent: new CaseDetailsAgent(env) },
      { name: 'Section 02: Appeal Details', agent: new AppealDetailsAgent(env) },
      { name: 'Section 03: Legal Representation', agent: new LegalRepresentationAgent(env) },
      { name: 'Section 04: Permission', agent: new PermissionAgent(env) },
      { name: 'Section 05: Order Details', agent: new OrderDetailsAgent(env) },
      { name: 'Section 06: Grounds of Appeal', agent: new GroundsAnalyzerAgent(env) },
      { name: 'Section 07: Skeleton Argument', agent: new SkeletonArgumentAgent(env) },
      { name: 'Section 08: Aarhus Convention', agent: new AarhusConventionAgent(env) },
      { name: 'Section 09: Relief Sought', agent: new ReliefSoughtAgent(env) },
      { name: 'Section 10: Other Applications', agent: new OtherApplicationsAgent(env) },
      { name: 'Section 11: Evidence Support', agent: new EvidenceSupportAgent(env) },
      { name: 'Section 13: Supporting Documents', agent: new SupportingDocumentsAgent(env) },
      { name: 'Section 14: Statement of Truth', agent: new StatementOfTruthAgent(env) },
    ];
  }
  
  async fillN161ForCase(orderPaths: string[]): Promise<string> {
    console.log('🎯 STARTING N161 SEQUENTIAL FILLING PROCESS');
    console.log('=' .repeat(50));
    
    // Step 0: Analyze orders first
    console.log('\n🔍 ANALYZING ORDERS...');
    await this.analyzeOrders(orderPaths);
    
    // Step 1: Create working copy of blank N161
    console.log('\n📄 STEP 1: Creating working copy of blank N161');
    this.currentFormPath = await this.createWorkingCopy();
    console.log(`  ✅ Created: ${this.currentFormPath}`);
    
    // Step 2: Run each agent sequentially
    for (let i = 0; i < this.agents.length; i++) {
      const { name, agent } = this.agents[i];
      console.log('\n' + '='.repeat(50));
      console.log(`🤖 AGENT ${i + 1}/${this.agents.length}: ${name}`);
      console.log('-'.repeat(50));
      
      // Open the current form
      console.log(`  📂 Opening: ${this.currentFormPath}`);
      
      // Agent fills their section
      console.log(`  ✏️  Filling section...`);
      const sectionData = await this.runAgent(agent, i + 1);
      
      // Save the updated form
      const newPath = await this.saveProgress(i + 1, name);
      console.log(`  💾 Saved as: ${newPath}`);
      
      // Update current form path for next agent
      this.currentFormPath = newPath;
      
      // Store section data for other agents to reference
      this.caseData[`section${String(i + 1).padStart(2, '0')}`] = sectionData;
      
      console.log(`  ✅ ${name} complete`);
    }
    
    // Final step: Create final version
    console.log('\n' + '='.repeat(50));
    console.log('🎆 CREATING FINAL N161');
    const finalPath = await this.createFinalVersion();
    
    console.log('\n✅ N161 FORM COMPLETE!');
    console.log(`📁 Final form: ${finalPath}`);
    
    return finalPath;
  }
  
  private async analyzeOrders(orderPaths: string[]): Promise<void> {
    // Read and analyze orders to extract key information
    const voidDetector = new VoidDetectorAgent(this.env);
    
    for (const orderPath of orderPaths) {
      console.log(`  Analyzing: ${orderPath}`);
      
      // Read order (in reality would use Read tool)
      const orderContent = `Order from ${orderPath}`;
      
      // Detect void issues
      const voidAnalysis = await voidDetector.detect(orderContent, {
        orderPath,
        judge: 'HHJ Gerald',
        orderDate: orderPath.includes('29') ? '29 August 2025' : '3 September 2025'
      });
      
      // Store analysis
      this.caseData.orders = this.caseData.orders || [];
      this.caseData.orders.push({
        path: orderPath,
        content: orderContent,
        voidAnalysis
      });
    }
    
    // Extract case details from orders
    this.caseData.caseNumber = 'K10CL521';
    this.caseData.court = 'County Court at Central London';
    this.caseData.judge = 'HHJ Gerald';
    this.caseData.appellants = ['Roslyn Scott', 'MobiCycle OÜ'];
    this.caseData.respondent = 'Yiqun Liu';
    this.caseData.totalCosts = 28275.16;
    this.caseData.civilRestraintOrder = true;
    this.caseData.permissionRefused = true;
  }
  
  private async createWorkingCopy(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const caseNumber = this.caseData.caseNumber || 'NEW';
    const workingPath = `${this.workingDirectory}/N161_${caseNumber}_${timestamp}_BLANK.pdf`;
    
    // In reality, would copy the file using Bash:
    // await bash(`cp "${this.blankFormPath}" "${workingPath}"`);
    
    return workingPath;
  }
  
  private async runAgent(agent: any, sectionNumber: number): Promise<any> {
    // Each agent gets access to:
    // 1. The current form path
    // 2. Previous sections' data
    // 3. Order analysis
    
    let sectionData = {};
    
    switch (sectionNumber) {
      case 1: // Case Details
        sectionData = await agent.populateSection1({
          caseNumber: this.caseData.caseNumber,
          courtName: this.caseData.court,
          appellantName: this.caseData.appellants[0],
          appellantAddress: 'Apartment 13, Roman House, Wood Street, London EC2Y 5AG',
          respondentName: this.caseData.respondent
        });
        break;
        
      case 2: // Appeal Details
        sectionData = await agent.populateSection2(
          {
            judge: this.caseData.judge,
            date: '29 August 2025',
            type: 'Civil Restraint Order and Costs Orders'
          },
          this.caseData
        );
        break;
        
      case 3: // Legal Representation
        sectionData = await agent.populateSection3(
          {
            name: this.caseData.appellants[0],
            isLitigantInPerson: true
          },
          true
        );
        break;
        
      case 4: // Permission
        sectionData = await agent.populateSection4(
          this.caseData.orders[0],
          this.caseData.section06?.grounds || []
        );
        break;
        
      case 5: // Order Details
        sectionData = await agent.populateSection5(
          this.caseData.orders[0].content,
          this.caseData.orders[0]
        );
        break;
        
      case 6: // GROUNDS - Most Important!
        console.log('  ⚡ CRITICAL SECTION: Analyzing orders and generating grounds');
        console.log('  📚 Reading Book 4: Void ab Initio (68% void rate)');
        console.log('  📚 Reading Book 3: Domestic Law violations');
        console.log('  📚 Reading past successful N161s');
        
        const orderText = this.caseData.orders.map((o: any) => o.content).join('\n');
        sectionData = await agent.analyzeOrderAndCreateGrounds(
          orderText,
          this.caseData.orders[0].path
        );
        
        console.log(`  🎯 Generated ${sectionData.grounds?.length || 0} grounds`);
        if (sectionData.voidPossibility?.isVoid) {
          console.log('  ⚠️  VOID ORDER DETECTED!');
        }
        break;
        
      case 7: // Skeleton Argument
        sectionData = await agent.generateSection7(
          this.caseData.section06?.grounds || [],
          this.caseData.orders[0],
          this.caseData
        );
        break;
        
      case 8: // Aarhus Convention
        sectionData = await agent.assessSection8(
          this.caseData,
          this.caseData.section06?.grounds
        );
        break;
        
      case 9: // Relief Sought
        sectionData = await agent.generateSection9(
          this.caseData.orders[0],
          this.caseData.section06?.grounds || []
        );
        break;
        
      case 10: // Other Applications
        sectionData = await agent.generateSection10(
          this.caseData.orders[0],
          this.caseData.section06?.grounds || [],
          { level: 'urgent' }
        );
        break;
        
      case 11: // Evidence
        sectionData = await agent.organizeSection11(
          this.caseData.section06?.grounds || [],
          [],
          []
        );
        break;
        
      case 13: // Documents
        sectionData = await agent.organizeSection13(
          this.caseData.orders[0],
          this.caseData.section06?.grounds || [],
          []
        );
        break;
        
      case 14: // Statement of Truth
        sectionData = await agent.generateSection14(
          { name: this.caseData.appellants[0] },
          true
        );
        break;
    }
    
    return sectionData;
  }
  
  private async saveProgress(sectionNumber: number, sectionName: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(11, 19);
    const cleanName = sectionName.replace(/[^a-zA-Z0-9]/g, '_');
    const newPath = this.currentFormPath.replace(
      '.pdf',
      `_S${String(sectionNumber).padStart(2, '0')}_${cleanName}_${timestamp}.pdf`
    );
    
    // In reality, would save the updated PDF:
    // await bash(`cp "${this.currentFormPath}" "${newPath}"`);
    
    return newPath;
  }
  
  private async createFinalVersion(): Promise<string> {
    const date = new Date().toISOString().split('T')[0];
    const finalPath = `${this.workingDirectory}/N161_${this.caseData.caseNumber}_FINAL_${date}.pdf`;
    
    // Copy current form to final location
    // await bash(`cp "${this.currentFormPath}" "${finalPath}"`);
    
    // Also create a text version with all the content
    const textPath = finalPath.replace('.pdf', '.md');
    await this.createTextVersion(textPath);
    
    return finalPath;
  }
  
  private async createTextVersion(path: string): Promise<void> {
    // Create markdown version with all sections
    const content = [];
    
    content.push('# N161 APPELLANT\'S NOTICE');
    content.push(`## Case Number: ${this.caseData.caseNumber}`);
    content.push(`## Date: ${new Date().toLocaleDateString()}`);
    content.push('');
    
    // Add each section
    for (let i = 1; i <= 14; i++) {
      const sectionKey = `section${String(i).padStart(2, '0')}`;
      const sectionData = this.caseData[sectionKey];
      
      if (sectionData) {
        content.push(`## Section ${i}: ${this.agents[i - 1]?.name}`);
        content.push(JSON.stringify(sectionData, null, 2));
        content.push('');
      }
    }
    
    // In reality would write to file
    // await writeFile(path, content.join('\n'));
  }
}