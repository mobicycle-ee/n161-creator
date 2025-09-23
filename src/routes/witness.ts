import { Hono } from 'hono';
import { z } from 'zod';

const witnessSchema = z.object({
  witness: z.object({
    name: z.string(),
    address: z.string(),
    occupation: z.string().optional(),
  }),
  caseNumber: z.string(),
  statement: z.array(z.object({
    paragraph: z.number(),
    content: z.string(),
  })),
  truthStatement: z.boolean().default(true),
});

export const witnessRoutes = new Hono();

witnessRoutes.post('/generate', async (c) => {
  try {
    const body = await c.req.json();
    const validated = witnessSchema.parse(body);
    
    const statement = generateWitnessStatement(validated);
    
    return c.json({
      success: true,
      data: statement,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate witness statement'
    }, 400);
  }
});

function generateWitnessStatement(data: z.infer<typeof witnessSchema>) {
  return {
    title: 'WITNESS STATEMENT',
    header: `
      Case No: ${data.caseNumber}
      
      I, ${data.witness.name}, of ${data.witness.address}${data.witness.occupation ? `, ${data.witness.occupation}` : ''}, 
      WILL SAY as follows:
    `.trim(),
    paragraphs: data.statement.map(para => ({
      number: para.paragraph,
      text: para.content,
    })),
    footer: data.truthStatement ? `
      Statement of Truth:
      I believe that the facts stated in this witness statement are true. 
      I understand that proceedings for contempt of court may be brought against 
      anyone who makes, or causes to be made, a false statement in a document 
      verified by a statement of truth without an honest belief in its truth.
      
      Signed: _______________________
      Date: ${new Date().toLocaleDateString('en-GB')}
    `.trim() : '',
    generated: new Date().toISOString(),
  };
}