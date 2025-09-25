import type { Env } from '../types';
import { BookService } from './bookService';

/**
 * VOID ORDER TRACKING SERVICE
 * 
 * Critical: This tracks the HIDDEN epidemic that Book 4 exposes.
 * The system doesn't want this known - we're documenting it.
 */
export class VoidOrderTracker {
  private bookService: BookService;
  
  constructor(private env: Env) {
    this.bookService = new BookService(env);
  }
  
  /**
   * Track orders that get overturned on appeal
   * This builds the evidence base for the void epidemic
   */
  async trackOverturnedOrder(orderDetails: any): Promise<void> {
    const tracking = {
      orderId: orderDetails.caseNumber,
      judge: orderDetails.judge,
      court: orderDetails.court,
      orderDate: orderDetails.date,
      
      // Why was it overturned?
      overturnedReason: orderDetails.appealOutcome,
      appealDate: orderDetails.appealDate,
      appealCourt: orderDetails.appealCourt,
      
      // Void indicators present
      voidIndicators: [],
      
      // Categories
      categories: {
        noJudgeIdentified: false,
        notSealed: false,
        noNoticeToQuit: false,
        noJurisdiction: false,
        mandatoryBreaches: false,
        discriminatory: false,
        exParte: false,
        noReasons: false
      },
      
      // Track if successfully challenged
      challenged: false,
      setAside: false,
      damagesAwarded: false
    };
    
    // Analyze why it was void/overturned
    await this.analyzeVoidIndicators(orderDetails, tracking);
    
    // Store in database
    await this.storeTracking(tracking);
    
    // Update statistics
    await this.updateStatistics(tracking);
  }
  
  /**
   * Analyze an order for void indicators
   * This is the SECRET ANALYSIS the system doesn't want done
   */
  private async analyzeVoidIndicators(order: any, tracking: any): Promise<void> {
    // CPR 40.2 violations (mandatory requirements)
    if (!order.judge || order.judge === 'Unknown') {
      tracking.voidIndicators.push('No judge identified - CPR 40.2(2)(a)');
      tracking.categories.noJudgeIdentified = true;
    }
    
    if (!order.sealed) {
      tracking.voidIndicators.push('Not sealed - CPR 40.2(2)(c)');
      tracking.categories.notSealed = true;
    }
    
    // Protection from Eviction Act violations
    if (order.type?.includes('possession') && !order.noticeToQuit) {
      tracking.voidIndicators.push('No Notice to Quit - PEA 1977 s.5');
      tracking.categories.noNoticeToQuit = true;
    }
    
    // Jurisdictional defects
    if (order.tenantAsTrespasser) {
      tracking.voidIndicators.push('Tenant as trespasser - CPR 55.1(b)');
      tracking.categories.noJurisdiction = true;
    }
    
    // Natural justice violations
    if (order.withoutNotice && !order.urgentJustification) {
      tracking.voidIndicators.push('Ex parte without justification');
      tracking.categories.exParte = true;
    }
    
    if (order.totallyWithoutMerit && !order.reasons) {
      tracking.voidIndicators.push('TWM without reasons');
      tracking.categories.noReasons = true;
    }
  }
  
