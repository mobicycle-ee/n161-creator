import { Hono } from 'hono';
import { z } from 'zod';

const evidenceSchema = z.object({
  caseNumber: z.string(),
  items: z.array(z.object({
    exhibit: z.string(),
    description: z.string(),
    relevance: z.string(),
    source: z.string(),
    dateObtained: z.string().optional(),
  })),
});

export const evidenceRoutes = new Hono();

evidenceRoutes.post('/generate', async (c) => {
  try {
    const body = await c.req.json();
    const validated = evidenceSchema.parse(body);
    
    const list = generateEvidenceList(validated);
    
    return c.json({
      success: true,
      data: list,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate evidence list'
    }, 400);
  }
});

function generateEvidenceList(data: z.infer<typeof evidenceSchema>) {
  return {
    title: `Evidence List - Case ${data.caseNumber}`,
    items: data.items.map((item, index) => ({
      number: index + 1,
      exhibit: item.exhibit,
      description: item.description,
      relevance: item.relevance,
      source: item.source,
      dateObtained: item.dateObtained,
    })),
    generated: new Date().toISOString(),
  };
}