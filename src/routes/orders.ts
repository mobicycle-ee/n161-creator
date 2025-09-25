import { Hono } from 'hono';
import type { Env, Order } from '../types';

export const ordersRoutes = new Hono<{ Bindings: Env }>();

// Debug endpoint to check R2 bucket contents
ordersRoutes.get('/debug', async (c) => {
  try {
    const list = await c.env.ORDERS.list({ limit: 10 });
    return c.json({
      success: true,
      totalObjects: list.objects?.length || 0,
      truncated: list.truncated,
      objects: list.objects?.map(obj => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded
      })) || []
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

ordersRoutes.get('/search', async (c) => {
  const query = c.req.query('q');
  const year = c.req.query('year');
  
  if (!query) {
    return c.json({
      success: false,
      error: 'Please provide a date (e.g., "3 september 2025" or "2025.09.03") and optionally a year'
    }, 400);
  }

  try {
    let matchingFiles: any[] = [];
    
    // Parse the date from query
    const dateVariations = parseDate(query, year);
    
    // Search through all PDF files in R2
    const list = await c.env.ORDERS.list();
    
    for (const object of list.objects) {
      if (object.key.endsWith('.pdf')) {
        // Check if filename matches any date variation
        const matches = dateVariations.some(date => 
          object.key.toLowerCase().includes(date.toLowerCase())
        );
        
        if (matches) {
          matchingFiles.push({
            key: object.key,
            size: object.size,
            uploaded: object.uploaded,
            filename: object.key.split('/').pop(),
            court: object.key.split('/')[0]?.replace('orders_', '')
          });
        }
      }
    }
    
    return c.json({
      success: true,
      files: matchingFiles,
      count: matchingFiles.length,
      searchedFor: query,
      dateVariations
    });
  } catch (error) {
    console.error('Search error:', error);
    return c.json({
      success: false,
      error: `Failed to search orders: ${error.message}`
    }, 500);
  }
});

function parseDate(input: string, year?: string): string[] {
  const variations: string[] = [];
  
  const monthNames = {
    january: '01', february: '02', march: '03', april: '04',
    may: '05', june: '06', july: '07', august: '08',
    september: '09', october: '10', november: '11', december: '12',
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  
  const words = input.toLowerCase().split(/\s+/);
  let day, month, yearPart;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (/^\d{1,2}$/.test(word) && !day) {
      day = word.padStart(2, '0');
    } else if (monthNames[word] && !month) {
      month = monthNames[word];
    } else if (/^\d{4}$/.test(word) && !yearPart) {
      yearPart = word;
    }
    // Check for partial month matches
    else if (!month) {
      for (const [monthName, monthNum] of Object.entries(monthNames)) {
        if (monthName.startsWith(word) || word.includes(monthName.substring(0, 3))) {
          month = monthNum;
          break;
        }
      }
    }
  }
  
  if (!yearPart && year) {
    yearPart = year;
  } else if (!yearPart) {
    yearPart = new Date().getFullYear().toString();
  }
  
  if (day && month && yearPart) {
    // Primary format used in your files
    variations.push(`${yearPart}.${month}.${day}`);
    // Alternative formats
    variations.push(`${yearPart}-${month}-${day}`);
    variations.push(`${day}.${month}.${yearPart}`);
    variations.push(`${day}-${month}-${yearPart}`);
  }
  
  // For year-only searches, just add the year
  if (yearPart && !day && !month) {
    variations.push(yearPart);
  }
  
  // Also add raw input for fallback
  variations.push(input);
  return variations;
}

ordersRoutes.get('/:orderId', async (c) => {
  const orderId = c.req.param('orderId');
  
  try {
    const order = await c.env.ORDERS.get(orderId, 'json') as Order;
    
    if (!order) {
      return c.json({
        success: false,
        error: 'Order not found'
      }, 404);
    }
    
    return c.json({
      success: true,
      order
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to retrieve order'
    }, 500);
  }
});

ordersRoutes.post('/:orderId/start-appeal', async (c) => {
  const orderId = c.req.param('orderId');
  
  try {
    const order = await c.env.ORDERS.get(orderId, 'json') as Order;
    
    if (!order) {
      return c.json({
        success: false,
        error: 'Order not found'
      }, 404);
    }
    
    const appealId = `appeal_${orderId}_${Date.now()}`;
    const appeal = {
      id: appealId,
      orderId,
      caseNumber: order.caseNumber,
      status: 'draft',
      createdAt: new Date().toISOString(),
      order
    };
    
    await c.env.APPEALS.put(appealId, JSON.stringify(appeal));
    
    return c.json({
      success: true,
      appealId,
      message: 'Appeal draft created. Please provide appellant details and grounds of appeal.',
      nextSteps: [
        'Provide appellant information',
        'Specify grounds of appeal',
        'Generate N161 form',
        'Create supporting documents'
      ]
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to start appeal'
    }, 500);
  }
});