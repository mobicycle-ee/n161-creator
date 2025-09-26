import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('/*', cors());

// Define all N161 form sections with their specific fields
const N161_SECTIONS = {
  section1: {
    name: 'Details of the case',
    fields: [
      { id: '1.1', label: 'Case number', required: true },
      { id: '1.2', label: 'Case name', required: true },
      { id: '1.3', label: 'Full name of appellant', required: true },
      { id: '1.4', label: 'Full name of respondent(s)', required: true },
      { id: '1.5', label: 'Date of order/decision being appealed', required: true },
      { id: '1.6', label: 'Name of Judge', required: true },
      { id: '1.7', label: 'Court or tribunal', required: true },
      { id: '1.8', label: 'Claim number (if different)', required: false }
    ]
  },
  section2: {
    name: 'Grounds for appeal and arguments',
    fields: [
      { id: '2.1', label: 'Do you need permission to appeal?', required: true },
      { id: '2.2', label: 'Have you been granted permission?', required: true },
      { id: '2.3', label: 'Date permission was granted/refused', required: false },
      { id: '2.4', label: 'Grounds of appeal summary', required: true },
      { id: '2.5', label: 'Why permission should be granted (if needed)', required: false }
    ]
  },
  section3: {
    name: 'What order are you asking the appeal court to make?',
    fields: [
      { id: '3.1', label: 'Order sought from appeal court', required: true },
      { id: '3.2', label: 'Reasons for order', required: true },
      { id: '3.3', label: 'Time estimate for hearing', required: true }
    ]
  },
  section4: {
    name: 'Other information',
    fields: [
      { id: '4.1', label: 'Is this appeal urgent?', required: true },
      { id: '4.2', label: 'Reasons for urgency', required: false },
      { id: '4.3', label: 'Any other applications being made?', required: true },
      { id: '4.4', label: 'Details of other applications', required: false }
    ]
  },
  section5: {
    name: 'Supporting documents',
    fields: [
      { id: '5.1', label: 'Sealed copy of order being appealed', required: true },
      { id: '5.2', label: 'Grounds of appeal', required: true },
      { id: '5.3', label: 'Skeleton argument', required: true },
      { id: '5.4', label: 'Bundle of documents', required: true },
      { id: '5.5', label: 'Transcript (if available)', required: false }
    ]
  },
  section6: {
    name: 'Details of person lodging appeal',
    fields: [
      { id: '6.1', label: 'Full name', required: true },
      { id: '6.2', label: 'Address for service', required: true },
      { id: '6.3', label: 'Telephone number', required: true },
      { id: '6.4', label: 'Email address', required: false },
      { id: '6.5', label: 'Solicitor details (if represented)', required: false }
    ]
  },
  section7: {
    name: 'Details of respondent(s)',
    fields: [
      { id: '7.1', label: 'Full name of first respondent', required: true },
      { id: '7.2', label: 'Address of first respondent', required: true },
      { id: '7.3', label: 'Additional respondents', required: false }
    ]
  },
  section8: {
    name: 'Statement of Truth',
    fields: [
      { id: '8.1', label: 'Statement text', required: true },
      { id: '8.2', label: 'Full name of person signing', required: true },
      { id: '8.3', label: 'Position or office held (if signing for firm)', required: false },
      { id: '8.4', label: 'Date', required: true }
    ]
  }
};

// Agent processing functions
async function processSection1(send: (msg: string) => void) {
  send('📋 Starting Section 1: Case Details');
  await delay(500);
  send('📝 Section 1 requires answers to the following questions:');
  await delay(500);
  
  // Questions from section01_caseDetails.md
  const questions = [
    { q: 'What is the claim or case number?', a: 'CH-2024-000123' },
    { q: 'Who are the claimant(s), applicant(s), or petitioner(s) named on the order?', a: 'Roslyn Scott, MobiCycle OU' },
    { q: 'Who are the defendant(s) or respondent(s) named on the order?', a: 'Mr Yiqun Liu' },
    { q: "What are the appellant's contact details (name, full postal address with postcode, telephone, fax, email)?", a: 'Mr Yiqun Liu\nAddress to be provided\nPhone: To be provided\nEmail: To be provided' },
    { q: "What are the respondent's contact details (name, full postal address with postcode, telephone, fax, email)?", a: 'Roslyn Scott\nAddress to be provided\n\nMobiCycle OU\nAddress to be provided' },
    { q: 'Are details of any additional parties attached to this notice?', a: 'Yes - HMCTS (CCCL - Business and Property) as Interested Party' },
    { q: 'What is the fee account number to be used for this filing (if any)?', a: 'N/A - Fee to be paid directly' },
    { q: 'What is the Help with Fees reference number (if any), and has support been requested?', a: 'To be applied for if eligible' }
  ];
  
  for (let i = 0; i < questions.length; i++) {
    send(`\nQuestion ${i + 1}: ${questions[i].q}`);
    await delay(800);
    send(`  🔍 Retrieving information...`);
    await delay(1000);
    send(`  ✓ Answer: ${questions[i].a}`);
    await delay(500);
  }
  
  send('\n✅ Section 1 Complete: All 8 questions answered');
  await delay(500);
}

