import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { AIService } from './services/aiService';
import { ordersRoutes } from './routes/orders';
import { chatRoutes } from './routes/chat';

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors());

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>N161 Appeal Creator AI</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-50">
      <div class="max-w-4xl mx-auto p-6">
        <h1 class="text-3xl font-bold mb-6">N161 Appeal Creator AI</h1>
        <div class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-semibold mb-4">Start Your Appeal</h2>
          <div id="chat" class="space-y-4">
            <div class="bg-blue-50 p-4 rounded">
              <p>Hello! I'm your AI assistant for creating N161 appeals. To begin, please provide:</p>
              <ul class="list-disc ml-5 mt-2">
                <li>Your case number or order reference</li>
                <li>The date of the order you want to appeal</li>
                <li>A brief description of why you want to appeal</li>
              </ul>
            </div>
          </div>
          <form id="chat-form" class="mt-6">
            <textarea 
              id="message" 
              class="w-full p-3 border rounded-lg" 
              rows="3" 
              placeholder="Type your message here..."></textarea>
            <button 
              type="submit" 
              class="mt-3 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Send
            </button>
          </form>
        </div>
      </div>
      <script>
        const form = document.getElementById('chat-form');
        const chatDiv = document.getElementById('chat');
        const messageInput = document.getElementById('message');
        
        let sessionId = crypto.randomUUID();
        
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const message = messageInput.value;
          if (!message) return;
          
          // Add user message
          chatDiv.innerHTML += \`<div class="bg-gray-100 p-3 rounded ml-12">\${message}</div>\`;
          messageInput.value = '';
          
          // Send to API
          try {
            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message, sessionId })
            });
            
            const data = await response.json();
            
            // Add AI response
            chatDiv.innerHTML += \`<div class="bg-blue-50 p-3 rounded mr-12">\${data.response}</div>\`;
            
            // Show download links if documents are ready
            if (data.documents) {
              chatDiv.innerHTML += \`
                <div class="bg-green-50 p-4 rounded border border-green-200">
                  <h3 class="font-semibold mb-2">Your documents are ready:</h3>
                  <div class="space-y-2">
                    \${data.documents.map(doc => 
                      \`<a href="\${doc.url}" class="block text-blue-600 hover:underline">📄 \${doc.name}</a>\`
                    ).join('')}
                  </div>
                </div>\`;
            }
          } catch (error) {
            chatDiv.innerHTML += \`<div class="bg-red-50 p-3 rounded">Error: \${error.message}</div>\`;
          }
          
          chatDiv.scrollTop = chatDiv.scrollHeight;
        });
      </script>
    </body>
    </html>
  `);
});

app.route('/api/orders', ordersRoutes);
app.route('/api/chat', chatRoutes);

export default app;