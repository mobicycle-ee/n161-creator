import type { Env } from '../types';
import { BookService } from '../services/bookService';

export class VoidDetectorAgent {
  private bookService: BookService;
  
  constructor(private env: Env) {
    this.bookService = new BookService(env);
  }
  
  async detect(orderText: string, orderDetails: any) {
    // Get Book 4 content on void orders
    const book4Knowledge = await this.getBook4Knowledge();
    
    // Get specific void patterns from Book 3
    const book3Patterns = await this.bookService.getRelevantContent('void orders');
    
    const voidPrompt = `
      You are an expert on void orders based on comprehensive legal analysis.
      
      Analyze this order for voidness using the following framework:
      
      ORDER TEXT:
      ${orderText || 'Not provided'}
      
      ORDER DETAILS:
      ${JSON.stringify(orderDetails)}
      
      CHECK FOR THESE VOID INDICATORS:
      
      1. JURISDICTIONAL DEFECTS (automatic void):
         - Court exceeded statutory powers
         - Wrong procedure used (e.g., trespass for tenant)
         - No legal basis for order
         - Acting ultra vires
      
      2. MANDATORY REQUIREMENT BREACHES (void if fundamental):
         - CPR 40.2 requirements missing (seal, signature, date)
         - CPR 55.1(b) misused
         - Notice requirements ignored
         - Statutory prerequisites not met
      
      3. INTERNATIONAL LAW VIOLATIONS (void under treaties):
         - ECHR Article 6 (fair trial) breached
         - ECHR Article 8 (family/home) violated
         - UN treaty obligations ignored
         - EU law conflicts (if applicable)
      
      4. FUNDAMENTAL RIGHTS VIOLATIONS:
         - No opportunity to be heard
         - No reasons given
         - Bias or apparent bias
         - Natural justice denied
      
      5. CONSTITUTIONAL BREACHES:
         - Separation of powers violated
         - Parliamentary sovereignty undermined
         - Rule of law breached
      
      PROVIDE:
      - Voidness assessment (Definitely Void / Likely Void / Possibly Void / Not Void)
      - Specific reasons with legal authority
      - Percentage confidence (0-100%)
      - Most compelling void argument
      - Counter-arguments to anticipate
    `;
    
    const voidAnalysis = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: voidPrompt,
      max_tokens: 1500
    });
    
    const assessment = this.parseVoidAssessment(voidAnalysis.response);
    
    return {
      assessment,
      book4References: book4Knowledge,
      voidIndicators: this.extractVoidIndicators(orderDetails, orderText),
      legalAuthorities: this.getRelevantAuthorities(assessment),
      actionPlan: this.createActionPlan(assessment)
    };
  }
  
  private async getBook4Knowledge() {
    const chapters = [];
    
    // Get key chapters from Book 4: Void ab Initio
    const keyChapters = [
      { num: 1, title: 'Exposing the Hidden Epidemic' },
      { num: 2, title: 'International Law Goes Ignored' },
      { num: 3, title: 'Domestic Law Gets Neutralized' },
      { num: 4, title: 'Escape Clauses' }
    ];
    
    for (const chapter of keyChapters) {
      try {
        const content = await this.bookService.getBookContent(4, chapter.num);
        if (content) {
          chapters.push({
            chapter: chapter.num,
            title: chapter.title,
            keyPoints: this.extractKeyPoints(content)
          });
        }
      } catch (error) {
        console.error(`Error fetching chapter ${chapter.num}:`, error);
      }
    }
    
    return chapters;
  }
  
  private extractKeyPoints(content: string): string[] {
    // Extract key sentences about voidness
    const points = [];
    const sentences = content.split('.');
    
    const keywords = ['void', 'nullity', 'jurisdiction', 'mandatory', 'invalid'];
    
    for (const sentence of sentences) {
      if (keywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
        points.push(sentence.trim() + '.');
        if (points.length >= 5) break;
      }
    }
    
    return points;
  }
  
  private parseVoidAssessment(response: string): any {
    const assessment: any = {
      status: 'Unknown',
      confidence: 0,
      reasons: [],
      primaryArgument: '',
      counterArguments: []
    };
    
    // Extract status
    if (response.includes('Definitely Void')) {
      assessment.status = 'Definitely Void';
    } else if (response.includes('Likely Void')) {
      assessment.status = 'Likely Void';
    } else if (response.includes('Possibly Void')) {
      assessment.status = 'Possibly Void';
    } else if (response.includes('Not Void')) {
      assessment.status = 'Not Void';
    }
    
    // Extract confidence percentage
    const percentMatch = response.match(/(\d+)%/);
    if (percentMatch) {
      assessment.confidence = parseInt(percentMatch[1]);
    }
    
    // Extract reasons
    const reasonsMatch = response.match(/reasons?:([\s\S]*?)(?:counter|percentage|confidence|$)/i);
    if (reasonsMatch) {
      assessment.reasons = reasonsMatch[1]
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[\-\*\d\.]+\s*/, '').trim());
    }
    
    // Set primary argument
    if (assessment.reasons.length > 0) {
      assessment.primaryArgument = assessment.reasons[0];
    }
    
    return assessment;
  }
  
  private extractVoidIndicators(orderDetails: any, orderText?: string): string[] {
    const indicators = [];
    
    // Check order details
    if (!orderDetails.judge || orderDetails.judge === 'Unknown') {
      indicators.push('No judge identified (CPR 40.2 violation)');
    }
    
    if (!orderDetails.orderDate) {
      indicators.push('No date on order (CPR 40.2 violation)');
    }
    
    if (orderDetails.orderType?.includes('trespass') && orderDetails.parties?.defendant?.includes('tenant')) {
      indicators.push('Trespass procedure used against tenant (CPR 55.1(b) misuse)');
    }
    
    // Check order text if available
    if (orderText) {
      if (!orderText.includes('seal') && !orderText.includes('SEAL')) {
        indicators.push('No seal mentioned (CPR 40.2 requirement)');
      }
      
      if (orderText.includes('without notice')) {
        indicators.push('Ex parte order (potential Article 6 ECHR violation)');
      }
    }
    
    return indicators;
  }
  
  private getRelevantAuthorities(assessment: any): string[] {
    const authorities = [];
    
    if (assessment.status.includes('Void')) {
      authorities.push('Anisminic v Foreign Compensation [1969] - jurisdiction cannot be exceeded');
      authorities.push('Ridge v Baldwin [1964] - void ab initio doctrine');
      authorities.push('Boddington v British Transport Police [1999] - void acts are nullities');
    }
    
    if (assessment.reasons.some((r: string) => r.toLowerCase().includes('echr'))) {
      authorities.push('ECHR Article 6 - Right to fair trial');
      authorities.push('ECHR Article 8 - Right to family life and home');
    }
    
    if (assessment.reasons.some((r: string) => r.toLowerCase().includes('cpr'))) {
      authorities.push('CPR 40.2 - Mandatory order requirements');
      authorities.push('CPR 55.1(b) - Trespass exception limitations');
    }
    
    return authorities;
  }
  
  private createActionPlan(assessment: any): string[] {
    const plan = [];
    
    if (assessment.status === 'Definitely Void' || assessment.status === 'Likely Void') {
      plan.push('URGENT: File application to set aside as void immediately');
      plan.push('Do NOT comply with void order');
      plan.push('Gather all evidence of voidness');
      plan.push('Consider reporting to police if enforcement attempted');
      plan.push('Prepare damages claim for any losses');
    } else if (assessment.status === 'Possibly Void') {
      plan.push('File protective N161 appeal within 21 days');
      plan.push('Simultaneously prepare void challenge');
      plan.push('Seek urgent legal advice on void argument');
      plan.push('Document all procedural defects');
    } else {
      plan.push('File standard N161 appeal');
      plan.push('Focus on merits rather than voidness');
      plan.push('Consider alternative grounds');
    }
    
    return plan;
  }
}