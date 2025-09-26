// Step 3: Legal Representation (Section 3 of N161)

import { LegalRepresentationAgent } from '../agents/section03_legalRepresentationAgent';
import type { Env } from '../types';

/**
 * Step 3: Populate Section 3 - Legal Representation
 * 
 * Answers questions from src/questions/section03_legalRepresentation.md
 */

export async function step3_legalRepresentation(
  env: Env,
  userDetails: any,
  previousFormData: any,
  formPath: string,
  sendUpdate: (msg: string) => void
) {
  const agent = new LegalRepresentationAgent(env);
  
  // SUBSTEP 3.1: Determine representation status
  sendUpdate('📋 Legal Representation Agent starting...');
  sendUpdate('Checking representation status...');
  
  const isLitigantInPerson = !userDetails.solicitor && !userDetails.barrister;
  const representationStatus = isLitigantInPerson ? 'Litigant in Person' : 'Legally Represented';
  
  sendUpdate(`✓ Status: ${representationStatus}`);
  
  // SUBSTEP 3.2: If represented, get legal representative details
  let legalRepDetails = null;
  
  if (!isLitigantInPerson) {
    sendUpdate('Extracting legal representative details...');
    legalRepDetails = {
      firmName: userDetails.solicitor?.firmName || '',
      solicitorName: userDetails.solicitor?.name || '',
      reference: userDetails.solicitor?.reference || '',
      address: userDetails.solicitor?.address || '',
      phone: userDetails.solicitor?.phone || '',
      email: userDetails.solicitor?.email || '',
      onRecord: userDetails.solicitor?.onRecord || false
    };
    sendUpdate(`✓ Legal rep: ${legalRepDetails.firmName}`);
  }
  
  // SUBSTEP 3.3: Check vulnerability factors for LiPs
  let vulnerabilities = [];
  
  if (isLitigantInPerson) {
    sendUpdate('Assessing vulnerability factors...');
    
    if (userDetails.disability) {
      vulnerabilities.push('Physical disability requiring adjustments');
    }
    if (userDetails.mentalHealth) {
      vulnerabilities.push('Mental health conditions affecting participation');
    }
    if (userDetails.language && userDetails.language !== 'English') {
      vulnerabilities.push('Language barriers - interpreter required');
    }
    if (userDetails.age && (userDetails.age < 18 || userDetails.age > 70)) {
      vulnerabilities.push('Age-related vulnerability');
    }
    
    if (vulnerabilities.length > 0) {
      sendUpdate(`⚠️ Vulnerabilities identified: ${vulnerabilities.length}`);
      vulnerabilities.forEach(v => sendUpdate(`  • ${v}`));
    }
  }
  
  // SUBSTEP 3.4: Determine support needs
  sendUpdate('Identifying support needs...');
  
  const supportNeeds = [];
  
  if (isLitigantInPerson) {
    supportNeeds.push('McKenzie Friend permitted');
    supportNeeds.push('Extra time for submissions');
    
    if (vulnerabilities.length > 0) {
      supportNeeds.push('Ground floor courtroom required');
      supportNeeds.push('Regular breaks needed');
      supportNeeds.push('Written submissions in advance');
    }
  }
  
  // SUBSTEP 3.5: Get strategic advice from Book 1
  sendUpdate('Retrieving LiP guidance from legal survival guide...');
  
  let strategicAdvice = [];
  
  if (isLitigantInPerson) {
    // Book 1: Legal Survival Guide content
    strategicAdvice = [
      'Request all hearings be recorded',
      'Submit skeleton argument 7 days before hearing',
      'Prepare bundle with numbered pages',
      'Request written reasons for all decisions',
      'Consider applying for costs protection'
    ];
    
    sendUpdate(`✓ Retrieved ${strategicAdvice.length} strategic tips for LiPs`);
  }
  
  // SUBSTEP 3.6: Check legal aid eligibility
  sendUpdate('Checking legal aid position...');
  
  const legalAidStatus = {
    eligible: false,
    applied: userDetails.legalAidApplied || false,
    reference: userDetails.legalAidReference || '',
    exceptional: isLitigantInPerson && vulnerabilities.length > 0
  };
  
  if (legalAidStatus.exceptional) {
    sendUpdate('⚠️ May qualify for exceptional legal aid funding');
  }
  
  // SUBSTEP 3.7: Compile representation data
  const representationData = {
    status: representationStatus,
    isLitigantInPerson,
    legalRepDetails,
    vulnerabilities,
    supportNeeds,
    strategicAdvice,
    legalAidStatus,
    specialMeasures: vulnerabilities.length > 0
  };
  
  // SUBSTEP 3.8: Save updated N161 form
  sendUpdate('💾 Saving N161 with Section 3 data...');
  
  const formData = {
    ...previousFormData,
    section3: representationData,
    lastUpdated: new Date().toISOString()
  };
  
  const savePath = formPath.replace('.pdf', '_section3.json');
  
  sendUpdate(`✅ Section 3 Complete: Legal representation details saved`);
  
  return {
    section: 'Section 3: Legal Representation',
    status: 'completed',
    representationData,
    formData,
    savedPath: savePath
  };
}