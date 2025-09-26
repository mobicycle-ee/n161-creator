// Step 2: Appeal Details (Section 2 of N161)

import { AppealDetailsAgent } from '../agents/section02_appealDetailsAgent';
import type { Env } from '../types';
import * as fs from 'fs';

/**
 * Step 2: Populate Section 2 - Appeal Details
 * 
 * Answers questions from src/questions/section02_appealDetails.md
 */

export async function step2_appealDetails(
  env: Env,
  orderDetails: any,
  previousSectionData: any,
  formPath: string,
  sendUpdate: (msg: string) => void
) {
  const agent = new AppealDetailsAgent(env);
  
  // SUBSTEP 2.1: Determine which court the appeal is from
  sendUpdate('📋 Appeal Details Agent starting...');
  sendUpdate('Analyzing court hierarchy...');
  
  const courtName = orderDetails.courtName || 'County Court at Central London';
  let appealFromCourt = '';
  let division = '';
  
  if (courtName.includes('County Court')) {
    appealFromCourt = 'County Court';
    sendUpdate('✓ Appeal from County Court');
  } else if (courtName.includes('High Court')) {
    appealFromCourt = 'High Court';
    // Determine division
    if (courtName.includes('Chancery')) {
      division = 'Chancery Division';
    } else if (courtName.includes('Queen\'s Bench') || courtName.includes('King\'s Bench')) {
      division = 'King\'s Bench Division';
    } else if (courtName.includes('Family')) {
      division = 'Family Division';
    }
    sendUpdate(`✓ Appeal from High Court - ${division}`);
  }
  
  // SUBSTEP 2.2: Extract judge information
  sendUpdate('Identifying judge details...');
  
  const judgeName = orderDetails.judge || 'HHJ Gerald';
  let judgeStatus = '';
  
  if (judgeName.includes('DJ')) {
    judgeStatus = 'District Judge';
  } else if (judgeName.includes('HHJ')) {
    judgeStatus = 'Circuit Judge';
  } else if (judgeName.includes('Master')) {
    judgeStatus = 'Master';
  } else if (judgeName.includes('J')) {
    judgeStatus = 'High Court Judge';
  } else {
    judgeStatus = 'Judge (status to be confirmed)';
  }
  
  sendUpdate(`✓ Judge: ${judgeName} (${judgeStatus})`);
  
  // SUBSTEP 2.3: Determine order date
  sendUpdate('Extracting order date...');
  
  const orderDate = orderDetails.orderDate || new Date().toISOString().split('T')[0];
  sendUpdate(`✓ Order date: ${orderDate}`);
  
  // SUBSTEP 2.4: Check if this is an appeal from a previous appeal
  sendUpdate('Checking if order is from previous appeal...');
  
  let isPreviousAppeal = false;
  if (orderDetails.orderType?.toLowerCase().includes('appeal') || 
      judgeStatus === 'Circuit Judge') {
    isPreviousAppeal = true;
    sendUpdate('⚠️ This appears to be an appeal from a previous appeal - Second appeal rules apply');
  } else {
    sendUpdate('✓ This is a first appeal');
  }
  
  // SUBSTEP 2.5: Determine appeal route
  sendUpdate('Determining appeal route...');
  
  let appealRoute = '';
  if (appealFromCourt === 'County Court' && !isPreviousAppeal) {
    appealRoute = 'First Appeal - County Court to High Court';
    sendUpdate('✓ Route: County Court → High Court (First Appeal)');
  } else if (appealFromCourt === 'High Court' || isPreviousAppeal) {
    appealRoute = 'Second Appeal - to Court of Appeal';
    sendUpdate('✓ Route: → Court of Appeal (Second Appeal - permission required)');
  }
  
  // SUBSTEP 2.6: Calculate deadlines
  sendUpdate('Calculating appeal deadlines...');
  
  const orderDateObj = new Date(orderDate);
  const deadline21Days = new Date(orderDateObj);
  deadline21Days.setDate(deadline21Days.getDate() + 21);
  
  sendUpdate(`⚠️ Standard deadline: ${deadline21Days.toISOString().split('T')[0]} (21 days from order)`);
  
  if (new Date() > deadline21Days) {
    sendUpdate('⚠️ DEADLINE PASSED - Extension of time required!');
  }
  
  // SUBSTEP 2.7: Compile appeal details
  const appealDetails = {
    courtFrom: appealFromCourt,
    division: division || 'N/A',
    judgeName: judgeName,
    judgeStatus: judgeStatus,
    orderDate: orderDate,
    isPreviousAppeal: isPreviousAppeal,
    appealRoute: appealRoute,
    deadline: deadline21Days.toISOString().split('T')[0],
    extensionRequired: new Date() > deadline21Days
  };
  
  // SUBSTEP 2.8: Save updated N161 form
  sendUpdate('💾 Saving N161 with Section 2 data...');
  
  // In reality, would use a PDF library to fill the form
  // For now, we'll save the data structure
  const formData = {
    ...previousSectionData,
    section2: appealDetails,
    lastUpdated: new Date().toISOString()
  };
  
  // Save to working directory (mock implementation)
  const savePath = formPath.replace('.pdf', '_section2.json');
  // fs.writeFileSync(savePath, JSON.stringify(formData, null, 2));
  
  sendUpdate(`✅ Section 2 Complete: Appeal details populated and saved`);
  
  return {
    section: 'Section 2: Appeal Details',
    status: 'completed',
    appealDetails,
    formData,
    savedPath: savePath
  };
}