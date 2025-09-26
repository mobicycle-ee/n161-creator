// Step 13: supporting Documents (Section 13 of N161)

import { SupportingDocumentsAgent } from '../agents/section13_supportingDocumentsAgent';
import type { Env } from '../types';

export async function step13_supportingDocuments(
  env: Env,
  previousData: any,
  previousFormData: any,
  formPath: string,
  sendUpdate: (msg: string) => void
) {
  const agent = new SupportingDocumentsAgent(env);
  
  sendUpdate('📋 Section 13 Agent starting...');
  const result = await agent.organizeSection13(previousData.orderDetails, previousData.grounds, previousData.evidence);
  
  sendUpdate('💾 Saving N161 with Section 13 data...');
  
  const formData = {
    ...previousFormData,
    section13: result,
    lastUpdated: new Date().toISOString()
  };
  
  return {
    section: 'Section 13',
    status: 'completed',
    data: result,
    formData,
    savedPath: formPath.replace('.pdf', '_section13.json')
  };
}
