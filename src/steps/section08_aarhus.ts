// Step 8: Aarhus Convention (Section 8 of N161)

import { AarhusConventionAgent } from '../agents/section08_aarhusAgent';
import type { Env } from '../types';

/**
 * Step 8: Populate Section 8 - Aarhus Convention
 * 
 * Answers questions from src/questions/section08_aarhus.md
 */

export async function step8_aarhus(
  env: Env,
  caseType: string,
  previousFormData: any,
  formPath: string,
  sendUpdate: (msg: string) => void
) {
  const agent = new AarhusConventionAgent(env);
  
  // SUBSTEP 8.1: Check if environmental case
  sendUpdate('📋 Aarhus Convention Agent starting...');
  sendUpdate('Checking if environmental matter...');
  
  const isEnvironmental = caseType.includes('planning') || 
                         caseType.includes('environmental') ||
                         caseType.includes('pollution');
  
  // SUBSTEP 8.2: Apply costs protection if applicable
  sendUpdate('Determining costs protection...');
  
  const aarhusData = await agent.assessSection8(caseType);
  
  // SUBSTEP 8.3: Save N161
  sendUpdate('💾 Saving N161 with Section 8 data...');
  
  const formData = {
    ...previousFormData,
    section8: {
      isEnvironmental,
      costsProtection: aarhusData.costsProtection,
      claimType: aarhusData.claimType
    },
    lastUpdated: new Date().toISOString()
  };
  
  return {
    section: 'Section 8: Aarhus Convention',
    status: 'completed',
    aarhusData,
    formData,
    savedPath: formPath.replace('.pdf', '_section8.json')
  };
}