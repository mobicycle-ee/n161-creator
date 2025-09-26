// Step 9: relief Sought (Section 9 of N161)

import { ReliefSoughtAgent } from '../agents/section09_reliefSoughtAgent';
import type { Env } from '../types';

export async function step9_reliefSought(
  env: Env,
  previousData: any,
  previousFormData: any,
  formPath: string,
  sendUpdate: (msg: string) => void
) {
  const agent = new ReliefSoughtAgent(env);
  
  sendUpdate('📋 Section 9 Agent starting...');
  const result = await agent.generateSection9(previousData.orderDetails, previousData.grounds);
  
  sendUpdate('💾 Saving N161 with Section 9 data...');
  
  const formData = {
    ...previousFormData,
    section9: result,
    lastUpdated: new Date().toISOString()
  };
  
  return {
    section: 'Section 9',
    status: 'completed',
    data: result,
    formData,
    savedPath: formPath.replace('.pdf', '_section9.json')
  };
}
