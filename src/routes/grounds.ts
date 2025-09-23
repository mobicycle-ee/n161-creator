import { Hono } from 'hono';
import { z } from 'zod';

const groundsSchema = z.object({
  caseNumber: z.string(),
  grounds: z.array(z.object({
    number: z.number(),
    title: z.string(),
    description: z.string(),
    legalBasis: z.string(),
    evidence: z.array(z.string()).optional(),
  })),
});

export const groundsRoutes = new Hono();

groundsRoutes.post('/generate', async (c) => {
  try {
    const body = await c.req.json();
    const validated = groundsSchema.parse(body);
    
    const document = generateGroundsDocument(validated);
    
    return c.json({
      success: true,
      data: document,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate grounds'
    }, 400);
  }
});

function generateGroundsDocument(data: z.infer<typeof groundsSchema>) {
  const sections = data.grounds.map((ground, index) => ({
    section: `Ground ${ground.number}`,
    title: ground.title,
    content: `
      ${ground.description}
      
      Legal Basis:
      ${ground.legalBasis}
      
      ${ground.evidence ? `Supporting Evidence:\n${ground.evidence.map(e => `- ${e}`).join('\n')}` : ''}
    `.trim()
  }));
  
  return {
    title: `Grounds of Appeal - Case ${data.caseNumber}`,
    sections,
    generated: new Date().toISOString(),
  };
}