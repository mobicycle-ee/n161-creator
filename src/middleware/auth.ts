import { Context, Next } from 'hono';
import type { Env } from '../types';

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  // Simple authentication - you should change this password!
  const AUTH_PASSWORD = 'romanhouse2024'; // CHANGE THIS!
  
  const authHeader = c.req.header('Authorization');
  
  // Allow public access to health check
  if (c.req.path === '/health') {
    return next();
  }
  
  // Check for password in query params (for easy browser access)
  const url = new URL(c.req.url);
  const password = url.searchParams.get('password');
  
  if (password === AUTH_PASSWORD) {
    return next();
  }
  
  // Check for Basic Auth
  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ');
    if (scheme === 'Basic') {
      const decoded = atob(encoded);
      const [user, pass] = decoded.split(':');
      if (pass === AUTH_PASSWORD) {
        return next();
      }
    }
  }
  
  // Return 401 Unauthorized
  return c.text('Unauthorized - Please provide password', 401, {
    'WWW-Authenticate': 'Basic realm="N161 Creator"'
  });
}