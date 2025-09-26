// Step 14: statement Of Truth (Section 14 of N161)

import { StatementOfTruthAgent } from '../agents/section14_statementOfTruthAgent';
import type { Env } from '../types';

export async function step14_statementOfTruth(
  env: Env,
  previousData: any,
  previousFormData: any,
  formPath: string,
  sendUpdate: (msg: string) => void
) {
  const agent = new StatementOfTruthAgent(env);
  
  sendUpdate('📋 Section 14 Agent starting...');
  const result = await agent.generateSection14(previousData.appellantDetails, previousData.isLiP);
  
  sendUpdate('💾 Saving N161 with Section 14 data...');
  
  const formData = {
    ...previousFormData,
    section14: result,
    lastUpdated: new Date().toISOString()
  };
  
  return {
    section: 'Section 14',
    status: 'completed',
    data: result,
    formData,
    savedPath: formPath.replace('.pdf', '_section14.json')
  };
}
