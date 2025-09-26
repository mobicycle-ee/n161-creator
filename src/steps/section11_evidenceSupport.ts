// Step 11: evidence Support (Section 11 of N161)

import { EvidenceSupportAgent } from '../agents/section11_evidenceSupportAgent';
import type { Env } from '../types';

export async function step11_evidenceSupport(
  env: Env,
  previousData: any,
  previousFormData: any,
  formPath: string,
  sendUpdate: (msg: string) => void
) {
  const agent = new EvidenceSupportAgent(env);
  
  sendUpdate('📋 Section 11 Agent starting...');
  const result = await agent.organizeSection11(previousData.grounds, previousData.evidence);
  
  sendUpdate('💾 Saving N161 with Section 11 data...');
  
  const formData = {
    ...previousFormData,
    section11: result,
    lastUpdated: new Date().toISOString()
  };
  
  return {
    section: 'Section 11',
    status: 'completed',
    data: result,
    formData,
    savedPath: formPath.replace('.pdf', '_section11.json')
  };
}
