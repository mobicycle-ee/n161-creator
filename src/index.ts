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
      <div class="max-w-2xl mx-auto p-6">
        <div class="bg-white rounded-xl shadow-lg p-8">
          <h1 class="text-3xl font-bold text-blue-600 mb-2">⚖️ N161 Appeal Creator</h1>
          <p class="text-gray-600 mb-8">Find your court order and create a professional appeal</p>
          
          <div class="mb-8">
            <h2 class="text-lg font-semibold mb-4">📅 Browse Court Orders by Year</h2>
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">Select Year</label>
              <select id="year" onchange="loadOrdersForYear()" class="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-lg">
                <option value="">Choose a year to see all orders...</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
                <option value="2020">2020</option>
                <option value="2019">2019</option>
              </select>
            </div>
          </div>
          
          <div id="results" class="mb-8 hidden">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div id="results-content"></div>
            </div>
          </div>
          
          <div class="text-center text-gray-500 mb-6">— or —</div>
          
          <div id="chat" class="space-y-4 mb-6">
            <div class="bg-blue-50 p-4 rounded-lg">
              <p class="font-medium mb-2">💬 Chat with AI Assistant</p>
              <p class="text-sm text-gray-600">Just tell me the date of your order (e.g., "3 September 2025") and I'll help you create your appeal.</p>
            </div>
          </div>
          
          <form id="chat-form">
            <div class="flex gap-3">
              <input type="text" id="message" 
                     class="flex-1 p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-lg" 
                     placeholder="e.g., 3 September 2025">
              <button type="submit" 
                      class="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">
                Send
              </button>
            </div>
          </form>
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
          const chatDiv = document.getElementById('chat');
          chatDiv.innerHTML += \`
            <div class="bg-gray-100 p-3 rounded-lg ml-8">
              Selected order: \${orderKey.split('/').pop()}
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
              chatDiv.innerHTML += \`
                <div class="bg-blue-50 p-3 rounded-lg mr-8">
                  \${data.response}
                </div>
              \`;
            });
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
            chatDiv.innerHTML += \`<div class="bg-blue-50 p-3 rounded-lg mr-8">\${data.response}</div>\`;
            
            if (data.documents) {
              chatDiv.innerHTML += \`
                <div class="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 class="font-semibold mb-2">Your documents are ready:</h3>
                  <div class="space-y-2">
                    \${data.documents.map(doc => 
                      \`<a href="\${doc.url}" class="block text-blue-600 hover:underline">📄 \${doc.name}</a>\`
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