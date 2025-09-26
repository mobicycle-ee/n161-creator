import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { AIService } from './services/aiService';
import { createOrderSearchHandler } from './steps/section00_order';
import { N161Orchestrator } from './steps/orchestrator';
import { QUESTION_SETS } from './questions/questionSets';

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors());

app.get('/', (c) => {
  const questionSetsJson = JSON.stringify(QUESTION_SETS);
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>N161 Appeal Creator</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-red-800 min-h-screen">
      <div class="mx-auto px-6 pt-12">
        <h1 class="text-3xl font-bold text-white text-center mb-8">⚖️ N161 Appeal Creator</h1>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 px-8">
          
          <!-- Column 1: Order Selection -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-xl font-bold text-orange-700 mb-4">📅 Select Court Order</h2>
            
            
            <div class="mb-6">
              <h2 class="text-lg font-semibold mb-3">📅 Browse Court Orders</h2>
              <select id="year" onchange="loadOrdersForYear()" class="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none">
                <option value="">Choose a year...</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
                <option value="2020">2020</option>
                <option value="2019">2019</option>
              </select>
            </div>
            
            <div id="results" class="mb-6 hidden">
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 h-auto overflow-y-auto">
                <div id="results-content"></div>
              </div>
            </div>
            
          </div>
          
          <!-- Column 2: Status Table -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-xl font-bold text-blue-900 mb-4">📄 Processing Status</h2>
            
            <!-- Action Buttons (Always Visible) -->
            <div class="mb-4 flex gap-3">
              <button id="preview-btn" onclick="previewN161()" class="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed" disabled>
                👁️ Preview Form
              </button>
              <button id="download-btn" onclick="downloadN161()" class="inline-flex items-center px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:bg-gray-300 disabled:cursor-not-allowed" disabled>
                💾 Download N161
              </button>
            </div>
            
            <div id="completion-message" class="hidden mb-4 bg-blue-50 border-2 border-blue-900 rounded-lg p-4">
              <h3 class="font-bold text-blue-900 mb-2">✅ N161 Form Complete!</h3>
              <p class="text-sm text-gray-700 mb-3">Your N161 appeal form has been generated successfully.</p>
              <div class="flex gap-3">
                <button onclick="previewN161()" class="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                  👁️ Preview Form
                </button>
                <a id="form-download-link" href="#" download class="inline-flex items-center px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800">
                  💾 Download N161
                </a>
              </div>
              <div id="form-preview" class="hidden mt-4">
                <h4 class="font-semibold text-gray-700 mb-2">Preview:</h4>
                <iframe id="preview-frame" class="w-full h-96 border-2 border-gray-300 rounded-lg bg-white"></iframe>
              </div>
            </div>
            <div class="bg-white border rounded-lg overflow-hidden">
              <div class="bg-orange-600 px-4 py-2 border-b">
                <div class="grid grid-cols-3 gap-4 text-sm font-medium text-white">
                  <div class="w-full">Section</div>
                  <div class="max-w-3xl">Status</div>
                  <div class="max-w-2xl">Duration</div>
                </div>
              </div>
              <div id="section-table" class="divide-y">
                <div id="row-1" class="grid grid-cols-3 gap-4 px-4 py-2 text-sm">
                  <div class="font-medium">Finding blank N161 form</div>
                  <div id="status-1">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">Queued</span>
                  </div>
                  <div id="time-1" class="text-gray-400 text-xs">--</div>
                </div>
                <div id="row-2" class="grid grid-cols-3 gap-4 px-4 py-2 text-sm">
                  <div class="font-medium">Section 1: Case Details and Parties</div>
                  <div id="status-2"><span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Queued</span></div>
                  <div id="time-2" class="text-gray-400 text-xs">--</div>
                </div>
                <div id="row-3" class="grid grid-cols-3 gap-4 px-4 py-2 text-sm">
                  <div class="font-medium">Section 2: Nature of Appeal</div>
                  <div id="status-3"><span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Queued</span></div>
                  <div id="time-3" class="text-gray-400 text-xs">--</div>
                </div>
                <div id="row-4" class="grid grid-cols-3 gap-4 px-4 py-2 text-sm">
                  <div class="font-medium">Section 3: Legal Representation</div>
                  <div id="status-4"><span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Queued</span></div>
                  <div id="time-4" class="text-gray-400 text-xs">--</div>
                </div>
                <div id="row-5" class="grid grid-cols-3 gap-4 px-4 py-2 text-sm">
                  <div class="font-medium">Section 4: Permission to Appeal</div>
                  <div id="status-5"><span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Queued</span></div>
                  <div id="time-5" class="text-gray-400 text-xs">--</div>
                </div>
                <div id="row-6" class="grid grid-cols-3 gap-4 px-4 py-2 text-sm">
                  <div class="font-medium">Section 5: Details of Order Being Appealed</div>
                  <div id="status-6"><span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Queued</span></div>
                  <div id="time-6" class="text-gray-400 text-xs">--</div>
                </div>
                <div id="row-7" class="grid grid-cols-3 gap-4 px-4 py-2 text-sm">
                  <div class="font-medium">Section 6: Grounds of Appeal</div>
                  <div id="status-7"><span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Queued</span></div>
                  <div id="time-7" class="text-gray-400 text-xs">--</div>
                </div>
                <div id="row-8" class="grid grid-cols-3 gap-4 px-4 py-2 text-sm">
                  <div class="font-medium">Section 7: Skeleton Argument</div>
                  <div id="status-8"><span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Queued</span></div>
                  <div id="time-8" class="text-gray-400 text-xs">--</div>
                </div>
                <div id="row-9" class="grid grid-cols-3 gap-4 px-4 py-2 text-sm">
                  <div class="font-medium">Section 8: Aarhus Convention Claims</div>
                  <div id="status-9"><span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Queued</span></div>
                  <div id="time-9" class="text-gray-400 text-xs">--</div>
                </div>
                <div id="row-10" class="grid grid-cols-3 gap-4 px-4 py-2 text-sm">
                  <div class="font-medium">Section 9: Relief Sought</div>
                  <div id="status-10"><span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Queued</span></div>
                  <div id="time-10" class="text-gray-400 text-xs">--</div>
                </div>
                <div id="row-11" class="grid grid-cols-3 gap-4 px-4 py-2 text-sm">
                  <div class="font-medium">Section 10: Other Applications</div>
                  <div id="status-11"><span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Queued</span></div>
                  <div id="time-11" class="text-gray-400 text-xs">--</div>
                </div>
                <div id="row-12" class="grid grid-cols-3 gap-4 px-4 py-2 text-sm">
                  <div class="font-medium">Section 11: Evidence and Supporting Documents</div>
                  <div id="status-12"><span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Queued</span></div>
                  <div id="time-12" class="text-gray-400 text-xs">--</div>
                </div>
                <div id="row-13" class="grid grid-cols-3 gap-4 px-4 py-2 text-sm">
                  <div class="font-medium">Section 12: Vulnerability</div>
                  <div id="status-13"><span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Queued</span></div>
                  <div id="time-13" class="text-gray-400 text-xs">--</div>
                </div>
                <div id="row-14" class="grid grid-cols-3 gap-4 px-4 py-2 text-sm">
                  <div class="font-medium">Section 13: Supporting Documents List</div>
                  <div id="status-14"><span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Queued</span></div>
                  <div id="time-14" class="text-gray-400 text-xs">--</div>
                </div>
                <div id="row-15" class="grid grid-cols-3 gap-4 px-4 py-2 text-sm">
                  <div class="font-medium">Section 14: Statement of Truth</div>
                  <div id="status-15"><span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Queued</span></div>
                  <div id="time-15" class="text-gray-400 text-xs">--</div>
                </div>
                <div id="row-16" class="grid grid-cols-3 gap-4 px-4 py-2 text-sm">
                  <div class="font-medium">Analyzing for void order potential</div>
                  <div id="status-16"><span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Queued</span></div>
                  <div id="time-16" class="text-gray-400 text-xs">--</div>
                </div>
                <div id="row-17" class="grid grid-cols-3 gap-4 px-4 py-2 text-sm">
                  <div class="font-medium">Generating supporting documents</div>
                  <div id="status-17"><span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Queued</span></div>
                  <div id="time-17" class="text-gray-400 text-xs">--</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Column 3: Party Information -->
          <div class="bg-white rounded-xl shadow-lg p-6 flex flex-col h-full">
            <h2 class="text-xl font-bold text-red-700 mb-4">👥 Party Information</h2>
            
            
            <h3 class="text-lg font-bold text-red-700 mb-4 border-t pt-4">💬 Agent Discussion</h3>
            <div class="mb-4">
              <form id="chat-form">
                <div class="flex gap-2">
                  <input type="text" id="message" 
                         class="flex-1 p-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" 
                         placeholder="Ask the agent...">
                  <button type="submit" 
                          class="bg-red-900 text-white px-3 py-2 rounded-lg font-semibold hover:bg-red-800">
                    Send
                  </button>
                </div>
              </form>
            </div>
            <div id="question-list" class="hidden mb-4 space-y-3"></div>
            <div id="chat" class="flex-1 space-y-3 overflow-y-auto border-t pt-4">
              <div class="bg-blue-50 p-3 rounded-lg text-sm">
                <p class="text-gray-600">Agent will provide updates here as each section is processed.</p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
      <script>
        const QUESTION_SETS = ${questionSetsJson};
        const STEP_SECTION_MAP = {
          '1': 'section1',
          '2': 'section2',
          '3': 'section3',
          '4': 'section4',
          '5': 'section5',
          '6': 'section6',
          '7': 'section7',
          '8': 'section8',
          '9': 'section9',
          '10': 'section10',
          '11': 'section11',
          '12': 'section12',
          '13': 'section13',
          '14': 'section14'
        };
        let sessionId = crypto.randomUUID();
        let currentN161Url = '';
        
        function renderQuestionList(sectionKey) {
          const container = document.getElementById('question-list');
          if (!container) return;
          const section = sectionKey ? QUESTION_SETS[sectionKey] : null;
          if (!section || !section.questions || section.questions.length === 0) {
            container.classList.add('hidden');
            container.innerHTML = '';
            return;
          }

          const items = section.questions.map((question, index) => {
            const label = question.id ? `Q${question.id}` : `Q${index + 1}`;
            const hintHtml = question.hint ? `<div class="text-xs text-gray-500 mt-1">${question.hint}</div>` : '';
            return `<li class="space-y-1"><div class="font-medium text-gray-800">${label}</div><div class="text-sm text-gray-700">${question.label}</div>${hintHtml}</li>`;
          }).join('');

          container.classList.remove('hidden');
          container.innerHTML = `
            <div class="font-semibold text-red-700">${section.title}</div>
            <ol class="list-decimal ml-5 space-y-2">${items}</ol>
          `;
        }

        function previewN161() {
          const previewDiv = document.getElementById('form-preview');
          const previewFrame = document.getElementById('preview-frame');
          
          if (previewDiv && previewFrame && currentN161Url) {
            previewDiv.classList.toggle('hidden');
            if (!previewDiv.classList.contains('hidden')) {
              // Show preview in iframe
              previewFrame.src = currentN161Url;
            }
          }
        }
        
        async function extractPartiesFromOrder(orderKey) {
          try {
            console.log('📄 Requesting party extraction from backend...');
            const response = await fetch('/api/orders/extract-parties', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ orderKey })
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
              throw new Error(data.error || 'Failed to extract parties');
            }

            window.currentPartyExtraction = data;
            console.log('✓ Extracted ' + (data.parties?.length || 0) + ' parties');
            return data;
          } catch (error) {
            console.error('Party extraction failed:', error);
            throw error;
          }
        }
        
        function lookupPartyAddresses(partyName) {
          // STEP 2: Search PAST N161 applications for addresses
          console.log(\`🔍 Searching past N161s for: \${partyName}\`);
          console.log('📂 Querying APPEALS database...');
          
          // This should:
          // 1. Query APPEALS KV namespace for past N161s
          // 2. Find applications where this party appeared
          // 3. Extract their stored address/email/phone
          // 4. Return the contact details
          
          return {
            address: '[Address from past N161 applications]',
            email: '[Email from past N161 applications]',
            phone: '[Phone from past N161 applications]'
          };
        }
        
        function preselectPartyRoles(parties) {
          parties.forEach((party, index) => {
            const name = typeof party === 'string' ? party : (party && party.name) || '';
            const providedRole = party && typeof party === 'object' && party.role ? party.role.toLowerCase() : null;
            const normalized = name.toLowerCase();
            let targetRole = providedRole;

            if (!targetRole) {
              if (normalized.includes('roman house')) {
                targetRole = 'appellant';
              } else if (normalized.includes('claimant') || normalized.includes('respondent')) {
                targetRole = 'respondent';
              } else if (normalized.includes('court') || normalized.includes('hhj')) {
                targetRole = 'interested';
              }
            }

            if (targetRole) {
              const selector = 'input[name="party-' + index + '"][value="' + targetRole + '"]';
              const radio = document.querySelector(selector);
              if (radio) {
                radio.checked = true;
              }
            }
          });
        }
        
        function confirmPartySelection() {
          // Get selected parties
          const selectedParties = [];
          const checkboxes = document.querySelectorAll('#party-checkboxes input[type="radio"]:checked');
          checkboxes.forEach(cb => {
            const partyDiv = cb.closest('.border');
            const partyName = partyDiv?.dataset?.partyName || partyDiv?.querySelector('.font-medium')?.textContent || 'Unknown party';
            const partyId = partyDiv?.dataset?.partyId || null;
            selectedParties.push({
              id: partyId,
              name: partyName,
              role: cb.value
            });
          });
          
          // Hide party selection
          const partySelection = document.getElementById('party-selection');
          if (partySelection) {
            partySelection.classList.add('hidden');
          }
          
          // Get the current order key from window state
          const orderKey = window.currentOrderKey;
          if (!orderKey) {
            alert('No order selected');
            return;
          }
          
          // Start the real processing
          processAppealWithBackend(orderKey, selectedParties);
        }
        
        async function processAppealWithBackend(orderKey, selectedParties) {
          // Reset all statuses to "Queued"
          for (let i = 1; i <= 17; i++) {
            const statusDiv = document.getElementById(\`status-\${i}\`);
            if (statusDiv) {
              statusDiv.innerHTML = '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">Queued</span>';
            }
            const timeDiv = document.getElementById(\`time-\${i}\`);
            if (timeDiv) {
              timeDiv.textContent = '--';
            }
          }
          
          // Clear chat
          const chatDiv = document.getElementById('chat');
          chatDiv.innerHTML = '<div class="text-gray-500 text-sm">🤖 Agents starting...</div>';
          renderQuestionList(null);
          
          // Hide completion message
          document.getElementById('completion-message')?.classList.add('hidden');
          
          try {
            // Call the backend API with orchestrator
            const response = await fetch('/api/n161/generate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                orderKey: orderKey
              })
            });
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            const sectionTimers = {};
            const sectionMap = {
              'Section 1': 2,
              'Section 2': 3,
              'Section 3': 4,
              'Section 4': 5,
              'Section 5': 6,
              'Section 6': 7,
              'Section 7': 8,
              'Section 8': 9,
              'Section 9': 10,
              'Section 10': 11,
              'Section 11': 12,
              'Section 12': 13,
              'Section 13': 14,
              'Section 14': 15,
              'Void Analysis': 16,
              'Document Generator': 17
            };
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value);
              const lines = chunk.split('\\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    
                    // Handle orchestrator updates - show in chat
                    if (data.type === 'update') {
                      const chatDiv = document.getElementById('chat');
                      if (chatDiv) {
                        const messageDiv = document.createElement('div');
                        messageDiv.className = 'bg-blue-50 p-2 rounded-lg text-sm';
                        messageDiv.textContent = data.message;
                        chatDiv.appendChild(messageDiv);
                        chatDiv.scrollTop = chatDiv.scrollHeight;
                        const stepMatch = (data.message || '').trim().match(/STEP\s+(\d+):/i);
                        if (stepMatch) {
                          const sectionKey = STEP_SECTION_MAP[stepMatch[1]];
                          if (sectionKey) {
                            renderQuestionList(sectionKey);
                          }
                        }
                        
                        // Update section status based on message content
                        if (data.message.includes('STEP 1:')) {
                          const statusEl = document.getElementById('status-2');
                          if (statusEl) {
                            statusEl.innerHTML = '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800"><span class="w-2 h-2 bg-orange-500 rounded-full mr-1 animate-pulse"></span>Processing</span>';
                          }
                        } else if (data.message.includes('Section 1 Complete')) {
                          const statusEl = document.getElementById('status-2');
                          if (statusEl) {
                            statusEl.innerHTML = '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-900"><span class="text-blue-700 mr-1">✓</span>Completed</span>';
                          }
                        }
                      }
                    }
                    
                    if (data.type === 'complete') {
                      // Show completion message and links
                      const completionDiv = document.getElementById('completion-message');
                      if (completionDiv) {
                        completionDiv.classList.remove('hidden');
                        
                        // Set download link
                        const downloadLink = document.getElementById('form-download-link');
                        if (downloadLink && data.downloadUrl) {
                          downloadLink.href = data.downloadUrl;
                        }
                        
                        // Store URLs for preview and download
                        window.currentFormUrl = data.formUrl;
                        window.currentDownloadUrl = data.downloadUrl;
                      }
                      
                      // Enable the preview and download buttons
                      const previewBtn = document.getElementById('preview-btn');
                      const downloadBtn = document.getElementById('download-btn');
                      if (previewBtn) previewBtn.disabled = false;
                      if (downloadBtn) downloadBtn.disabled = false;
                      
                      // Update final status
                      chatDiv.innerHTML = '<div class="text-green-600 font-bold">✅ All processing complete! N161 ready for download.</div>';
                      
                    } else if (data.type === 'error') {
                      chatDiv.innerHTML = \`<div class="text-red-600 font-bold">❌ Error: \${data.message}</div>\`;
                      
                    } else if (data.section && data.message) {
                      // Update agent discussion in column 3
                      const agentSection = data.section;
                      
                      // Check if it's a system stop message
                      if (agentSection === 'System' && data.message.includes('STOPPING')) {
                        chatDiv.innerHTML = \`
                          <div class="mb-4">
                            <div class="font-bold text-red-600 mb-2">⛔ SYSTEM</div>
                            <div class="text-lg font-bold text-red-600">\${data.message}</div>
                            <div class="text-sm text-gray-600 mt-2">Only Section 1 has been processed as requested.</div>
                          </div>
                        \`;
                        // Don't process any further sections
                        break;
                      } else {
                        chatDiv.innerHTML = \`
                          <div class="mb-4">
                            <div class="font-bold text-blue-800 mb-2">🤖 \${agentSection}</div>
                            <div class="text-sm text-gray-700">\${data.message}</div>
                          </div>
                        \`;
                        const sectionMatch = agentSection.match(/Section\s+(\d+)/i);
                        if (sectionMatch) {
                          const sectionKey = STEP_SECTION_MAP[sectionMatch[1]];
                          if (sectionKey) {
                            renderQuestionList(sectionKey);
                          }
                        }
                      }
                      
                      // Update status table
                      const sectionIndex = sectionMap[agentSection];
                      if (sectionIndex) {
                        const statusDiv = document.getElementById(\`status-\${sectionIndex}\`);
                        const timeDiv = document.getElementById(\`time-\${sectionIndex}\`);
                        
                        // Mark as processing when starting
                        if (data.message.includes('starting') || data.message.includes('Starting')) {
                          if (statusDiv) {
                            statusDiv.innerHTML = '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-700">Processing</span>';
                          }
                          sectionTimers[sectionIndex] = Date.now();
                        }
                        
                        // Mark as completed
                        if (data.message.includes('Complete') || data.message.includes('✅')) {
                          if (statusDiv) {
                            statusDiv.innerHTML = '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">✓ Completed</span>';
                          }
                          if (timeDiv && sectionTimers[sectionIndex]) {
                            const duration = Math.round((Date.now() - sectionTimers[sectionIndex]) / 1000);
                            timeDiv.textContent = \`\${duration}s\`;
                          }
                        }
                      }
                    }
                  } catch (e) {
                    console.error('Error parsing SSE data:', e);
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error calling backend:', error);
            chatDiv.innerHTML = \`<div class="text-red-600">❌ Error: \${error.message}</div>\`;
          }
        }
        
        function previewN161() {
          const previewDiv = document.getElementById('form-preview');
          const previewFrame = document.getElementById('preview-frame');
          
          if (previewDiv && previewFrame && window.currentFormUrl) {
            previewDiv.classList.remove('hidden');
            previewFrame.src = window.currentFormUrl;
          } else if (!window.currentFormUrl) {
            alert('No form available to preview. Please complete processing first.');
          }
        }
        
        function downloadN161() {
          if (window.currentDownloadUrl) {
            window.location.href = window.currentDownloadUrl;
          } else {
            alert('No form available to download. Please complete processing first.');
          }
        }
        
        async function loadOrdersForYear() {
          const year = document.getElementById('year').value;
          
          if (!year) {
            document.getElementById('results').classList.add('hidden');
            return;
          }
          
          try {
            const response = await fetch(\`/api/orders/search?q=\${year}\`);
            const data = await response.json();
            
            const resultsDiv = document.getElementById('results');
            const contentDiv = document.getElementById('results-content');
            
            if (data.files && data.files.length > 0) {
              // Group by court
              const groupedOrders = {};
              data.files.forEach(file => {
                if (!groupedOrders[file.court]) {
                  groupedOrders[file.court] = [];
                }
                groupedOrders[file.court].push(file);
              });
              
              let html = \`<h3 class="font-semibold mb-4">All orders from \${year} (\${data.files.length} total):</h3>\`;
              
              Object.keys(groupedOrders).forEach(court => {
                html += \`<div class="mb-4">
                  <h4 class="font-medium text-gray-700 mb-2">\${court.charAt(0).toUpperCase() + court.slice(1)} (\${groupedOrders[court].length})</h4>
                \`;
                
                groupedOrders[court].sort((a, b) => b.filename.localeCompare(a.filename)).forEach(file => {
                  html += \`
                    <div class="bg-white p-3 rounded-lg border border-blue-100 cursor-pointer hover:bg-blue-50 mb-2 ml-4" onclick="startAppeal('\${file.key}')">
                      <div class="font-medium text-blue-800 text-sm">\${file.filename}</div>
                      <div class="text-xs text-gray-500">\${(file.size/1024).toFixed(1)}KB</div>
                    </div>
                  \`;
                });
                html += '</div>';
              });
              
              contentDiv.innerHTML = html;
              resultsDiv.classList.remove('hidden');
            } else {
              contentDiv.innerHTML = \`
                <h3 class="font-semibold mb-2">No orders found for \${year}</h3>
                <p class="text-gray-600">Try a different year.</p>
              \`;
              resultsDiv.classList.remove('hidden');
            }
          } catch (error) {
            alert('Error loading orders: ' + error.message);
          }
        }
        
        async function startAppeal(orderKey) {
          const filename = orderKey.split('/').pop();
          const court = orderKey.split('/')[0]?.replace('orders_', '');
          
          // Show selected order in chat column
          const chatDiv = document.getElementById('chat');
          chatDiv.innerHTML = \`
            <div class="bg-gray-100 p-3 rounded-lg mb-2">
              ✅ Selected: \${filename}
            </div>
            <div class="bg-blue-50 p-2 rounded-lg text-sm">
              Starting N161 appeal generation...
            </div>
          \`;
          
          try {
            await processRealOrder(orderKey, filename, court);
          } catch (error) {
            console.error('Failed to prepare order:', error);
            chatDiv.innerHTML += '<div class="bg-red-100 border border-red-400 text-red-800 p-3 rounded-lg mt-2">Unable to read court order: ' + (error && error.message ? error.message : error) + '</div>';
          }
        }
        
        async function processRealOrder(orderKey, filename, court) {
          // Store order key for later use
          window.currentOrderKey = orderKey;

          const parts = filename.split('%20');
          const fallbackDate = parts[0] || '';
          const fallbackJudge = parts[1] ? parts[1] + (parts[2] ? ' ' + parts[2] : '') : '';
          const fallbackCaseNum = parts[3] ? parts[3].replace('.pdf', '') : '';

          const partySelection = document.getElementById('party-selection');
          const partyCheckboxes = document.getElementById('party-checkboxes');
          const appellantInfo = document.getElementById('appellant-info');
          const contactDetails = document.getElementById('contact-details');

          if (partySelection && partyCheckboxes) {
            partySelection.classList.remove('hidden');
            partyCheckboxes.innerHTML = '<div class="text-sm text-gray-600">Reading court order and extracting parties...</div>';
          }

          let extraction;
          try {
            extraction = await extractPartiesFromOrder(orderKey);
          } catch (error) {
            if (partyCheckboxes) {
              partyCheckboxes.innerHTML = '<div class="text-sm text-red-700">Unable to extract parties automatically. Please enter them manually.</div>';
            }
            throw error;
          }

          const parties = extraction.parties || [];
          const contactMap = extraction.contactDetails || {};
          const caseDetails = extraction.caseDetails || {};

          window.currentParties = parties;
          window.currentContactDetails = contactMap;
          window.currentCaseDetails = caseDetails;

          if (partyCheckboxes) {
            partyCheckboxes.innerHTML = '';

            const roles = [
              { value: 'appellant', label: 'Appellant' },
              { value: 'respondent', label: 'Respondent' },
              { value: 'interested', label: 'Interested Party' },
              { value: 'none', label: 'Not Involved', extraClass: 'text-gray-500' }
            ];

            parties.forEach((party, index) => {
              const name = party && party.name ? party.name : 'Party ' + (index + 1);
              const wrapper = document.createElement('div');
              wrapper.className = 'border rounded-lg p-3 bg-white';
              if (party && party.id) {
                wrapper.dataset.partyId = party.id;
              }
              wrapper.dataset.partyName = name;

              const title = document.createElement('div');
              title.className = 'font-medium text-gray-800 mb-2';
              title.textContent = name;
              wrapper.appendChild(title);

              const options = document.createElement('div');
              options.className = 'flex flex-wrap gap-3';

              roles.forEach((role) => {
                const label = document.createElement('label');
                label.className = 'flex items-center';

                const input = document.createElement('input');
                input.type = 'radio';
                input.name = 'party-' + index;
                input.value = role.value;
                input.className = 'mr-2';

                const span = document.createElement('span');
                span.className = 'text-sm' + (role.extraClass ? ' ' + role.extraClass : '');
                span.textContent = role.label;

                label.appendChild(input);
                label.appendChild(span);
                options.appendChild(label);
              });

              wrapper.appendChild(options);
              partyCheckboxes.appendChild(wrapper);
            });

            if (parties.length === 0) {
              partyCheckboxes.innerHTML = '<div class="text-sm text-red-700">No parties detected in the order. Please enter them manually.</div>';
            }
          }

          preselectPartyRoles(parties);

          const defaultAppellant = parties.find(p => p && p.role && p.role.toLowerCase() === 'appellant');
          const defaultRespondent = parties.find(p => p && p.role && p.role.toLowerCase() === 'respondent');

          const normalize = (value) => (value && typeof value === 'string') ? value : '';

          const findContact = (party) => {
            if (!party) return null;
            if (party.id && contactMap[party.id]) {
              return contactMap[party.id];
            }
            const targetName = (party.name || '').toLowerCase();
            for (const key in contactMap) {
              const contact = contactMap[key];
              if (contact && contact.name && contact.name.toLowerCase() === targetName) {
                return contact;
              }
            }
            return null;
          };

          if (appellantInfo) {
            appellantInfo.classList.remove('hidden');
            const appellantNameEl = document.getElementById('appellant-name');
            if (appellantNameEl) {
              appellantNameEl.textContent = normalize(defaultAppellant?.name) || normalize(caseDetails.appellantName) || 'Appellant (to confirm)';
            }
            const caseNumberEl = document.getElementById('appellant-case');
            if (caseNumberEl) {
              caseNumberEl.textContent = normalize(caseDetails.caseNumber) || fallbackCaseNum || 'Unknown';
            }
            const orderDateEl = document.getElementById('appellant-date');
            if (orderDateEl) {
              const orderDate = normalize(caseDetails.orderDate) || fallbackDate;
              orderDateEl.textContent = orderDate ? orderDate.replace(/\./g, '/') : 'Unknown';
            }
            const judgeEl = document.getElementById('appellant-judge');
            if (judgeEl) {
              judgeEl.textContent = normalize(caseDetails.judge) || fallbackJudge || 'Unknown Judge';
            }
          }

          if (contactDetails) {
            contactDetails.classList.remove('hidden');

            const appellantContact = findContact(defaultAppellant);
            const appellantAddressEl = document.getElementById('appellant-address');
            if (appellantAddressEl) {
              appellantAddressEl.textContent = normalize(appellantContact?.address) || 'Address to be provided';
            }
            const appellantEmailEl = document.getElementById('appellant-email');
            if (appellantEmailEl) {
              appellantEmailEl.textContent = normalize(appellantContact?.email) || 'Email pending';
            }
            const appellantPhoneEl = document.getElementById('appellant-phone');
            if (appellantPhoneEl) {
              appellantPhoneEl.textContent = normalize(appellantContact?.phone) || 'Phone pending';
            }

            const respondentContact = findContact(defaultRespondent);
            const respondentAddressEl = document.getElementById('respondent-address');
            if (respondentAddressEl) {
              respondentAddressEl.textContent = normalize(respondentContact?.address) || 'Address to be provided';
            }
            const respondentEmailEl = document.getElementById('respondent-email');
            if (respondentEmailEl) {
              respondentEmailEl.textContent = normalize(respondentContact?.email) || 'Email pending';
            }

            const courtAddressEl = document.getElementById('court-address');
            if (courtAddressEl) {
              courtAddressEl.textContent = normalize(caseDetails.courtName) || (court ? court + ' court' : 'Court to confirm');
            }
            const courtEmailEl = document.getElementById('court-email');
            if (courtEmailEl) {
              courtEmailEl.textContent = normalize(caseDetails.courtEmail) || 'Not provided';
            }
          }

          // REMOVED: Call to fake startAgentProcessing function
          // The real orchestrator API call will handle all processing
        }

        // REMOVED: Entire startAgentProcessing function that was bypassing orchestrator
        /* function startAgentProcessing(orderKey, filename, court) {
          const sections = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
          let sectionTimers = {};
          let completedCount = 0;
          
          // Process each section with the agents
          sections.forEach((step, index) => {
            setTimeout(() => {
              // Start processing
              sectionTimers[step] = Date.now();
              
              const statusElement = document.getElementById(\`status-\${step}\`);
              if (statusElement) {
                statusElement.innerHTML = \`
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                    <span class="w-2 h-2 bg-orange-500 rounded-full mr-1 animate-pulse"></span>
                    Processing
                  </span>
                \`;
              }
              
              // Add agent logs - same as in testStreaming
              const chatDiv = document.getElementById('chat');
              const agentNames = [
                "Form Finder Agent",
                "Case Details Agent", 
                "Appeal Nature Agent",
                "Legal Representation Agent",
                "Permission Agent",
                "Order Details Agent",
                "Grounds Agent",
                "Skeleton Argument Agent",
                "Aarhus Convention Agent",
                "Relief Agent",
                "Applications Agent",
                "Evidence Agent",
                "Vulnerability Agent",
                "Documents List Agent",
                "Statement of Truth Agent",
                "Void Order Agent",
                "Document Generator Agent"
              ];
              
              const agentName = agentNames[step-1];
              console.log(\`\n========================================\`);
              console.log(\`🤖 \${agentName} STARTING\`);
              console.log(\`  Order: \${filename}\`);
              console.log(\`  Court: \${court}\`);
              console.log(\`========================================\`);
              
              // Detailed agent discussions for each section
              const agentDiscussions = {
                1: () => {
                  console.log('📄 Searching for N161 form template...');
                  console.log('✅ Found N161 template version 2024');
                  return \`
                    <div class="space-y-2">
                      <p>🔍 Searching for blank N161 form...</p>
                      <p class="text-green-600">✓ Found latest N161 template (v2024)</p>
                      <p>📝 Preparing form structure with 14 sections</p>
                    </div>
                  \`;
                },
                2: () => {
                  console.log(\`📖 Reading \${filename}...\`);
                  console.log('🔍 Extracting parties from PDF...');
                  return \`
                    <div class="space-y-2">
                      <p>📖 Reading court order: <strong>\${filename}</strong></p>
                      <p>🔍 Extracting parties from PDF...</p>
                      <div class="ml-4 text-sm">
                        <p>• Found: Claimant Ltd (Claimant)</p>
                        <p>• Found: Defendant 1</p>
                        <p>• Found: Defendant 2</p>
                      </div>
                      <p class="text-orange-600">⚠️ Please confirm party roles above</p>
                      <p>📂 Searching past N161s for contact details...</p>
                      <p class="text-green-600">✓ Found 12 previous applications with matching parties</p>
                    </div>
                  \`;
                },
                3: () => {
                  console.log('🔍 Analyzing appeal type...');
                  return \`
                    <div class="space-y-2">
                      <p>📋 Analyzing nature of appeal...</p>
                      <p>Reading order dated <strong>\${dateStr.replace(/\./g, '/')}</strong></p>
                      <div class="ml-4 text-sm">
                        <p>☑️ Procedural irregularity detected</p>
                        <p>☑️ Possible bias indicators found</p>
                        <p>☑️ Jurisdiction questions identified</p>
                      </div>
                      <p class="text-blue-700">Recommendation: Appeal on grounds of procedural error</p>
                    </div>
                  \`;
                },
                4: () => {
                  return \`
                    <div class="space-y-2">
                      <p>👤 Checking legal representation status...</p>
                      <p>No solicitor on record for appellant</p>
                      <p class="text-orange-600">⚠️ Marking as Litigant in Person (LiP)</p>
                      <p>Adding McKenzie friend provisions to form</p>
                    </div>
                  \`;
                },
                5: () => {
                  return \`
                    <div class="space-y-2">
                      <p>🔍 Checking permission to appeal...</p>
                      <p>Permission was <strong class="text-red-600">REFUSED</strong> by \${judge}</p>
                      <p>📝 Adding request for reconsideration</p>
                      <p>Including CPR 52.3 grounds for permission</p>
                    </div>
                  \`;
                },
                6: () => {
                  return \`
                    <div class="space-y-2">
                      <p>📋 Extracting order details...</p>
                      <div class="ml-4 text-sm">
                        <p>• Date: <strong>\${dateStr.replace(/\./g, '/')}</strong></p>
                        <p>• Judge: <strong>\${judge}</strong></p>
                        <p>• Case: <strong>\${caseNum}</strong></p>
                        <p>• Court: <strong>\${court}</strong></p>
                      </div>
                      <p>✓ All required details extracted</p>
                    </div>
                  \`;
                },
                7: () => {
                  return \`
                    <div class="space-y-2">
                      <p>⚖️ Identifying grounds for appeal...</p>
                      <p>📚 Consulting legal books database...</p>
                      <div class="ml-4 text-sm">
                        <p><strong>Ground 1:</strong> Procedural irregularity</p>
                        <p><strong>Ground 2:</strong> Wrong exercise of discretion</p>
                        <p><strong>Ground 3:</strong> Error of law</p>
                      </div>
                      <p>📖 Adding citations from Book 4: Void Ab Initio</p>
                    </div>
                  \`;
                },
                8: () => {
                  return \`
                    <div class="space-y-2">
                      <p>📝 Drafting skeleton argument...</p>
                      <p>Structure: 15 paragraphs across 3 main grounds</p>
                      <p>📚 References added from:</p>
                      <div class="ml-4 text-sm">
                        <p>• Book 3: Domestic Law (5 citations)</p>
                        <p>• Book 4: Void Ab Initio (3 citations)</p>
                        <p>• CPR Part 52 provisions</p>
                      </div>
                      <p class="text-green-600">✓ Skeleton complete: 2,500 words</p>
                    </div>
                  \`;
                },
                9: () => {
                  return \`
                    <div class="space-y-2">
                      <p>🌍 Checking for environmental aspects...</p>
                      <p>Scanning order for environmental keywords...</p>
                      <p class="text-gray-500">❌ No environmental issues found</p>
                      <p>Aarhus Convention: <strong>Not Applicable</strong></p>
                      <p>Skipping Section 8 of N161</p>
                    </div>
                  \`;
                },
                10: () => {
                  return \`
                    <div class="space-y-2">
                      <p>📋 Determining relief sought...</p>
                      <div class="ml-4 text-sm">
                        <p>☑️ Set aside the order</p>
                        <p>☑️ Remit for rehearing</p>
                        <p>☑️ Alternative: Vary order</p>
                        <p>☑️ Costs of appeal</p>
                      </div>
                      <p>Adding standard relief paragraph to N161</p>
                    </div>
                  \`;
                },
                11: () => {
                  return \`
                    <div class="space-y-2">
                      <p>📝 Checking for other applications...</p>
                      <p>Stay of execution: <span class="text-gray-500">Not required</span></p>
                      <p>Interim relief: <span class="text-gray-500">Not required</span></p>
                      <p>Expedition: <span class="text-gray-500">Not requested</span></p>
                      <p>✓ No additional applications needed</p>
                    </div>
                  \`;
                },
                12: () => {
                  return \`
                    <div class="space-y-2">
                      <p>📚 Compiling evidence bundle...</p>
                      <div class="ml-4 text-sm">
                        <p>1. Court order (\${filename})</p>
                        <p>2. Previous orders (3 documents)</p>
                        <p>3. Correspondence (5 emails)</p>
                        <p>4. Witness statement (draft)</p>
                      </div>
                      <p>Total bundle: <strong>9 documents</strong></p>
                    </div>
                  \`;
                },
                13: () => {
                  return \`
                    <div class="space-y-2">
                      <p>♿ Checking vulnerability factors...</p>
                      <p>Scanning appellant details...</p>
                      <div class="ml-4 text-sm">
                        <p>• Physical disability: No</p>
                        <p>• Mental health: No</p>
                        <p>• Language needs: No</p>
                        <p>• Age vulnerability: No</p>
                      </div>
                      <p>✓ No special measures required</p>
                    </div>
                  \`;
                },
                14: () => {
                  return \`
                    <div class="space-y-2">
                      <p>📋 Creating documents list...</p>
                      <ol class="ml-4 text-sm list-decimal">
                        <li>N161 Appeal Notice</li>
                        <li>Skeleton Argument</li>
                        <li>Court Order (\${dateStr})</li>
                        <li>Grounds of Appeal</li>
                        <li>Evidence Bundle</li>
                      </ol>
                      <p>✓ All documents listed</p>
                    </div>
                  \`;
                },
                15: () => {
                  return \`
                    <div class="space-y-2">
                      <p>✍️ Preparing statement of truth...</p>
                      <p>Appellant: <strong>[Name from party selection]</strong></p>
                      <p>Date: <strong>\${new Date().toLocaleDateString()}</strong></p>
                      <p class="text-orange-600">⚠️ Please verify all details are correct</p>
                      <p>Adding signature block to N161</p>
                    </div>
                  \`;
                },
                16: () => {
                  return \`
                    <div class="space-y-2">
                      <p>🔍 Analyzing for void order indicators...</p>
                      <p>📚 Checking Book 4: Void Ab Initio...</p>
                      <div class="ml-4 text-sm">
                        <p>☑️ Jurisdiction issues: Possible</p>
                        <p>☑️ Natural justice breach: Detected</p>
                        <p>☑️ Ultra vires: Checking...</p>
                      </div>
                      <p class="text-blue-700">💡 Consider void ab initio argument</p>
                    </div>
                  \`;
                },
                17: () => {
                  return \`
                    <div class="space-y-2">
                      <p>📦 Generating final document bundle...</p>
                      <p>Creating PDF package...</p>
                      <div class="ml-4 text-sm">
                        <p>• N161 form: 14 pages</p>
                        <p>• Skeleton: 8 pages</p>
                        <p>• Evidence: 25 pages</p>
                      </div>
                      <p class="text-green-600">✓ Bundle complete: 47 pages total</p>
                      <p>📄 Saving to R2 storage...</p>
                    </div>
                  \`;
                }
              };
              
              const agentMessage = agentDiscussions[step] ? agentDiscussions[step]() : \`<p>Processing section \${step}...</p>\`;
              
              if (chatDiv) {
                // Clear previous agent message and show only current one
                chatDiv.innerHTML = \`
                  <div class="bg-orange-50 p-3 rounded-lg text-sm border-l-4 border-orange-500">
                    <div class="font-bold text-orange-800">\${agentName}</div>
                    <div class="text-gray-700 mt-1">\${agentMessage}</div>
                  </div>
                \`;
              }
              
              // Complete after processing time
              const processingTime = 3000 + Math.random() * 4000;
              setTimeout(() => {
                const sectionDuration = Math.floor((Date.now() - sectionTimers[step]) / 1000);
                
                // Update status to completed
                if (statusElement) {
                  statusElement.innerHTML = \`
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-900">
                      <span class="text-blue-700 mr-1">✓</span>
                      Completed
                    </span>
                  \`;
                }
                
                // Update duration
                const timeElement = document.getElementById(\`time-\${step}\`);
                if (timeElement) {
                  timeElement.textContent = \`\${sectionDuration}s\`;
                  timeElement.className = 'text-blue-900 text-xs font-medium text-right';
                }
                
                // Show completion
                completedCount++;
                if (completedCount === sections.length) {
                  const completionDiv = document.getElementById('completion-message');
                  const downloadLink = document.getElementById('form-download-link');
                  if (completionDiv && downloadLink) {
                    // Generate form URL
                    currentN161Url = \`/api/forms/n161/\${filename.replace('.pdf', '')}_N161.pdf\`;
                    downloadLink.href = currentN161Url;
                    completionDiv.classList.remove('hidden');
                    
                    // Add completion message to chat
                    const chatDiv = document.getElementById('chat');
                    if (chatDiv) {
                      const completionMsg = document.createElement('div');
                      completionMsg.className = 'bg-green-50 p-3 rounded-lg text-sm border-l-4 border-green-500 font-semibold';
                      completionMsg.innerHTML = \`
                        <div class="text-green-800">✅ N161 Appeal Form Complete!</div>
                        <div class="text-gray-600 text-xs mt-1">Use the buttons above to preview or download your form.</div>
                      \`;
                      chatDiv.appendChild(completionMsg);
                      chatDiv.scrollTop = chatDiv.scrollHeight;
                    }
                  }
                }
              }, processingTime);
              
            }, index * 1500); // Start each section 1.5s apart
          });
        } */
        
        // All processing now handled by real backend orchestrator
        
        function unusedTestStreaming() {
          // First show party selection with mock data
          const partySelection = document.getElementById('party-selection');
          const appellantSelect = document.getElementById('appellant-select');
          const interestedParties = document.getElementById('interested-parties');
          
          if (partySelection && appellantSelect && interestedParties) {
            partySelection.classList.remove('hidden');
            
            // Populate appellant dropdown
            appellantSelect.innerHTML = \`
              <option value="roman-house" selected>Roman House</option>
              <option value="defendant-1">Defendant 1</option>
              <option value="defendant-2">Defendant 2</option>
            \`;
            
            // Populate respondents
            const respondentSelect = document.getElementById('respondent-select');
            if (respondentSelect) {
              respondentSelect.innerHTML = \`
                <option value="claimant" selected>Claimant Ltd</option>
                <option value="defendant-1">Defendant 1</option>
                <option value="defendant-2">Defendant 2</option>
              \`;
            }
            
            // Populate interested parties
            interestedParties.innerHTML = \`
              <option value="court" selected>The Court</option>
              <option value="defendant-2">Defendant 2</option>
            \`;
          }
          
          // Show appellant info and contact details after 1 second
          setTimeout(() => {
            const appellantDiv = document.getElementById('appellant-info');
            const appellantName = document.getElementById('appellant-name');
            const appellantCase = document.getElementById('appellant-case');
            const appellantDate = document.getElementById('appellant-date');
            const appellantJudge = document.getElementById('appellant-judge');
            
            if (appellantDiv) {
              appellantDiv.classList.remove('hidden');
              appellantName.textContent = 'Roman House';
              appellantCase.textContent = 'B00CF619';
              appellantDate.textContent = '3 September 2025';
              appellantJudge.textContent = 'HHJ Smith';
            }
            
            // Show contact details (retrieved from past N161 applications)
            const contactDetails = document.getElementById('contact-details');
            if (contactDetails) {
              contactDetails.classList.remove('hidden');
              
              // Add loading indicator
              document.getElementById('appellant-address').innerHTML = '<span class="text-gray-400">Loading from past N161s...</span>';
              
              // Simulate retrieving from APPEALS database
              setTimeout(() => {
                document.getElementById('appellant-address').textContent = '[Address from past N161 applications]';
                document.getElementById('appellant-email').textContent = '[Email from past N161 applications]';
                document.getElementById('appellant-phone').textContent = '[Phone from past N161 applications]';
                document.getElementById('respondent-address').textContent = '[Retrieved from court records]';
                document.getElementById('respondent-email').textContent = '[Retrieved from court records]';
                document.getElementById('court-address').textContent = 'Central London County Court';
                document.getElementById('court-email').textContent = '[Court email from database]';
              }, 500);
            }
          }, 1000);
          
          // The real orchestrator API call above will handle all UI updates via streaming
        }
        
        document.getElementById('chat-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const message = document.getElementById('message').value;
          if (!message) return;
          
          const chatDiv = document.getElementById('chat');
          chatDiv.innerHTML += \`<div class="bg-gray-100 p-3 rounded-lg ml-8">\${message}</div>\`;
          document.getElementById('message').value = '';
          
          try {
            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message, sessionId })
            });
            
            const data = await response.json();
            chatDiv.innerHTML += \`<div class="bg-blue-50 p-3 rounded-lg">\${data.response}</div>\`;
            
            // If this looks like appeal generation, show in column 2
            if (data.response.includes('✅ Perfect!') || data.response.includes('appeal')) {
              const appealDiv = document.getElementById('appeal-content');
              appealDiv.innerHTML = \`
                <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 class="font-bold mb-2">🎯 Appeal Status</h3>
                  <div class="prose prose-sm">\${data.response.replace(/\\n/g, '<br>')}</div>
                </div>
              \`;
            }
            
            if (data.documents) {
              const appealDiv = document.getElementById('appeal-content');
              appealDiv.innerHTML += \`
                <div class="bg-green-100 p-4 rounded-lg border border-green-300 mt-4">
                  <h3 class="font-semibold mb-2">📄 Your Documents Are Ready:</h3>
                  <div class="space-y-2">
                    \${data.documents.map(doc => 
                      \`<a href="\${doc.url}" class="block text-green-700 hover:underline font-medium">📄 \${doc.name}</a>\`
                    ).join('')}
                  </div>
                </div>
              \`;
            }
          } catch (error) {
            chatDiv.innerHTML += \`<div class="bg-red-50 p-3 rounded-lg">I encountered an error: \${error.message}. Please try again.</div>\`;
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Orders search endpoint
app.get('/api/orders/search', async (c) => {
  const handler = createOrderSearchHandler(c.env);
  return handler(c.req.raw);
});

// Extract parties from order endpoint
app.post('/api/orders/extract-parties', async (c) => {
  try {
    const { orderKey } = await c.req.json();
    
    // For now, return mock party data
    // TODO: Implement real party extraction from PDF
    const response = {
      success: true,
      parties: [
        { id: '1', name: 'Ms Roslyn Scott', role: 'appellant' },
        { id: '2', name: 'MobiCycle OU', role: 'appellant' },
        { id: '3', name: 'Mr Yiqun Liu', role: 'respondent' },
        { id: '4', name: 'HMCTS (CCCL - Business & Property Work List)', role: 'court' }
      ],
      contactDetails: {
        '1': {
          name: 'Ms Roslyn Scott',
          address: 'Apartment 13, Roman House, Wood Street, London EC2Y 5AG',
          email: 'roslyn.scott@romanhouse.org',
          phone: '+44 20 1234 5678'
        },
        '2': {
          name: 'MobiCycle OU', 
          address: 'Digital Business Center, Estonia',
          email: 'legal@mobicycle.com',
          phone: '+372 123 4567'
        },
        '3': {
          name: 'Mr Yiqun Liu',
          address: 'Address to be provided',
          email: 'yiqun.liu@example.com',
          phone: '+44 20 8765 4321'
        },
        '4': {
          name: 'HMCTS (CCCL - Business & Property Work List)',
          address: 'County Court at Central London, Thomas More Building, Royal Courts of Justice, Strand, London WC2A 2LL',
          email: 'centralcountycourt@justice.gov.uk',
          phone: '+44 20 7947 6000'
        }
      },
      caseDetails: {
        caseNumber: orderKey.includes('K10CL521') ? 'K10CL521' : 'AC-2025-LON-002606',
        judge: orderKey.includes('Gerald') ? 'HHJ Gerald' : 'Judge Kinnier',
        orderDate: new Date().toISOString().split('T')[0],
        court: 'County Court at Central London'
      }
    };

    return c.json(response);
  } catch (error: any) {
    return c.json({ 
      success: false,
      error: error.message 
    }, 500);
  }
});

// SSE endpoint for N161 form generation with real-time updates
app.post('/api/n161/generate', async (c) => {
  try {
    const { orderKey } = await c.req.json();
    
    // Set up SSE response
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();
    
    // Send SSE headers
    const response = new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
    // Run orchestrator with SSE updates
    (async () => {
      try {
        const orchestrator = new N161Orchestrator(c.env, (msg) => {
          // Send each update to frontend via SSE
          console.log(`[Orchestrator] ${msg}`);
          writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'update', message: msg })}\n\n`));
        });
        
        const result = await orchestrator.executeFullProcess(orderKey);
        
        // Send completion event
        writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'complete', result })}\n\n`));
      } catch (error: any) {
        writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`));
      } finally {
        writer.close();
      }
    })();
    
    return response;
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default app;
