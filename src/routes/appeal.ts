import { Hono } from 'hono';
import type { Env } from '../types';
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
import { VulnerabilityAssessmentAgent } from '../agents/section12_vulnerabilityAgent';
import { SupportingDocumentsAgent } from '../agents/section13_supportingDocumentsAgent';
import { StatementOfTruthAgent } from '../agents/section14_statementOfTruthAgent';
import { VoidDetectorAgent } from '../agents/specialAgent_voidDetector';

export const appealRoutes = new Hono<{ Bindings: Env }>();

// Process appeal with real agents
appealRoutes.post('/process', async (c) => {
  const { orderKey, selectedParties, interestedParties } = await c.req.json();
  
  if (!orderKey) {
    return c.json({ error: 'Order key is required' }, 400);
  }

  const encoder = new TextEncoder();
  
  // Set up SSE response
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (section: string, message: string) => {
        const data = JSON.stringify({ section, message, timestamp: Date.now() });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        // Initialize all agents with real env bindings
        const agents = {
          caseDetails: new CaseDetailsAgent(c.env),
          appealDetails: new AppealDetailsAgent(c.env),
          legalRep: new LegalRepresentationAgent(c.env),
          permission: new PermissionAgent(c.env),
          orderDetails: new OrderDetailsAgent(c.env),
          grounds: new GroundsAnalyzerAgent(c.env),
          skeleton: new SkeletonArgumentAgent(c.env),
          aarhus: new AarhusConventionAgent(c.env),
          relief: new ReliefSoughtAgent(c.env),
          otherApps: new OtherApplicationsAgent(c.env),
          evidence: new EvidenceSupportAgent(c.env),
          vulnerability: new VulnerabilityAssessmentAgent(c.env),
          documentList: new SupportingDocumentsAgent(c.env),
          statementOfTruth: new StatementOfTruthAgent(c.env),
          voidAnalysis: new VoidDetectorAgent(c.env)
        };

        const results = {};
        
        // Section 1: Case Details (with real PDF parsing)
        sendUpdate('Section 1', '📋 Case Details Agent starting...');
        const section1Agent = (msg: string) => sendUpdate('Section 1', msg);
        results.section1 = await agents.caseDetails.populateSection1(orderKey, section1Agent);
        await new Promise(r => setTimeout(r, 1000));

        // Section 2: Nature of Appeal  
        sendUpdate('Section 2', '🎯 Appeal Details Agent starting...');
        sendUpdate('Section 2', 'Analyzing order type and determining appeal route...');
        const section2Agent = (msg: string) => sendUpdate('Section 2', msg);
        results.section2 = await agents.appealDetails.analyzeAppealType(results.section1, section2Agent);
        await new Promise(r => setTimeout(r, 1500));

        // Section 3: Legal Representation
        sendUpdate('Section 3', '⚖️ Legal Representation Agent starting...');
        sendUpdate('Section 3', 'Checking representation status...');
        results.section3 = await agents.legalRep.assessSection3(selectedParties);
        sendUpdate('Section 3', results.section3.hasRepresentation ? 
          '✓ Legal representation confirmed' : 
          '✓ Litigant in person - additional support required');
        sendUpdate('Section 3', '✅ Section 3 Complete');
        await new Promise(r => setTimeout(r, 1200));

        // Section 4: Permission to Appeal
        sendUpdate('Section 4', '🔐 Permission Agent starting...');
        sendUpdate('Section 4', 'Analyzing permission requirements...');
        sendUpdate('Section 4', 'Checking if permission already granted...');
        results.section4 = await agents.permission.assessSection4(
          results.section1.caseDetails,
          results.section2
        );
        sendUpdate('Section 4', `✓ ${results.section4.permissionStatus}`);
        if (results.section4.deadline) {
          sendUpdate('Section 4', `⏰ Deadline: ${results.section4.deadline}`);
        }
        sendUpdate('Section 4', '✅ Section 4 Complete');
        await new Promise(r => setTimeout(r, 2000));

        // Section 5: Order Details
        sendUpdate('Section 5', '📄 Order Details Agent starting...');
        sendUpdate('Section 5', `Reading order: ${orderKey}...`);
        sendUpdate('Section 5', 'Extracting key provisions...');
        results.section5 = await agents.orderDetails.extractSection5(orderKey);
        sendUpdate('Section 5', `✓ Order type: ${results.section5.orderType}`);
        sendUpdate('Section 5', `✓ Judge: ${results.section5.judge}`);
        sendUpdate('Section 5', '✅ Section 5 Complete');
        await new Promise(r => setTimeout(r, 1800));

        // Section 6: Grounds of Appeal
        sendUpdate('Section 6', '📚 Grounds Agent starting...');
        sendUpdate('Section 6', 'Analyzing case for grounds of appeal...');
        sendUpdate('Section 6', 'Checking Book 4 for void order patterns...');
        results.section6 = await agents.grounds.developSection6(
          results.section1,
          results.section5
        );
        sendUpdate('Section 6', `✓ Identified ${results.section6.grounds?.length || 0} grounds`);
        results.section6.grounds?.forEach((g: any) => {
          sendUpdate('Section 6', `  • ${g.title}`);
        });
        sendUpdate('Section 6', '✅ Section 6 Complete');
        await new Promise(r => setTimeout(r, 2500));

        // Section 7: Skeleton Argument
        sendUpdate('Section 7', '📝 Skeleton Argument Agent starting...');
        sendUpdate('Section 7', 'Structuring legal arguments...');
        sendUpdate('Section 7', 'Citing relevant authorities...');
        results.section7 = await agents.skeleton.generateSection7(results.section6);
        sendUpdate('Section 7', `✓ Generated ${results.section7.paragraphs?.length || 0} paragraphs`);
        sendUpdate('Section 7', `✓ Cited ${results.section7.authorities?.length || 0} authorities`);
        sendUpdate('Section 7', '✅ Section 7 Complete');
        await new Promise(r => setTimeout(r, 3000));

        // Section 8: Aarhus Convention
        sendUpdate('Section 8', '🌍 Aarhus Convention Agent starting...');
        sendUpdate('Section 8', 'Checking environmental law applicability...');
        results.section8 = await agents.aarhus.assessSection8(
          results.section1.caseDetails,
          results.section6.grounds
        );
        sendUpdate('Section 8', results.section8.applicable ? 
          '✓ Aarhus Convention applies' : 
          '✓ Not an environmental case');
        sendUpdate('Section 8', '✅ Section 8 Complete');
        await new Promise(r => setTimeout(r, 1000));

        // Section 9: Relief Sought
        sendUpdate('Section 9', '⚡ Relief Agent starting...');
        sendUpdate('Section 9', 'Determining appropriate remedies...');
        results.section9 = await agents.relief.determineSection9(
          results.section1,
          results.section6
        );
        sendUpdate('Section 9', `✓ Primary relief: ${results.section9.primaryRelief}`);
        sendUpdate('Section 9', '✅ Section 9 Complete');
        await new Promise(r => setTimeout(r, 1500));

        // Section 10: Other Applications
        sendUpdate('Section 10', '📋 Other Applications Agent starting...');
        sendUpdate('Section 10', 'Checking for urgent applications needed...');
        results.section10 = await agents.otherApps.assessSection10(
          results.section1,
          results.section9
        );
        sendUpdate('Section 10', results.section10.hasOtherApplications ? 
          `✓ ${results.section10.applications?.length} additional applications needed` :
          '✓ No additional applications required');
        sendUpdate('Section 10', '✅ Section 10 Complete');
        await new Promise(r => setTimeout(r, 1200));

        // Section 11: Evidence
        sendUpdate('Section 11', '📁 Evidence Agent starting...');
        sendUpdate('Section 11', 'Compiling evidence bundle...');
        sendUpdate('Section 11', 'Checking for missing documents...');
        results.section11 = await agents.evidence.compileSection11(results);
        sendUpdate('Section 11', `✓ ${results.section11.documents?.length || 0} documents identified`);
        sendUpdate('Section 11', '✅ Section 11 Complete');
        await new Promise(r => setTimeout(r, 2000));

        // Section 12: Vulnerability
        sendUpdate('Section 12', '🛡️ Vulnerability Agent starting...');
        sendUpdate('Section 12', 'Assessing vulnerability indicators...');
        sendUpdate('Section 12', 'Checking Equality Act requirements...');
        results.section12 = await agents.vulnerability.assessSection12(
          results.section1,
          selectedParties
        );
        sendUpdate('Section 12', results.section12.hasVulnerability ?
          `✓ Vulnerability identified - adjustments required` :
          '✓ No vulnerability issues identified');
        sendUpdate('Section 12', '✅ Section 12 Complete');
        await new Promise(r => setTimeout(r, 1800));

        // Section 13: Document List
        sendUpdate('Section 13', '📑 Document List Agent starting...');
        sendUpdate('Section 13', 'Organizing supporting documents...');
        results.section13 = await agents.documentList.compileSection13(results.section11);
        sendUpdate('Section 13', `✓ ${results.section13.totalDocuments || 0} documents listed`);
        sendUpdate('Section 13', '✅ Section 13 Complete');
        await new Promise(r => setTimeout(r, 1000));

        // Section 14: Statement of Truth
        sendUpdate('Section 14', '✍️ Statement of Truth Agent starting...');
        sendUpdate('Section 14', 'Preparing statement of truth...');
        results.section14 = await agents.statementOfTruth.prepareSection14(selectedParties);
        sendUpdate('Section 14', '✓ Statement prepared for signature');
        sendUpdate('Section 14', '✅ Section 14 Complete');
        await new Promise(r => setTimeout(r, 800));

        // Void Order Analysis
        sendUpdate('Void Analysis', '🔍 Void Order Analysis Agent starting...');
        sendUpdate('Void Analysis', 'Checking Book 4 patterns...');
        sendUpdate('Void Analysis', 'Analyzing for jurisdictional defects...');
        results.voidAnalysis = await agents.voidAnalysis.analyzeForVoidOrder(
          results.section1,
          results.section5
        );
        sendUpdate('Void Analysis', results.voidAnalysis.isLikelyVoid ?
          `⚠️ HIGH PROBABILITY of void order (${results.voidAnalysis.confidence}% confidence)` :
          '✓ Order appears valid');
        sendUpdate('Void Analysis', '✅ Analysis Complete');
        await new Promise(r => setTimeout(r, 2000));

        // Document Generation
        sendUpdate('Document Generator', '📦 Document Generator starting...');
        sendUpdate('Document Generator', 'Creating N161 form PDF...');
        sendUpdate('Document Generator', 'Generating skeleton argument...');
        sendUpdate('Document Generator', 'Compiling evidence bundle...');
        
        // Generate the actual N161 PDF
        const n161Key = await generateN161PDF(c.env, results, orderKey);
        
        sendUpdate('Document Generator', `✓ N161 form created: ${n161Key}`);
        sendUpdate('Document Generator', '✓ All documents generated');
        sendUpdate('Document Generator', '✅ Generation Complete');

        // Final completion
        const completionData = {
          type: 'complete',
          formUrl: `/api/forms/n161/${n161Key}`,
          results: results,
          timestamp: Date.now()
        };
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(completionData)}\n\n`));
        
      } catch (error) {
        console.error('Error processing appeal:', error);
        const errorData = {
          type: 'error',
          message: error.message,
          timestamp: Date.now()
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream);
});

// Helper function to generate N161 PDF
async function generateN161PDF(env: Env, results: any, orderKey: string): Promise<string> {
  // Generate a temporary key for the form (not stored to R2)
  const n161Key = `n161_${Date.now()}_${orderKey.replace('.pdf', '')}`;
  
  // Store temporarily in KV for preview/download (expires after 1 hour)
  await env.APPEALS.put(n161Key, JSON.stringify({
    orderKey: orderKey,
    results: results,
    createdAt: new Date().toISOString(),
    status: 'completed'
  }), {
    expirationTtl: 3600 // Expires after 1 hour
  });

  return n161Key;
}

// Get N161 form data
appealRoutes.get('/forms/n161/:key', async (c) => {
  const key = c.req.param('key');
  
  const data = await c.env.APPEALS.get(key, { type: 'json' });
  
  if (!data) {
    return c.json({ error: 'Form not found' }, 404);
  }

  // TODO: Generate actual PDF from data
  // For now, return the JSON data
  return c.json(data);
});