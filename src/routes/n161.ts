import { Hono } from 'hono';
import { z } from 'zod';
import { generateN161Form } from '../services/n161Generator';

const n161Schema = z.object({
  appellant: z.object({
    name: z.string(),
    address: z.string(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }),
  respondent: z.object({
    name: z.string(),
    address: z.string(),
  }),
  caseDetails: z.object({
    caseNumber: z.string(),
    courtName: z.string(),
    judge: z.string(),
    dateOfOrder: z.string(),
  }),
  appealDetails: z.object({
    groundsOfAppeal: z.array(z.string()),
    reliefSought: z.string(),
    urgency: z.boolean().optional(),
  }),
});

export const n161Routes = new Hono();

n161Routes.post('/generate', async (c) => {
  try {
    const body = await c.req.json();
    const validated = n161Schema.parse(body);
    
    const formData = await generateN161Form(validated);
    
    return c.json({
      success: true,
      data: formData,
      message: 'N161 form generated successfully'
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate N161'
    }, 400);
  }
});

n161Routes.get('/template', (c) => {
  return c.json({
    template: {
      appellant: {
        name: '',
        address: '',
        phone: '',
        email: '',
      },
      respondent: {
        name: '',
        address: '',
      },
      caseDetails: {
        caseNumber: '',
        courtName: '',
        judge: '',
        dateOfOrder: '',
      },
      appealDetails: {
        groundsOfAppeal: [],
        reliefSought: '',
        urgency: false,
      },
    }
  });
});