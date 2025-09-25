import { Hono } from 'hono';
import type { Env } from '../types';
import { N161ProcessorAgent } from '../agents/baseAgent';

export const appealSimpleRoutes = new Hono<{ Bindings: Env }>();

// Process appeal with simplified agent
appealSimpleRoutes.post('/process-simple', async (c) => {
  const { orderKey, selectedParties, interestedParties } = await c.req.json();
  
  if (!orderKey) {
    return c.json({ error: 'Order key is required' }, 400);
  }

  const encoder = new TextEncoder();
  
  // Set up SSE response
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  c.header('Access-Control-Allow-Origin', '*');

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (section: string, message: string) => {
        const data = JSON.stringify({ 
          section, 
          message, 
          timestamp: Date.now() 
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        // Initialize the unified agent
        const processor = new N161ProcessorAgent(c.env);
        
        // Process the full appeal
        const results = await processor.processFullAppeal(
          orderKey, 
          selectedParties,
          sendUpdate
        );
        
        // Store results temporarily in KV for preview/download
        const formKey = `n161_${Date.now()}_${orderKey.replace('.pdf', '')}`;
        await c.env.APPEALS.put(formKey, JSON.stringify({
          orderKey: orderKey,
          results: results,
          createdAt: new Date().toISOString(),
          status: 'completed'
        }), {
          expirationTtl: 3600 // Expires after 1 hour
        });
        
        // Send completion message
        const completionData = {
          type: 'complete',
          formKey: formKey,
          formUrl: `/api/appeal-simple/preview/${formKey}`,
          downloadUrl: `/api/appeal-simple/download/${formKey}`,
          results: results,
          timestamp: Date.now()
        };
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(completionData)}\n\n`));
        
      } catch (error) {
        console.error('Error processing appeal:', error);
        const errorData = {
          type: 'error',
          message: error.message || 'An error occurred processing the appeal',
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

// Preview N161 form data
appealSimpleRoutes.get('/preview/:key', async (c) => {
  const key = c.req.param('key');
  
  const data = await c.env.APPEALS.get(key, { type: 'json' });
  
  if (!data) {
    return c.json({ error: 'Form not found or expired' }, 404);
  }

  // Generate HTML preview of the N161 form
  const html = generateN161PreviewHTML(data);
  
  return c.html(html);
});

// Download N161 as text file (PDF generation would require additional library)
appealSimpleRoutes.get('/download/:key', async (c) => {
  const key = c.req.param('key');
  
  const data = await c.env.APPEALS.get(key, { type: 'json' });
  
  if (!data) {
    return c.json({ error: 'Form not found or expired' }, 404);
  }

  // Generate text version of N161
  const textContent = generateN161Text(data);
  
  c.header('Content-Type', 'text/plain');
  c.header('Content-Disposition', `attachment; filename="N161_${key}.txt"`);
  
  return c.text(textContent);
});

function generateN161PreviewHTML(data: any): string {
  const results = data.results;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>N161 Appeal Notice Preview</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #333; }
    h2 { color: #666; margin-top: 30px; }
    .section { margin: 20px 0; padding: 15px; background: #f5f5f5; }
    .field { margin: 10px 0; }
    .label { font-weight: bold; }
    .buttons { margin-top: 30px; text-align: center; }
    button { padding: 10px 20px; margin: 0 10px; font-size: 16px; cursor: pointer; }
    .download { background: #4CAF50; color: white; border: none; }
    .edit { background: #ff9800; color: white; border: none; }
  </style>
</head>
<body>
  <h1>N161 APPELLANT'S NOTICE - PREVIEW</h1>
  
  <div class="section">
    <h2>Section 1: Case Details and Parties</h2>
    <div class="field">
      <span class="label">Case Number:</span> ${results.section1?.caseNumber || 'Not provided'}
    </div>
    <div class="field">
      <span class="label">Order Date:</span> ${results.section1?.orderDate || 'Not provided'}
    </div>
    <div class="field">
      <span class="label">Parties:</span>
      <ul>
        ${(results.section1?.parties || []).map(p => `
          <li>${p.name} (${p.role})</li>
        `).join('')}
      </ul>
    </div>
  </div>
  
  <div class="section">
    <h2>Section 2: Nature of Appeal</h2>
    <div class="field">
      <span class="label">Appeal Type:</span> ${results.section2?.appealType || 'Not specified'}
    </div>
    <div class="field">
      <span class="label">Route:</span> ${results.section2?.route || 'Not specified'}
    </div>
    <div class="field">
      <span class="label">Deadline:</span> ${results.section2?.deadline || 'Not calculated'}
    </div>
  </div>
  
  <div class="section">
    <h2>Section 6: Grounds of Appeal</h2>
    <ul>
      ${(results.section6?.grounds || []).map(g => `
        <li><strong>${g.title}:</strong> ${g.description}</li>
      `).join('')}
    </ul>
  </div>
  
  <div class="section">
    <h2>Section 9: Relief Sought</h2>
    <div class="field">
      <span class="label">Primary Relief:</span> ${results.section9?.primaryRelief || 'Not specified'}
    </div>
    <div class="field">
      <span class="label">Alternative Relief:</span> ${results.section9?.alternativeRelief || 'Not specified'}
    </div>
  </div>
  
  ${results.section12?.hasVulnerability ? `
  <div class="section">
    <h2>Section 12: Vulnerability</h2>
    <div class="field">
      <span class="label">Vulnerabilities Identified:</span>
      <ul>
        ${(results.section12.vulnerabilities || []).map(v => `<li>${v}</li>`).join('')}
      </ul>
    </div>
  </div>
  ` : ''}
  
  ${results.voidAnalysis?.isLikelyVoid ? `
  <div class="section" style="background: #ffebee;">
    <h2 style="color: #c62828;">⚠️ Void Order Analysis</h2>
    <div class="field">
      <span class="label">Confidence:</span> ${results.voidAnalysis.confidence}%
    </div>
    <div class="field">
      <span class="label">Defects Identified:</span>
      <ul>
        ${(results.voidAnalysis.defects || []).map(d => `<li>${d}</li>`).join('')}
      </ul>
    </div>
  </div>
  ` : ''}
  
  <div class="buttons">
    <button class="download" onclick="window.location.href='/api/appeal-simple/download/${data.orderKey}'">
      Download N161
    </button>
    <button class="edit" onclick="window.history.back()">
      Back to Edit
    </button>
  </div>
</body>
</html>
  `;
}

function generateN161Text(data: any): string {
  const results = data.results;
  const sections = [];
  
  sections.push('N161 APPELLANT\'S NOTICE');
  sections.push('=' .repeat(50));
  sections.push('');
  
  // Section 1
  sections.push('SECTION 1: CASE DETAILS AND PARTIES');
  sections.push(`Case Number: ${results.section1?.caseNumber || 'Not provided'}`);
  sections.push(`Order Date: ${results.section1?.orderDate || 'Not provided'}`);
  sections.push('');
  sections.push('Parties:');
  (results.section1?.parties || []).forEach(p => {
    sections.push(`  ${p.name} (${p.role})`);
    if (p.contactDetails?.address) {
      sections.push(`    Address: ${p.contactDetails.address}`);
    }
  });
  sections.push('');
  
  // Section 2
  sections.push('SECTION 2: NATURE OF APPEAL');
  sections.push(`Appeal Type: ${results.section2?.appealType || 'Not specified'}`);
  sections.push(`Route: ${results.section2?.route || 'Not specified'}`);
  sections.push(`Deadline: ${results.section2?.deadline || 'Not calculated'}`);
  sections.push(`Permission Required: ${results.section2?.permissionRequired ? 'Yes' : 'No'}`);
  sections.push('');
  
  // Section 3
  sections.push('SECTION 3: LEGAL REPRESENTATION');
  sections.push(`Representation: ${results.section3?.hasRepresentation ? 'Represented' : 'Litigant in Person'}`);
  sections.push('');
  
  // Section 4
  sections.push('SECTION 4: PERMISSION TO APPEAL');
  sections.push(`Status: ${results.section4?.permissionStatus || 'Not specified'}`);
  sections.push(`Grounds: ${results.section4?.permissionGrounds || 'Not specified'}`);
  sections.push('');
  
  // Section 5
  sections.push('SECTION 5: DETAILS OF ORDER BEING APPEALED');
  sections.push(`Judge: ${results.section5?.judge || 'Not specified'}`);
  sections.push(`Order Type: ${results.section5?.orderType || 'Not specified'}`);
  sections.push('');
  
  // Section 6
  sections.push('SECTION 6: GROUNDS OF APPEAL');
  (results.section6?.grounds || []).forEach((g, i) => {
    sections.push(`${i + 1}. ${g.title}`);
    sections.push(`   ${g.description}`);
  });
  sections.push('');
  
  // Section 7
  sections.push('SECTION 7: SKELETON ARGUMENT');
  sections.push('See attached skeleton argument');
  sections.push('');
  
  // Section 8
  sections.push('SECTION 8: AARHUS CONVENTION CLAIM');
  sections.push(results.section8?.applicable ? 'This is an Aarhus Convention claim' : 'Not applicable');
  sections.push('');
  
  // Section 9
  sections.push('SECTION 9: RELIEF SOUGHT');
  sections.push(`Primary: ${results.section9?.primaryRelief || 'Not specified'}`);
  sections.push(`Alternative: ${results.section9?.alternativeRelief || 'Not specified'}`);
  sections.push('');
  
  // Section 10
  sections.push('SECTION 10: OTHER APPLICATIONS');
  if (results.section10?.hasOtherApplications) {
    (results.section10.applications || []).forEach(app => {
      sections.push(`  - ${app}`);
    });
  } else {
    sections.push('None');
  }
  sections.push('');
  
  // Section 11
  sections.push('SECTION 11: SUPPORTING DOCUMENTS');
  (results.section11?.documents || []).forEach(doc => {
    sections.push(`  - ${doc}`);
  });
  sections.push('');
  
  // Section 12
  sections.push('SECTION 12: VULNERABILITY');
  if (results.section12?.hasVulnerability) {
    sections.push('Vulnerabilities identified:');
    (results.section12.vulnerabilities || []).forEach(v => {
      sections.push(`  - ${v}`);
    });
  } else {
    sections.push('No vulnerabilities identified');
  }
  sections.push('');
  
  // Section 13
  sections.push('SECTION 13: LIST OF ACCOMPANYING DOCUMENTS');
  sections.push(`Total documents: ${results.section13?.totalDocuments || 0}`);
  sections.push('');
  
  // Section 14
  sections.push('SECTION 14: STATEMENT OF TRUTH');
  sections.push(results.section14?.statement || 'I believe that the facts stated in this appeal notice are true.');
  sections.push('');
  sections.push(`Signed: ${results.section14?.signatory || '[Appellant]'}`);
  sections.push(`Date: ${new Date().toLocaleDateString('en-GB')}`);
  
  return sections.join('\n');
}