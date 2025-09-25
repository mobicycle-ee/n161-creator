import type { Env } from '../types';

/**
 * AI VALIDATION SERVICE FOR COURTS
 * 
 * What courts SHOULD be using to prevent void orders
 * Book 4's recommendation: Every order should be AI-checked BEFORE sealing
 */
export class CourtAIValidator {
  constructor(private env: Env) {}
  
  /**
   * What courts SHOULD run on every order before sealing
   */
  async validateOrder(orderText: string): Promise<any> {
    console.log('🤖 AI VALIDATION OF COURT ORDER');
    console.log('=' .repeat(50));
    
    const validation = {
      timestamp: new Date().toISOString(),
      valid: true,
      warnings: [],
      errors: [],
      voidRisks: [],
      recommendations: []
    };
    
    // CHECK 1: CPR 40.2 Compliance
    console.log('\n🔍 Checking CPR 40.2 Requirements...');
    
    if (!orderText.match(/judge|district judge|circuit judge|master/i)) {
      validation.errors.push({
        rule: 'CPR 40.2(2)(a)',
        issue: 'No judge name/title identified',
        consequence: 'Order may be void',
        fix: 'Add: "Before [Title] [Name]"'
      });
      validation.valid = false;
    }
    
    if (!orderText.match(/\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i)) {
      validation.errors.push({
        rule: 'CPR 40.2(2)(b)',
        issue: 'No date identified',
        consequence: 'Order may be void',
        fix: 'Add: "Dated [date]"'
      });
      validation.valid = false;
    }
    
    if (!orderText.includes('seal') && !orderText.includes('SEAL')) {
      validation.warnings.push({
        rule: 'CPR 40.2(2)(c)',
        issue: 'No seal mentioned',
        consequence: 'Order not enforceable until sealed',
        fix: 'Ensure order is sealed before service'
      });
    }
    
    // CHECK 2: Possession Order Requirements
    console.log('\n🔍 Checking Possession Requirements...');
    
    if (orderText.includes('possession') || orderText.includes('eviction')) {
      if (!orderText.match(/notice to quit|NTQ|notice/i)) {
        validation.errors.push({
          rule: 'Protection from Eviction Act 1977 s.5',
          issue: 'No Notice to Quit mentioned in possession order',
          consequence: 'Proceedings may be void ab initio',
          fix: 'Verify Notice to Quit was served before proceedings',
          severity: 'CRITICAL'
        });
        validation.valid = false;
      }
    }
    
    // CHECK 3: Trespass vs Tenancy
    console.log('\n🔍 Checking Trespass/Tenancy Consistency...');
    
    if (orderText.includes('trespass') && orderText.includes('tenant')) {
      validation.errors.push({
        rule: 'CPR 55.1(b)',
        issue: 'Order treats tenant as trespasser',
        consequence: 'No jurisdiction - void order',
        fix: 'Cannot use trespass procedure against tenant',
        severity: 'CRITICAL'
      });
      validation.valid = false;
    }
    
    // CHECK 4: Totally Without Merit
    console.log('\n🔍 Checking TWM Declarations...');
    
    if (orderText.match(/totally without merit|TWM/i)) {
      if (!orderText.match(/because|reasons?|finding/i)) {
        validation.errors.push({
          rule: 'Duty to give reasons',
          issue: 'TWM declared without reasons',
          consequence: 'Vulnerable to appeal',
          fix: 'Add specific reasons for TWM finding',
          caselaw: 'Flannery v Halifax [2000] 1 WLR 377'
        });
      }
    }
    
    // CHECK 5: Civil Restraint Orders
    console.log('\n🔍 Checking Civil Restraint Orders...');
    
    if (orderText.match(/civil restraint order|CRO/i)) {
      if (!orderText.match(/pattern|repeated|history|previous/i)) {
        validation.warnings.push({
          rule: 'CPR 3.11',
          issue: 'CRO without established pattern',
          consequence: 'May exceed jurisdiction',
          fix: 'Document pattern of TWM applications',
          caselaw: 'Sartipy v Tigris [2019] EWCA Civ 225'
        });
      }
    }
    
    // CHECK 6: Ex Parte / Without Notice
    console.log('\n🔍 Checking Ex Parte Orders...');
    
    if (orderText.match(/without notice|ex parte/i)) {
      if (!orderText.match(/urgent|emergency|risk|impossib/i)) {
        validation.errors.push({
          rule: 'Article 6 ECHR',
          issue: 'Ex parte order without urgency justification',
          consequence: 'Violates right to fair hearing',
          fix: 'Document why notice was impossible/inappropriate',
          severity: 'HIGH'
        });
      }
      
      validation.warnings.push({
        rule: 'Natural justice',
        issue: 'Ex parte order made',
        recommendation: 'Set return date within 7 days'
      });
    }
    
    // CHECK 7: Costs Orders
    console.log('\n🔍 Checking Costs Proportionality...');
    
    const costsMatch = orderText.match(/£([\d,]+)/g);
    if (costsMatch) {
      costsMatch.forEach(amount => {
        const value = parseInt(amount.replace(/[£,]/g, ''));
        if (value > 10000) {
          validation.warnings.push({
            rule: 'CPR 44.3 Proportionality',
            issue: `High costs order: ${amount}`,
            recommendation: 'Provide detailed assessment',
            fix: 'Consider summary assessment schedule'
          });
        }
      });
    }
    
    // GENERATE RECOMMENDATIONS
    console.log('\n💡 Generating Recommendations...');
    
    if (!validation.valid) {
      validation.recommendations.push(
        'DO NOT SEAL THIS ORDER - Critical defects detected',
        'Review and correct all errors before proceeding',
        'Consider having order reviewed by senior judge'
      );
    } else if (validation.warnings.length > 0) {
      validation.recommendations.push(
        'Review warnings before sealing',
        'Consider adding clarifications',
        'Document justifications for unusual provisions'
      );
    } else {
      validation.recommendations.push(
        'Order appears compliant',
        'Proceed with sealing',
        'Serve within required timeframes'
      );
    }
    
    // RISK ASSESSMENT
    if (validation.errors.length > 0) {
      validation.voidRisks.push(
        `${validation.errors.length} defects that may render order void`,
        'High risk of successful appeal',
        'Potential liability for damages if enforced'
      );
    }
    
    // OUTPUT SUMMARY
    console.log('\n' + '=' .repeat(50));
    console.log('📊 VALIDATION SUMMARY:');
    console.log(`  Status: ${validation.valid ? '✅ VALID' : '❌ INVALID'}`);
    console.log(`  Errors: ${validation.errors.length}`);
    console.log(`  Warnings: ${validation.warnings.length}`);
    console.log(`  Void Risk: ${validation.voidRisks.length > 0 ? 'HIGH' : 'LOW'}`);
    console.log('=' .repeat(50));
    
    return validation;
  }
  
