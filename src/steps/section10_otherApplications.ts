// Step 10: other Applications (Section 10 of N161)

import { OtherApplicationsAgent } from '../agents/section10_otherApplicationsAgent';
import type { Env } from '../types';

export async function step10_otherApplications(
  env: Env,
  previousData: any,
  previousFormData: any,
  formPath: string,
  sendUpdate: (msg: string) => void
) {
  const agent = new OtherApplicationsAgent(env);
  
  sendUpdate('📋 Section 10 Agent starting...');
  const result = await agent.generateSection10(previousData.orderDetails, previousData.grounds, previousData.urgency);
  
  sendUpdate('💾 Saving N161 with Section 10 data...');
  
  const formData = {
    ...previousFormData,
    section10: result,
    lastUpdated: new Date().toISOString()
  };
  
  return {
    section: 'Section 10',
    status: 'completed',
    data: result,
    formData,
    savedPath: formPath.replace('.pdf', '_section10.json')
  };
}
