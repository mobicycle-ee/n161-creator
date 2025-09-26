// Step 7: Skeleton Argument (Section 7 of N161)

import { SkeletonArgumentAgent } from '../agents/section07_skeletonArgumentAgent';
import type { Env } from '../types';

export async function step7_skeletonArgument(
  env: Env,
  grounds: any[],
  previousFormData: any,
  formPath: string,
  sendUpdate: (msg: string) => void
) {
  const agent = new SkeletonArgumentAgent(env);
  
  // SUBSTEP 7.1: Structure skeleton argument
  sendUpdate('📋 Skeleton Argument Agent starting...');
  sendUpdate('Structuring skeleton argument from grounds...');
  
  const skeleton = await agent.generateSection7(grounds, {}, sendUpdate);
  
  // SUBSTEP 7.2: Save N161
  sendUpdate('💾 Saving N161 with Section 7 data...');
  
  const formData = {
    ...previousFormData,
    section7: skeleton,
    lastUpdated: new Date().toISOString()
  };
  
  return {
    section: 'Section 7: Skeleton Argument',
    status: 'completed',
    skeleton,
    formData,
    savedPath: formPath.replace('.pdf', '_section7.json')
  };
}