  /**
   * What Book 4 recommends: Batch validation of historical orders
   */
  async auditHistoricalOrders(orderPaths: string[]): Promise<any> {
    console.log('📊 HISTORICAL ORDER AUDIT');
    console.log(`Checking ${orderPaths.length} orders for void indicators...`);
    
    const results = {
      totalOrders: orderPaths.length,
      validOrders: 0,
      ordersWithErrors: 0,
      ordersWithWarnings: 0,
      commonDefects: {},
      recommendations: []
    };
    
    for (const path of orderPaths) {
      // Would read actual order
      const orderText = `Order from ${path}`;
      const validation = await this.validateOrder(orderText);
      
      if (validation.valid) {
        results.validOrders++;
      }
      if (validation.errors.length > 0) {
        results.ordersWithErrors++;
        
        // Track common defects
        validation.errors.forEach((error: any) => {
          const key = error.rule;
          results.commonDefects[key] = (results.commonDefects[key] || 0) + 1;
        });
      }
      if (validation.warnings.length > 0) {
        results.ordersWithWarnings++;
      }
    }
    
    // Generate audit recommendations
    if (results.ordersWithErrors > results.totalOrders * 0.1) {
      results.recommendations.push(
        'Significant defect rate detected',
        'Implement mandatory AI validation before sealing',
        'Provide additional training on CPR 40.2',
        'Review template orders for compliance'
      );
    }
    
    console.log('\n📊 AUDIT RESULTS:');
    console.log(`  Valid orders: ${results.validOrders}/${results.totalOrders}`);
    console.log(`  Orders with errors: ${results.ordersWithErrors}`);
    console.log(`  Orders with warnings: ${results.ordersWithWarnings}`);
    console.log('\n  Most common defects:');
    Object.entries(results.commonDefects)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([rule, count]) => {
        console.log(`    - ${rule}: ${count} orders`);
      });
    
    return results;
  }
  
  /**
   * The solution Book 4 proposes
   */
  getProposedSolution(): string {
    return `
# PROPOSED SOLUTION: AI VALIDATION FOR ALL COURT ORDERS

## The Problem (What Book 4 Exposes):
- Unknown number of void orders being enforced
- No systematic checking for void indicators
- Victims don't know orders are challengeable
- System depends on this ignorance

## The Solution:
1. **Mandatory AI Validation** before any order is sealed
2. **Automatic Void Detection** using rules-based system
3. **Real-time Warnings** to judges about defects
4. **Historical Audit** of existing orders
5. **Public Database** of validation results

## Benefits:
- Prevents void orders from being created
- Reduces successful appeals
- Protects vulnerable litigants
- Increases public confidence
- Reduces court workload from challenges

## Implementation:
- Phase 1: Voluntary pilot in one court
- Phase 2: Mandatory for possession/eviction orders
- Phase 3: All orders require validation
- Phase 4: Historical audit and remediation

## Resistance Expected:
- "Judges know the law" (but errors happen)
- "Too expensive" (cheaper than appeals)
- "Slows process" (takes seconds)
- "Not necessary" (then prove it with data)

## The Truth:
If courts have nothing to hide, they should welcome
validation. Resistance reveals the system depends on
void orders remaining unchallenged.

**Book 4's message: Implement AI validation or admit
the system prefers void orders to valid justice.**
    `;
  }
}