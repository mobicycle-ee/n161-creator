// Step 1: Case Details (Section 1 of N161)

import { CaseDetailsAgent } from '../agents/section01_caseDetailsAgent';
import { PDFDocument, PDFForm } from 'pdf-lib';
import type { Env } from '../types';
import { QUESTION1_FIELDS, QUESTION1_PROMPT } from '../questions/section01_caseDetails';

/**
 * Step 1: Populate Section 1 - Case Details
 * 
 * This step fills out the actual N161 PDF form fields for Section 1
 */

export async function step1_caseDetails(
  env: Env,
  orderKey: string,
  blankFormBuffer: ArrayBuffer,  // Blank N161 PDF passed in
  sendUpdate: (msg: string) => void
) {
  const agent = new CaseDetailsAgent(env);
  
  // SUBSTEP 1.0: Load the N161 PDF form
  sendUpdate('📄 Loading N161 PDF form...');
  const pdfDoc = await PDFDocument.load(blankFormBuffer);
  const form = pdfDoc.getForm();
  
  // SUBSTEP 1.1: Present questions to agent
  sendUpdate('📋 Presenting questions from question1.ts to Case Details Agent...');
  sendUpdate(`📝 Questions to answer: ${QUESTION1_FIELDS.map(f => f.label).join(', ')}`);
  
  // SUBSTEP 1.2: Agent answers questions
  sendUpdate('🤖 Case Details Agent analyzing order and answering questions...');
  const agentResult = await agent.answerQuestions(orderKey, QUESTION1_FIELDS, QUESTION1_PROMPT, sendUpdate);
  
  // SUBSTEP 1.2: Fill PDF Field - Case Number
  sendUpdate('✏️ Filling N161 Field: Claim/Case Number...');
  try {
    const caseNumberField = form.getTextField('claim_case_number');
    caseNumberField.setText(agentResult.caseDetails?.caseNumber || '');
    sendUpdate(`  ✓ Case number: ${agentResult.caseDetails?.caseNumber}`);
  } catch (e) {
    sendUpdate('  ⚠️ Case number field not found');
  }
  
  // SUBSTEP 1.3: Fill PDF Field - Claimant Names
  sendUpdate('✏️ Filling N161 Field: Claimant(s)...');
  try {
    const claimantField = form.getTextField('claimant_name');
    const claimants = agentResult.parties
      ?.filter(p => p.role === 'Claimant')
      ?.map(p => p.name)
      ?.join(', ') || '';
    claimantField.setText(claimants);
    sendUpdate(`  ✓ Claimants: ${claimants}`);
  } catch (e) {
    sendUpdate('  ⚠️ Claimant field not found');
  }
  
  // SUBSTEP 1.4: Fill PDF Field - Defendant Names  
  sendUpdate('✏️ Filling N161 Field: Defendant(s)...');
  try {
    const defendantField = form.getTextField('defendant_name');
    const defendants = agentResult.parties
      ?.filter(p => p.role === 'Defendant')
      ?.map(p => p.name)
      ?.join(', ') || '';
    defendantField.setText(defendants);
    sendUpdate(`  ✓ Defendants: ${defendants}`);
  } catch (e) {
    sendUpdate('  ⚠️ Defendant field not found');
  }
  
  // SUBSTEP 1.5: Fill PDF Field - Appellant Contact Details
  sendUpdate('✏️ Filling N161 Field: Appellant Details...');
  const appellantId = agentResult.parties?.[0]?.id;
  const appellantDetails = agentResult.contactDetails?.[appellantId];
  
  if (appellantDetails) {
    try {
      form.getTextField('appellant_name').setText(appellantDetails.name || '');
      form.getTextField('appellant_address').setText(appellantDetails.address || '');
      form.getTextField('appellant_postcode').setText('EC2Y 5AG');
      form.getTextField('appellant_telephone').setText(appellantDetails.phone || '');
      form.getTextField('appellant_email').setText(appellantDetails.email || '');
      sendUpdate(`  ✓ Appellant: ${appellantDetails.name}`);
      sendUpdate(`  ✓ Address: ${appellantDetails.address}`);
    } catch (e) {
      sendUpdate('  ⚠️ Some appellant fields not found');
    }
  }
  
  // SUBSTEP 1.6: Fill PDF Field - Respondent Contact Details
  sendUpdate('✏️ Filling N161 Field: Respondent Details...');
  const respondentId = agentResult.parties?.[1]?.id;
  const respondentDetails = agentResult.contactDetails?.[respondentId];
  
  if (respondentDetails) {
    try {
      form.getTextField('respondent_name').setText(respondentDetails.name || '');
      form.getTextField('respondent_address').setText(respondentDetails.address || '');
      form.getTextField('respondent_postcode').setText('');
      sendUpdate(`  ✓ Respondent: ${respondentDetails.name}`);
    } catch (e) {
      sendUpdate('  ⚠️ Some respondent fields not found');
    }
  }
  
  // SUBSTEP 1.7: Fill PDF Field - Additional Parties Checkbox
  sendUpdate('✏️ Filling N161 Field: Additional Parties...');
  try {
    const additionalPartiesBox = form.getCheckBox('additional_parties');
    if (agentResult.parties?.length > 2) {
      additionalPartiesBox.check();
      sendUpdate('  ✓ Additional parties checkbox: Yes');
    } else {
      additionalPartiesBox.uncheck();
      sendUpdate('  ✓ Additional parties checkbox: No');
    }
  } catch (e) {
    sendUpdate('  ⚠️ Additional parties checkbox not found');
  }
  
  // SUBSTEP 1.8: Fill PDF Field - Fee Account (if applicable)
  sendUpdate('✏️ Filling N161 Field: Fee Account...');
  try {
    form.getTextField('fee_account_no').setText('');
    sendUpdate('  ✓ Fee account: (blank)');
  } catch (e) {
    sendUpdate('  ⚠️ Fee account field not found');
  }
  
  // SUBSTEP 1.9: Fill PDF Field - Help with Fees
  sendUpdate('✏️ Filling N161 Field: Help with Fees...');
  try {
    form.getTextField('help_with_fees_ref').setText('');
    sendUpdate('  ✓ Help with fees: (blank)');
  } catch (e) {
    sendUpdate('  ⚠️ Help with fees field not found');
  }
  
  // SUBSTEP 1.10: Save the filled PDF
  sendUpdate('💾 Saving N161 with Section 1 filled...');
  const pdfBytes = await pdfDoc.save();
  
  sendUpdate('✅ Section 1 Complete: N161 PDF form filled');
  
  // Return the filled PDF and data
  return {
    section: 'Section 1: Case Details',
    status: 'completed',
    pdfBytes: pdfBytes,  // The actual filled PDF as bytes
    formData: agentResult,
    fieldsCompleted: [
      'claim_case_number',
      'claimant_name', 
      'defendant_name',
      'appellant_name',
      'appellant_address',
      'respondent_name',
      'respondent_address'
    ]
  };
}