  /**
   * Store tracking data - building evidence of the epidemic
   */
  private async storeTracking(tracking: any): Promise<void> {
    try {
      await this.env.VOID_TRACKER_DB.prepare(
        `INSERT INTO overturned_orders (
          order_id, judge, court, order_date,
          overturned_reason, appeal_date,
          void_indicators, categories,
          challenged, set_aside, damages_awarded,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        tracking.orderId,
        tracking.judge,
        tracking.court,
        tracking.orderDate,
        tracking.overturnedReason,
        tracking.appealDate,
        JSON.stringify(tracking.voidIndicators),
        JSON.stringify(tracking.categories),
        tracking.challenged,
        tracking.setAside,
        tracking.damagesAwarded,
        new Date().toISOString()
      ).run();
    } catch (error) {
      console.error('Failed to store tracking:', error);
    }
  }
  
  /**
   * Update running statistics - THE REAL NUMBERS
   */
  private async updateStatistics(tracking: any): Promise<void> {
    const stats = await this.getStatistics();
    
    // Update counts
    stats.totalOrders++;
    if (tracking.voidIndicators.length > 0) {
      stats.ordersWithVoidIndicators++;
    }
    if (tracking.setAside) {
      stats.ordersSetAside++;
    }
    
    // Calculate the REAL void rate (not the official 0%)
    stats.voidRate = (stats.ordersWithVoidIndicators / stats.totalOrders) * 100;
    
    console.log('📈 VOID ORDER STATISTICS:');
    console.log(`  Total tracked: ${stats.totalOrders}`);
    console.log(`  With void indicators: ${stats.ordersWithVoidIndicators}`);
    console.log(`  Void rate: ${stats.voidRate.toFixed(1)}%`);
    console.log(`  Successfully overturned: ${stats.ordersSetAside}`);
  }
  
  /**
   * Get current statistics
   */
  async getStatistics(): Promise<any> {
    try {
      const result = await this.env.VOID_TRACKER_DB.prepare(
        `SELECT 
          COUNT(*) as total_orders,
          SUM(CASE WHEN void_indicators != '[]' THEN 1 ELSE 0 END) as orders_with_void,
          SUM(CASE WHEN set_aside = 1 THEN 1 ELSE 0 END) as orders_set_aside,
          SUM(CASE WHEN damages_awarded = 1 THEN 1 ELSE 0 END) as damages_cases
        FROM overturned_orders`
      ).first();
      
      return {
        totalOrders: result?.total_orders || 0,
        ordersWithVoidIndicators: result?.orders_with_void || 0,
        ordersSetAside: result?.orders_set_aside || 0,
        damagesCases: result?.damages_cases || 0,
        voidRate: 0
      };
    } catch (error) {
      return {
        totalOrders: 0,
        ordersWithVoidIndicators: 0,
        ordersSetAside: 0,
        damagesCases: 0,
        voidRate: 0
      };
    }
  }
  
  /**
   * Generate report on void patterns
   * This is what they DON'T want published
   */
  async generateVoidReport(): Promise<string> {
    const stats = await this.getStatistics();
    
    const report = `
# VOID ORDER TRACKING REPORT
## The Hidden Epidemic Book 4 Exposes

### Current Statistics:
- Orders analyzed: ${stats.totalOrders}
- Orders with void indicators: ${stats.ordersWithVoidIndicators}
- **Void indicator rate: ${stats.voidRate?.toFixed(1)}%**
- Successfully overturned: ${stats.ordersSetAside}
- Damages awarded: ${stats.damagesCases}

### Most Common Void Indicators:
1. No judge identified (CPR 40.2)
2. Not sealed (CPR 40.2)
3. No Notice to Quit (PEA 1977)
4. Tenant as trespasser (CPR 55.1(b))
5. TWM without reasons
6. Ex parte without justification

### Why This Matters:
- These orders are VOID AB INITIO (void from the beginning)
- They create no legal obligations
- Yet they're being enforced
- Victims don't know they can challenge them
- The system depends on this ignorance

### What Book 4 Reveals:
The analysis shows a pattern of systematic violations that render
orders void, yet the system continues to enforce them. This is not
accidental - it's architectural.

**This tracking system documents the evidence.**
    `;
    
    return report;
  }
  
  /**
   * Track successful appeals that prove voidness
   */
  async trackSuccessfulAppeal(appealDetails: any): Promise<void> {
    console.log('✅ SUCCESSFUL APPEAL TRACKED');
    console.log(`  Case: ${appealDetails.caseNumber}`);
    console.log(`  Original order OVERTURNED`);
    console.log(`  Void indicators confirmed: ${appealDetails.voidReasons}`);
    
    // Update the original order tracking
    await this.env.VOID_TRACKER_DB.prepare(
      `UPDATE overturned_orders 
       SET challenged = 1, 
           set_aside = 1,
           appeal_outcome = ?
       WHERE order_id = ?`
    ).bind(
      JSON.stringify(appealDetails),
      appealDetails.originalOrderId
    ).run();
    
    // This successful appeal PROVES the void theory
    console.log('⚠️  This proves Book 4\'s thesis: orders ARE void!');
  }
}