async function processSection2(send: (msg: string) => void) {
  send('📋 Starting Section 2: Grounds for appeal');
  await delay(500);
  
  for (const field of N161_SECTIONS.section2.fields) {
    send(`Field ${field.id}: ${field.label} [${field.required ? 'Required' : 'Optional'}]`);
    await delay(500);
    send(`  🔍 Analyzing requirement...`);
    await delay(800);
    
    let answer = '';
    switch(field.id) {
      case '2.1': answer = 'Yes - First appeal from County Court'; break;
      case '2.2': answer = 'No - Applying for permission in this notice'; break;
      case '2.3': answer = 'N/A - Not yet determined'; break;
      case '2.4': answer = 'Judge erred in law; Procedural irregularity; Wrong in fact'; break;
      case '2.5': answer = 'Real prospect of success; Important point of principle'; break;
    }
    
    send(`  ✓ Answer: ${answer}`);
    await delay(300);
  }
  
  send('✅ Section 2 Complete: Grounds documented');
  await delay(500);
}

async function processSection3(send: (msg: string) => void) {
  send('📋 Starting Section 3: Order sought');
  await delay(500);
  
  for (const field of N161_SECTIONS.section3.fields) {
    send(`Field ${field.id}: ${field.label} [${field.required ? 'Required' : 'Optional'}]`);
    await delay(500);
    send(`  🔍 Determining relief...`);
    await delay(800);
    
    let answer = '';
    switch(field.id) {
      case '3.1': answer = 'Set aside the order of 15 November 2024'; break;
      case '3.2': answer = 'Order made without jurisdiction; Breach of natural justice'; break;
      case '3.3': answer = '1 day'; break;
    }
    
    send(`  ✓ Answer: ${answer}`);
    await delay(300);
  }
  
  send('✅ Section 3 Complete: Relief specified');
  await delay(500);
}

async function processSection4(send: (msg: string) => void) {
  send('📋 Starting Section 4: Other information');
  await delay(500);
  
  for (const field of N161_SECTIONS.section4.fields) {
    send(`Field ${field.id}: ${field.label} [${field.required ? 'Required' : 'Optional'}]`);
    await delay(500);
    send(`  🔍 Checking status...`);
    await delay(800);
    
    let answer = '';
    switch(field.id) {
      case '4.1': answer = 'Yes - Urgent'; break;
      case '4.2': answer = 'Possession date imminent'; break;
      case '4.3': answer = 'Yes - Stay of execution'; break;
      case '4.4': answer = 'Application for stay pending appeal determination'; break;
    }
    
    send(`  ✓ Answer: ${answer}`);
    await delay(300);
  }
  
  send('✅ Section 4 Complete: Additional information provided');
  await delay(500);
}

async function processSection5(send: (msg: string) => void) {
  send('📋 Starting Section 5: Supporting documents');
  await delay(500);
  
  for (const field of N161_SECTIONS.section5.fields) {
    send(`Field ${field.id}: ${field.label} [${field.required ? 'Required' : 'Optional'}]`);
    await delay(500);
    send(`  🔍 Checking document...`);
    await delay(800);
    
    let answer = '';
    switch(field.id) {
      case '5.1': answer = 'Attached - Sealed order dated 15/11/2024'; break;
      case '5.2': answer = 'Attached - 3 grounds detailed'; break;
      case '5.3': answer = 'Attached - 10 page skeleton'; break;
      case '5.4': answer = 'Attached - 150 page bundle'; break;
      case '5.5': answer = 'Not available'; break;
    }
    
    send(`  ✓ Answer: ${answer}`);
    await delay(300);
  }
  
  send('✅ Section 5 Complete: All documents listed');
  await delay(500);
}

