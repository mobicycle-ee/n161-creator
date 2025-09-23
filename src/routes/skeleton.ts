import { Hono } from 'hono';
import { z } from 'zod';

const skeletonSchema = z.object({
  caseDetails: z.object({
    caseNumber: z.string(),
    appellant: z.string(),
    respondent: z.string(),
  }),
  introduction: z.string(),
  facts: z.array(z.string()),
  issues: z.array(z.string()),
  arguments: z.array(z.object({
    point: z.string(),
    authorities: z.array(z.string()),
    submission: z.string(),
  })),
  conclusion: z.string(),
});

export const skeletonRoutes = new Hono();

skeletonRoutes.post('/generate', async (c) => {
  try {
    const body = await c.req.json();
    const validated = skeletonSchema.parse(body);
    
    const skeleton = generateSkeletonArgument(validated);
    
    return c.json({
      success: true,
      data: skeleton,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate skeleton argument'
    }, 400);
  }
});

function generateSkeletonArgument(data: z.infer<typeof skeletonSchema>) {
  return {
    title: 'SKELETON ARGUMENT',
    caseHeader: `
      ${data.caseDetails.appellant} (Appellant)
      v
      ${data.caseDetails.respondent} (Respondent)
      Case No: ${data.caseDetails.caseNumber}
    `.trim(),
    sections: [
      {
        heading: 'INTRODUCTION',
        content: data.introduction,
      },
      {
        heading: 'FACTS',
        content: data.facts.map((fact, i) => `${i + 1}. ${fact}`).join('\n'),
      },
      {
        heading: 'ISSUES',
        content: data.issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n'),
      },
      {
        heading: 'ARGUMENT',
        content: data.arguments.map((arg, i) => `
          ${i + 1}. ${arg.point}
          
          Authorities:
          ${arg.authorities.map(auth => `- ${auth}`).join('\n')}
          
          Submission:
          ${arg.submission}
        `).join('\n\n'),
      },
      {
        heading: 'CONCLUSION',
        content: data.conclusion,
      },
    ],
    generated: new Date().toISOString(),
  };
}