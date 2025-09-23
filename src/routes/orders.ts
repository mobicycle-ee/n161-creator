import { Hono } from 'hono';
import type { Env, Order } from '../types';

export const ordersRoutes = new Hono<{ Bindings: Env }>();

ordersRoutes.get('/search', async (c) => {
  const query = c.req.query('q');
  const caseNumber = c.req.query('caseNumber');
  
  if (!query && !caseNumber) {
    return c.json({
      success: false,
      error: 'Please provide a search query or case number'
    }, 400);
  }

  try {
    let orders: Order[] = [];
    
    if (caseNumber) {
      const order = await c.env.ORDERS.get(caseNumber, 'json') as Order;
      if (order) orders.push(order);
    } else {
      const list = await c.env.ORDERS.list({ prefix: query });
      for (const key of list.keys) {
        const order = await c.env.ORDERS.get(key.name, 'json') as Order;
        if (order) orders.push(order);
      }
    }
    
    return c.json({
      success: true,
      orders,
      count: orders.length
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to search orders'
    }, 500);
  }
});

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