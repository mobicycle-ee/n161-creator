import type { Env } from '../types';
import { BookService } from '../services/bookService';

export class PermissionAgent {
  private bookService: BookService;
  
  constructor(private env: Env) {
    this.bookService = new BookService(env);
  }
  
  async populateSection4(orderDetails: any, grounds: any[]) {
    // Determine if permission is required
    const permissionAnalysis = await this.analyzePermissionRequirement(orderDetails);
    
    // Get Book 3 content on appeal procedures
    const appealContent = await this.bookService.getRelevantContent('appeals');
    
    // Prepare permission arguments if needed
    let permissionArguments = null;
    if (permissionAnalysis.required) {
      permissionArguments = await this.generatePermissionArguments(orderDetails, grounds);
    }
    
    const permissionPrompt = `
      Analyze permission requirements for this appeal:
      
      Order: ${JSON.stringify(orderDetails)}
      Grounds: ${JSON.stringify(grounds)}
      
      Consider CPR 52 requirements:
      1. Real prospect of success test
      2. Other compelling reason test
      3. Second appeals test (if applicable)
      
      Reference Book 3 knowledge on procedural requirements.
      
      Provide:
      - Whether permission required
      - Which test applies
      - Strength of permission case (percentage)
      - Key arguments for permission
    `;
    
    const analysis = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: permissionPrompt,
      max_tokens: 1200
    });
    
    const parsed = this.parsePermissionAnalysis(analysis.response);
    
    return {
      section: 'Section 4: Permission to Appeal',
      permissionRequired: permissionAnalysis.required,
      reason: permissionAnalysis.reason,
      test: parsed.test || this.determineTest(orderDetails),
      arguments: permissionArguments,
      prospects: parsed.prospects || this.assessProspects(grounds),
      compellingReasons: this.identifyCompellingReasons(orderDetails, grounds),
      bookReferences: appealContent.slice(0, 2),
      tips: this.getPermissionTips(permissionAnalysis.required),
      warnings: this.getPermissionWarnings(orderDetails, parsed)
    };
  }
  
  private async analyzePermissionRequirement(orderDetails: any) {
    const analysis = {
      required: true,
      reason: '',
      exceptions: []
    };
    
    // Most appeals require permission
    analysis.reason = 'Standard requirement under CPR 52.3';
    
    // Check for exceptions
    if (orderDetails.orderType?.includes('committal')) {
      analysis.required = false;
      analysis.reason = 'Committal orders - permission not required';
      analysis.exceptions.push('CPR 52.3(1)(a) exception');
    }
    
    if (orderDetails.orderType?.includes('refusal of habeas corpus')) {
      analysis.required = false;
      analysis.reason = 'Habeas corpus refusal - permission not required';
    }
    
    if (orderDetails.statutoryRight) {
      analysis.required = false;
      analysis.reason = 'Statutory right of appeal without permission';
      analysis.exceptions.push(orderDetails.statutoryRight);
    }
    
    return analysis;
  }
  
  private async generatePermissionArguments(orderDetails: any, grounds: any[]) {
    const arguments = {
      realProspect: [],
      compellingReason: [],
      publicImportance: [],
      proceduralIrregularity: []
    };
    
    // Real prospect arguments
    for (const ground of grounds) {
      if (ground.likelihood === 'high') {
        arguments.realProspect.push({
          ground: ground.title,
          reason: `Strong legal basis: ${ground.details[0] || ground.title}`,
          authority: ground.citations[0] || ''
        });
      }
    }
    
    // Check for void order arguments
    const voidIndicators = grounds.filter(g => 
      g.title.toLowerCase().includes('void') || 
      g.title.toLowerCase().includes('jurisdiction'));
    
    if (voidIndicators.length > 0) {
      arguments.compellingReason.push({
        reason: 'Order potentially void ab initio',
        detail: 'Void orders are nullities requiring immediate correction',
        authority: 'Anisminic v Foreign Compensation Commission [1969]'
      });
    }
    
    // Check for human rights violations
    const humanRights = grounds.filter(g => 
      g.title.toLowerCase().includes('article') || 
      g.title.toLowerCase().includes('echr') ||
      g.title.toLowerCase().includes('human rights'));
    
    if (humanRights.length > 0) {
      arguments.compellingReason.push({
        reason: 'Fundamental human rights violation',
        detail: 'Court obliged to remedy Convention breaches',
        authority: 'Human Rights Act 1998, s.6'
      });
    }
    
    // Public importance
    if (orderDetails.affectsOthers || orderDetails.precedentValue) {
      arguments.publicImportance.push({
        reason: 'Issue of general public importance',
        detail: 'Decision affects wider class of persons',
        impact: orderDetails.publicImpact || 'Significant precedent value'
      });
    }
    
    // Procedural irregularities
    if (orderDetails.proceduralDefects) {
      arguments.proceduralIrregularity = orderDetails.proceduralDefects.map((defect: any) => ({
        defect: defect,
        impact: 'Denied fair hearing',
        remedy: 'Appeal necessary to cure defect'
      }));
    }
    
    return arguments;
  }
  
  private determineTest(orderDetails: any): string {
    if (orderDetails.isSecondAppeal) {
      return 'Important point of principle or practice OR special reason (CPR 52.7)';
    }
    
    return 'Real prospect of success OR compelling reason (CPR 52.6)';
  }
  
  private assessProspects(grounds: any[]): any {
    const highGrounds = grounds.filter(g => g.likelihood === 'high').length;
    const mediumGrounds = grounds.filter(g => g.likelihood === 'medium').length;
    const totalGrounds = grounds.length;
    
    let percentage = 0;
    let assessment = 'Weak';
    
    if (highGrounds > 0) {
      percentage = Math.min(60 + (highGrounds * 15), 95);
      assessment = 'Strong';
    } else if (mediumGrounds >= 2) {
      percentage = 40 + (mediumGrounds * 10);
      assessment = 'Reasonable';
    } else if (totalGrounds > 0) {
      percentage = 20 + (totalGrounds * 5);
      assessment = 'Arguable';
    }
    
    return {
      percentage,
      assessment,
      summary: `${highGrounds} strong grounds, ${mediumGrounds} moderate grounds`
    };
  }
  
  private identifyCompellingReasons(orderDetails: any, grounds: any[]): string[] {
    const reasons = [];
    
    if (grounds.some(g => g.title.toLowerCase().includes('void'))) {
      reasons.push('Order may be void ab initio - nullity requiring correction');
    }
    
    if (orderDetails.urgentConsequences) {
      reasons.push('Urgent consequences requiring immediate judicial consideration');
    }
    
    if (orderDetails.irreparableHarm) {
      reasons.push('Irreparable harm if appeal not heard');
    }
    
    if (grounds.some(g => g.title.toLowerCase().includes('bias'))) {
      reasons.push('Apparent bias undermining judicial integrity');
    }
    
    if (orderDetails.affectsChildren) {
      reasons.push('Welfare of children at stake');
    }
    
    return reasons;
  }
  
  private parsePermissionAnalysis(response: string): any {
    const parsed: any = {
      test: null,
      prospects: null,
      keyArguments: []
    };
    
    if (response.includes('real prospect')) {
      parsed.test = 'Real prospect of success test';
    }
    if (response.includes('compelling reason')) {
      if (parsed.test) {
        parsed.test += ' OR compelling reason';
      } else {
        parsed.test = 'Compelling reason test';
      }
    }
    
    const percentMatch = response.match(/(\d+)%/);
    if (percentMatch) {
      const percent = parseInt(percentMatch[1]);
      parsed.prospects = {
        percentage: percent,
        assessment: percent > 60 ? 'Strong' : percent > 40 ? 'Reasonable' : 'Weak'
      };
    }
    
    return parsed;
  }
  
  private getPermissionTips(required: boolean): string[] {
    if (!required) {
      return [
        'Permission not required - proceed directly to full appeal',
        'Still comply with all other procedural requirements',
        'File within time limits'
      ];
    }
    
    return [
      'Address both limbs: real prospect AND compelling reason',
      'Focus on strongest 2-3 grounds',
      'Cite specific legal authorities',
      'Keep permission application concise (3-4 pages max)',
      'Highlight any urgency or irreparable harm',
      'Reference any procedural unfairness below'
    ];
  }
  
  private getPermissionWarnings(orderDetails: any, parsed: any): string[] {
    const warnings = [];
    
    if (orderDetails.isSecondAppeal) {
      warnings.push('Second appeal - higher threshold applies (CPR 52.7)');
    }
    
    if (parsed.prospects?.percentage < 40) {
      warnings.push('Weak prospects - strengthen arguments or reconsider appeal');
    }
    
    if (!orderDetails.grounds || orderDetails.grounds.length === 0) {
      warnings.push('No grounds provided - permission likely to be refused');
    }
    
    return warnings;
  }
}