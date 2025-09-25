const { serve } = require('bun');
const { readdir, stat } = require('fs/promises');
const { join } = require('path');

// Configure your PDF directory path here
const PDF_DIRECTORY = '/Users/mobicycle/Library/Mobile Documents/com~apple~CloudDocs/0._Legal/Roman_House/applications_N161_N16a_N244_N461_N463/N161_appeal'; // Your N161 PDFs location

serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    
    // CORS headers for worker access
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    // List all PDFs
    if (url.pathname === '/list') {
      try {
        const files = await readdir(PDF_DIRECTORY);
        const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
        
        const fileDetails = await Promise.all(
          pdfFiles.map(async (file) => {
            const stats = await stat(join(PDF_DIRECTORY, file));
            return {
              name: file,
              size: stats.size,
              modified: stats.mtime,
            };
          })
        );

        return new Response(JSON.stringify(fileDetails), {
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get specific PDF
    if (url.pathname.startsWith('/pdf/')) {
      const filename = url.pathname.slice(5);
      const filepath = join(PDF_DIRECTORY, filename);
      
      try {
        const file = Bun.file(filepath);
        if (await file.exists()) {
          return new Response(file, {
            headers: {
              ...headers,
              'Content-Type': 'application/pdf',
              'Content-Disposition': `inline; filename="${filename}"`,
            },
          });
        }
        return new Response('PDF not found', { status: 404, headers });
      } catch (error) {
        return new Response(error.message, { status: 500, headers });
      }
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response('OK', { headers });
    }

    return new Response('PDF Server\n\nEndpoints:\n/list - List all PDFs\n/pdf/{filename} - Get specific PDF\n/health - Health check', {
      headers: { ...headers, 'Content-Type': 'text/plain' },
    });
  },
});

console.log('PDF Server running on http://localhost:3000');
console.log('PDF Directory:', PDF_DIRECTORY);