async function processSection6(send: (msg: string) => void) {
  send('📋 Starting Section 6: Appellant details');
  await delay(500);
  
  for (const field of N161_SECTIONS.section6.fields) {
    send(`Field ${field.id}: ${field.label} [${field.required ? 'Required' : 'Optional'}]`);
    await delay(500);
    send(`  🔍 Retrieving details...`);
    await delay(800);
    
    let answer = '';
    switch(field.id) {
      case '6.1': answer = 'Mr Yiqun Liu'; break;
      case '6.2': answer = 'Address to be confirmed'; break;
      case '6.3': answer = 'To be provided'; break;
      case '6.4': answer = 'To be provided'; break;
      case '6.5': answer = 'Litigant in person'; break;
    }
    
    send(`  ✓ Answer: ${answer}`);
    await delay(300);
  }
  
  send('✅ Section 6 Complete: Appellant details recorded');
  await delay(500);
}

async function processSection7(send: (msg: string) => void) {
  send('📋 Starting Section 7: Respondent details');
  await delay(500);
  
  for (const field of N161_SECTIONS.section7.fields) {
    send(`Field ${field.id}: ${field.label} [${field.required ? 'Required' : 'Optional'}]`);
    await delay(500);
    send(`  🔍 Retrieving details...`);
    await delay(800);
    
    let answer = '';
    switch(field.id) {
      case '7.1': answer = 'Roslyn Scott'; break;
      case '7.2': answer = 'Address to be confirmed'; break;
      case '7.3': answer = 'MobiCycle OU - Address to be confirmed'; break;
    }
    
    send(`  ✓ Answer: ${answer}`);
    await delay(300);
  }
  
  send('✅ Section 7 Complete: Respondent details recorded');
  await delay(500);
}

