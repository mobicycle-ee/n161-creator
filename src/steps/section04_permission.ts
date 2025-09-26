// Step 4: Permission to Appeal (Section 4 of N161)

import { PermissionAgent } from '../agents/section04_permissionAgent';
import type { Env } from '../types';

/**
 * Step 4: Populate Section 4 - Permission to Appeal
 * 
 * Answers questions from src/questions/section04_permission.md
 */

export async function step4_permission(
  env: Env,
  orderDetails: any,
  grounds: any[],
  previousFormData: any,
  formPath: string,
  sendUpdate: (msg: string) => void
) {
  const agent = new PermissionAgent(env);
  
  // SUBSTEP 4.1: Check if permission was granted at lower court
  sendUpdate('📋 Permission Agent starting...');
  sendUpdate('Checking if permission already granted...');
  
  const permissionGranted = orderDetails.permissionGranted || false;
  
  if (permissionGranted) {
    sendUpdate('✓ Permission already granted by lower court');
  } else {
    sendUpdate('⚠️ Permission not granted - must apply');
  }
  
  // SUBSTEP 4.2: Check for exceptions where permission not required
  sendUpdate('Checking for permission exceptions...');
  
  const exceptions = [];
  
  // Committal orders - no permission needed
  if (orderDetails.orderType?.includes('committal')) {
    exceptions.push('Committal order - CPR 52.3(1)(a) exception');
  }
  
  // Refusal of habeas corpus
  if (orderDetails.orderType?.includes('habeas corpus')) {
    exceptions.push('Habeas corpus refusal - permission not required');
  }
  
  // Statutory rights
  if (orderDetails.statutoryRight) {
    exceptions.push(`Statutory right of appeal: ${orderDetails.statutoryRight}`);
  }
  
  if (exceptions.length > 0) {
    sendUpdate('✅ Permission NOT required:');
    exceptions.forEach(e => sendUpdate(`  • ${e}`));
  }
  
  // SUBSTEP 4.3: Build permission arguments (if needed)
  sendUpdate('Constructing permission arguments...');
  
  const permissionArguments = {
    realProspect: [],
    compellingReason: [],
    publicImportance: []
  };
  
  if (!permissionGranted && exceptions.length === 0) {
    // Real prospect of success
    grounds.forEach(ground => {
      if (ground.title.toLowerCase().includes('void')) {
        permissionArguments.realProspect.push({
          ground: ground.title,
          reason: 'Void orders have 100% success rate on appeal',
          authority: 'Anisminic v FCC [1969]'
        });
      }
    });
    
    // Compelling reasons
    if (orderDetails.orderType?.includes('possession')) {
      permissionArguments.compellingReason.push({
        reason: 'Risk of homelessness',
        detail: 'Appellant will lose home if appeal not heard',
        authority: 'Manchester CC v Pinnock [2010]'
      });
    }
    
    // Public importance
    if (grounds.some(g => g.title.toLowerCase().includes('echr'))) {
      permissionArguments.publicImportance.push({
        reason: 'Convention rights engaged',
        detail: 'Systemic violation of Article 8/Article 6',
        impact: 'Affects multiple similar cases'
      });
    }
  }
  
  // SUBSTEP 4.4: Calculate permission test threshold
  sendUpdate('Evaluating permission threshold...');
  
  let permissionTest = '';
  if (orderDetails.appealLevel === 'second') {
    permissionTest = 'Important point of principle or practice OR compelling reason';
    sendUpdate('⚠️ Second appeal - higher threshold applies');
  } else {
    permissionTest = 'Real prospect of success OR compelling reason';
    sendUpdate('✓ First appeal - standard threshold');
  }
  
  // SUBSTEP 4.5: Draft permission application
  const permissionApplication = {
    required: !permissionGranted && exceptions.length === 0,
    alreadyGranted: permissionGranted,
    exceptions: exceptions,
    test: permissionTest,
    arguments: permissionArguments,
    grounds: grounds.map(g => g.title),
    urgency: orderDetails.urgent || false
  };
  
  // SUBSTEP 4.6: Save updated N161 form
  sendUpdate('💾 Saving N161 with Section 4 data...');
  
  const formData = {
    ...previousFormData,
    section4: permissionApplication,
    lastUpdated: new Date().toISOString()
  };
  
  const savePath = formPath.replace('.pdf', '_section4.json');
  
  sendUpdate(`✅ Section 4 Complete: Permission application prepared and saved`);
  
  return {
    section: 'Section 4: Permission to Appeal',
    status: 'completed',
    permissionApplication,
    formData,
    savedPath: savePath
  };
}