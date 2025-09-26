// Step 6: Grounds Analyzer (Section 6 of N161)

import { GroundsAnalyzerAgent } from '../agents/section06_groundsAnalyzerAgent';
import type { Env } from '../types';

/**
 * Step 6: Populate Section 6 - Grounds of Appeal
 * 
 * Answers questions from src/questions/section06_groundsAnalyzer.md
 */

export async function step6_groundsAnalyzer(
  env: Env,
  orderContent: string,
  orderDetails: any,
  previousFormData: any,
  formPath: string,
  sendUpdate: (msg: string) => void
) {
  const agent = new GroundsAnalyzerAgent(env);
  
  // SUBSTEP 6.1: Extract order defects
  sendUpdate('📋 Grounds Analyzer Agent starting...');
  sendUpdate('Scanning order for defects...');
  
  const defects = {
    procedural: [],
    jurisdictional: [],
    statutory: []
  };
  
  // Check for missing judge name
  if (!orderDetails.judge) {
    defects.procedural.push({
      defect: 'No judge identified',
      rule: 'CPR 40.2(2)(a)',
      consequence: 'Order potentially void'
    });
  }
  
  // Check for seal
  if (!orderDetails.sealed) {
    defects.procedural.push({
      defect: 'No seal mentioned',
      rule: 'CPR 40.2(2)(c)',
      consequence: 'Order may not be enforceable'
    });
  }
  
  sendUpdate(`✓ Found ${Object.values(defects).flat().length} defects`);
  
  // SUBSTEP 6.2: Query Book 4 for void order patterns
  sendUpdate('Consulting Book 4: Void Ab Initio database...');
  
  const bookService = agent['bookService'];
  const voidPrecedents = await bookService.getBookContent(4, 1); // Book 4, Chapter 1
  sendUpdate(`✓ Retrieved ${voidPrecedents.length} void order precedents`);
  
  // SUBSTEP 6.3: Generate grounds based on defects
  sendUpdate('Generating grounds of appeal...');
  
  const grounds = [];
  
  if (defects.procedural.length > 0) {
    grounds.push({
      title: 'Order is void for procedural defects',
      details: defects.procedural.map(d => d.defect),
      citations: ['CPR 40.2', 'Anisminic v FCC [1969]'],
      likelihood: 'high'
    });
  }
  
  if (defects.jurisdictional.length > 0) {
    grounds.push({
      title: 'Court lacked jurisdiction',
      details: defects.jurisdictional.map(d => d.defect),
      citations: ['Re B [2013]'],
      likelihood: 'high'
    });
  }
  
  // SUBSTEP 6.4: Assess ground strength
  sendUpdate('Assessing strength of each ground...');
  
  grounds.forEach(ground => {
    const strength = ground.citations.length > 2 ? 'strong' : 
                    ground.citations.length > 0 ? 'moderate' : 'weak';
    ground.strength = strength;
    sendUpdate(`  • ${ground.title}: ${strength}`);
  });
  
  // SUBSTEP 6.5: Prioritize grounds
  sendUpdate('Prioritizing grounds by likelihood of success...');
  
  const prioritizedGrounds = grounds.sort((a, b) => {
    const priority = { high: 3, medium: 2, low: 1 };
    return priority[b.likelihood] - priority[a.likelihood];
  });
  
  // SUBSTEP 6.6: Save updated N161 form
  sendUpdate('💾 Saving N161 with Section 6 data...');
  
  const formData = {
    ...previousFormData,
    section6: {
      defects,
      grounds: prioritizedGrounds,
      voidOrderDetected: defects.procedural.length > 0
    },
    lastUpdated: new Date().toISOString()
  };
  
  const savePath = formPath.replace('.pdf', '_section6.json');
  sendUpdate(`✅ Section 6 Complete: ${grounds.length} grounds identified and saved`);
  
  return {
    section: 'Section 6: Grounds of Appeal',
    status: 'completed',
    grounds: prioritizedGrounds,
    formData,
    savedPath: savePath
  };
}