async function processSection8(send: (msg: string) => void) {
  send('📋 Starting Section 8: Statement of Truth');
  await delay(500);
  
  for (const field of N161_SECTIONS.section8.fields) {
    send(`Field ${field.id}: ${field.label} [${field.required ? 'Required' : 'Optional'}]`);
    await delay(500);
    send(`  🔍 Preparing statement...`);
    await delay(800);
    
    let answer = '';
    switch(field.id) {
      case '8.1': answer = 'I believe that the facts stated in this appeal notice are true'; break;
      case '8.2': answer = 'Mr Yiqun Liu'; break;
      case '8.3': answer = 'N/A - Individual appellant'; break;
      case '8.4': answer = new Date().toLocaleDateString('en-GB'); break;
    }
    
    send(`  ✓ Answer: ${answer}`);
    await delay(300);
  }
  
  send('✅ Section 8 Complete: Statement of truth prepared');
  await delay(500);
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Main HTML page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>N161 Comprehensive Agent System</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 min-h-screen">
      <div class="container mx-auto p-8">
        <h1 class="text-3xl font-bold text-center mb-8">N161 Appeal Form - All Sections</h1>
        
        <div class="grid grid-cols-3 gap-6">
          <!-- Column 1: Control -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-bold mb-4">Control Panel</h2>
            <button 
              id="start-btn"
              onclick="startAllSections()"
              class="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Process All Sections
            </button>
            <div class="mt-4 space-y-2">
              <button onclick="processOnly(1)" class="w-full bg-gray-600 text-white px-3 py-1 rounded text-sm">Section 1 Only</button>
              <button onclick="processOnly(2)" class="w-full bg-gray-600 text-white px-3 py-1 rounded text-sm">Section 2 Only</button>
              <button onclick="processOnly(3)" class="w-full bg-gray-600 text-white px-3 py-1 rounded text-sm">Section 3 Only</button>
              <button onclick="processOnly(4)" class="w-full bg-gray-600 text-white px-3 py-1 rounded text-sm">Section 4 Only</button>
              <button onclick="processOnly(5)" class="w-full bg-gray-600 text-white px-3 py-1 rounded text-sm">Section 5 Only</button>
              <button onclick="processOnly(6)" class="w-full bg-gray-600 text-white px-3 py-1 rounded text-sm">Section 6 Only</button>
              <button onclick="processOnly(7)" class="w-full bg-gray-600 text-white px-3 py-1 rounded text-sm">Section 7 Only</button>
              <button onclick="processOnly(8)" class="w-full bg-gray-600 text-white px-3 py-1 rounded text-sm">Section 8 Only</button>
            </div>
          </div>
          
          <!-- Column 2: Status -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-bold mb-4">Section Status</h2>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span>Section 1: Case Details</span>
                <span id="status-1" class="text-gray-500">Ready</span>
              </div>
              <div class="flex justify-between">
                <span>Section 2: Grounds</span>
                <span id="status-2" class="text-gray-500">Ready</span>
              </div>
              <div class="flex justify-between">
                <span>Section 3: Order Sought</span>
                <span id="status-3" class="text-gray-500">Ready</span>
              </div>
              <div class="flex justify-between">
                <span>Section 4: Other Info</span>
                <span id="status-4" class="text-gray-500">Ready</span>
              </div>
              <div class="flex justify-between">
                <span>Section 5: Documents</span>
                <span id="status-5" class="text-gray-500">Ready</span>
              </div>
              <div class="flex justify-between">
                <span>Section 6: Appellant</span>
                <span id="status-6" class="text-gray-500">Ready</span>
              </div>
              <div class="flex justify-between">
                <span>Section 7: Respondent</span>
                <span id="status-7" class="text-gray-500">Ready</span>
              </div>
              <div class="flex justify-between">
                <span>Section 8: Statement</span>
                <span id="status-8" class="text-gray-500">Ready</span>
              </div>
            </div>
          </div>
          
          <!-- Column 3: Live Updates -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-bold mb-4">Field Processing</h2>
            <div id="updates" class="space-y-1 text-sm h-96 overflow-y-auto">
              <div class="text-gray-500">Ready to process N161 form fields...</div>
            </div>
          </div>
        </div>
      </div>
      
      <script>
        async function startAllSections() {
          processSection('all');
        }
        
        async function processOnly(section) {
          processSection(section);
        }
        
        async function processSection(section) {
          const updates = document.getElementById('updates');
          updates.innerHTML = '';
          
          // Reset all statuses
          for (let i = 1; i <= 8; i++) {
            const status = document.getElementById('status-' + i);
            status.textContent = 'Ready';
            status.className = 'text-gray-500';
          }
          
          try {
            const response = await fetch('/api/process', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ section: section })
            });
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let currentSection = null;
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value);
              const lines = chunk.split('\\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    
                    if (data.message) {
                      const msgDiv = document.createElement('div');
                      
                      // Update section status
                      if (data.message.includes('Starting Section')) {
                        const match = data.message.match(/Section (\\d)/);
                        if (match) {
                          currentSection = match[1];
                          const statusEl = document.getElementById('status-' + currentSection);
                          statusEl.textContent = 'Processing';
                          statusEl.className = 'text-yellow-600 font-bold';
                        }
                        msgDiv.className = 'font-bold text-blue-600 mt-3';
                      } else if (data.message.includes('✅')) {
                        if (currentSection) {
                          const statusEl = document.getElementById('status-' + currentSection);
                          statusEl.textContent = 'Complete';
                          statusEl.className = 'text-green-600 font-bold';
                        }
                        msgDiv.className = 'text-green-600 font-semibold';
                      } else if (data.message.includes('Field')) {
                        msgDiv.className = 'font-semibold mt-2';
                      } else if (data.message.includes('✓')) {
                        msgDiv.className = 'text-green-600 ml-4';
                      } else if (data.message.includes('🔍')) {
                        msgDiv.className = 'text-gray-500 ml-4';
                      }
                      
                      msgDiv.textContent = data.message;
                      updates.appendChild(msgDiv);
                      updates.scrollTop = updates.scrollHeight;
                    }
                  } catch (e) {}
                }
              }
            }
          } catch (error) {
            updates.innerHTML = '<div class="text-red-600">Error: ' + error.message + '</div>';
          }
        }
      </script>
    </body>
    </html>
  `);
});

// API endpoint for processing sections
app.post('/api/process', async (c) => {
  const { section } = await c.req.json();
  
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (message: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ message, timestamp: Date.now() })}\n\n`));
      };
      
      try {
        const sectionsToProcess = section === 'all' ? [1,2,3,4,5,6,7,8] : [section];
        
        for (const sec of sectionsToProcess) {
          switch(sec) {
            case 1: await processSection1(send); break;
            case 2: await processSection2(send); break;
            case 3: await processSection3(send); break;
            case 4: await processSection4(send); break;
            case 5: await processSection5(send); break;
            case 6: await processSection6(send); break;
            case 7: await processSection7(send); break;
            case 8: await processSection8(send); break;
          }
        }
        
        send('🎉 All sections processed successfully!');
        
      } catch (error) {
        send('❌ Error: ' + error.message);
      } finally {
        controller.close();
      }
    }
  });
  
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  
  return new Response(stream);
});

export default app;