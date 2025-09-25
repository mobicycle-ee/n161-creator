import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { AIService } from './services/aiService';
import { authMiddleware } from './middleware/auth';
import { ordersRoutes } from './routes/orders';
import { chatRoutes } from './routes/chat';
import { agentRoutes } from './routes/agents';

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors());
app.use('/*', authMiddleware);

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>N161 Appeal Creator</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-50 min-h-screen">
      <div class="max-w-7xl mx-auto p-6">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <!-- Column 1: Selection & Chat -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h1 class="text-2xl font-bold text-blue-600 mb-2">⚖️ N161 Appeal Creator</h1>
            <p class="text-gray-600 mb-6">Find your court order and create an appeal</p>
            
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
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                <div id="results-content"></div>
              </div>
            </div>
            
            <div class="text-center text-gray-500 mb-4">— or —</div>
            
            <div class="mb-4">
              <p class="font-medium mb-2">💬 Chat with AI</p>
              <form id="chat-form">
                <div class="flex gap-2">
                  <input type="text" id="message" 
                         class="flex-1 p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none" 
                         placeholder="e.g., 3 September 2025">
                  <button type="submit" 
                          class="bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700">
                    Send
                  </button>
                </div>
              </form>
            </div>
            
            <div id="chat" class="space-y-3 max-h-96 overflow-y-auto">
              <div class="bg-blue-50 p-3 rounded-lg text-sm">
                <p class="text-gray-600">Select an order above or tell me the date to get started.</p>
              </div>
            </div>
          </div>
          
          <!-- Column 2: Appeal Generation Results -->
          <div class="bg-white rounded-xl shadow-lg p-6">
            <h2 class="text-2xl font-bold text-green-600 mb-2">📄 Appeal Generation</h2>
            <div id="appeal-content" class="text-gray-500">
              <div class="text-center py-8">
                <div class="text-4xl mb-4">⚖️</div>
                <p>Select a court order to begin generating your N161 appeal</p>
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
      <script>
        let sessionId = crypto.randomUUID();
        
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
        
        function startAppeal(orderKey) {
          const filename = orderKey.split('/').pop();
          const court = orderKey.split('/')[0]?.replace('orders_', '');
          
          // Show selected order in chat column
          const chatDiv = document.getElementById('chat');
          chatDiv.innerHTML += \`
            <div class="bg-gray-100 p-3 rounded-lg">
              ✅ Selected: \${filename}
            </div>
          \`;
          
          // Show appeal generation in column 2
          const appealDiv = document.getElementById('appeal-content');
          appealDiv.innerHTML = \`
            <div class="border-l-4 border-green-500 pl-4 mb-6">
              <h3 class="font-bold text-lg mb-2">Selected Order</h3>
              <p class="font-medium">\${filename}</p>
              <p class="text-sm text-gray-600">Court: \${court}</p>
            </div>
            <div class="bg-blue-50 p-4 rounded-lg mb-4">
              <div class="animate-pulse">🤖 Analyzing order for appeal grounds...</div>
            </div>
          \`;
          
          // Start chat session with this order
          fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              message: \`I want to appeal the order: \${orderKey}\`, 
              sessionId 
            })
          }).then(response => response.json())
            .then(data => {
              // Show N161 generation progress
              if (data.response.includes('Starting N161 appeal generation')) {
                showN161Progress(appealDiv, filename);
              } else {
                appealDiv.innerHTML += \`
                  <div class="bg-white border rounded-lg p-4">
                    <h3 class="font-bold mb-2">📋 Next Steps</h3>
                    <div class="prose prose-sm">\${data.response.replace(/\\n/g, '<br>')}</div>
                  </div>
                \`;
              }
            });
        }
        
        function showN161Progress(appealDiv, filename) {
          const sections = [
            { name: 'Finding blank N161 form', icon: '🔍' },
            { name: 'Section 1: Case Details and Parties', icon: '📝' },
            { name: 'Section 2: Nature of Appeal', icon: '📝' },
            { name: 'Section 3: Legal Representation', icon: '📝' },
            { name: 'Section 4: Permission to Appeal', icon: '📝' },
            { name: 'Section 5: Details of Order Being Appealed', icon: '📝' },
            { name: 'Section 6: Grounds of Appeal', icon: '📝' },
            { name: 'Section 7: Skeleton Argument', icon: '📝' },
            { name: 'Section 8: Aarhus Convention Claims', icon: '📝' },
            { name: 'Section 9: Relief Sought', icon: '📝' },
            { name: 'Section 10: Other Applications', icon: '📝' },
            { name: 'Section 11: Evidence and Supporting Documents', icon: '📝' },
            { name: 'Section 13: Supporting Documents List', icon: '📝' },
            { name: 'Section 14: Statement of Truth', icon: '📝' },
            { name: 'Analyzing for void order potential', icon: '🔍' },
            { name: 'Generating supporting documents', icon: '📄' }
          ];
          
          appealDiv.innerHTML = \`
            <div class="border-l-4 border-blue-500 pl-4 mb-6">
              <h3 class="font-bold text-lg mb-2">N161 Generation Progress</h3>
              <p class="font-medium">\${filename}</p>
            </div>
            <div id="progress-container" class="space-y-2">
            </div>
          \`;
          
          const progressContainer = document.getElementById('progress-container');
          
          // Show progress steps one by one
          sections.forEach((section, index) => {
            setTimeout(() => {
              const stepDiv = document.createElement('div');
              stepDiv.className = 'flex items-center space-x-3 p-2 bg-green-50 border border-green-200 rounded animate-pulse';
              stepDiv.innerHTML = \`
                <span class="text-lg">\${section.icon}</span>
                <span class="text-sm font-medium">\${section.name}...</span>
                <span class="ml-auto text-green-600 text-xs">✓ Complete</span>
              \`;
              progressContainer.appendChild(stepDiv);
              
              // Remove animation after a moment
              setTimeout(() => {
                stepDiv.classList.remove('animate-pulse');
                stepDiv.classList.add('bg-green-100');
              }, 800);
              
            }, index * 400); // 400ms delay between each step
          });
          
          // Show completion message after all steps
          setTimeout(() => {
            appealDiv.innerHTML += \`
              <div class="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
                <h3 class="font-bold text-blue-800 mb-2">✅ N161 Appeal Generation Complete!</h3>
                <p class="text-sm text-blue-700">Please provide your appellant details to finalize the form:</p>
                <div class="mt-2 space-y-1 text-sm">
                  <div>📋 <strong>Your Name:</strong></div>
                  <div>📍 <strong>Your Address:</strong></div>
                  <div>📞 <strong>Phone Number:</strong></div>
                  <div>✉️ <strong>Email Address:</strong></div>
                </div>
              </div>
            \`;
          }, sections.length * 400 + 1000);
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

app.route('/api/orders', ordersRoutes);
app.route('/api/chat', chatRoutes);
app.route('/api/agents', agentRoutes);

export default app;