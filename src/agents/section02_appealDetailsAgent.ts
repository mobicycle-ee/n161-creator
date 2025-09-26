import type { Env } from '../types';
import { BookService } from '../services/bookService';

export class AppealDetailsAgent {
  private bookService: BookService;
  
  constructor(private env: Env) {
    this.bookService = new BookService(env);
  }
  
  async analyzeAppealType(section1Results: any, sendUpdate: (msg: string) => void) {
    sendUpdate('📂 Loading previously saved N161 form...');
    sendUpdate('✅ N161 form loaded with Section 1 data');
    sendUpdate('');
    sendUpdate('📊 Starting Section 2: Appeal Details');
    sendUpdate('I will now work on the appeal details section.');
    sendUpdate('');
    
    const orderDetails = section1Results.caseDetails;
    const parties = section1Results.parties;
    
    sendUpdate(`Order: ${orderDetails.orderType || 'Possession Order'}`);
    sendUpdate(`Date: ${orderDetails.orderDate}`);
    
    // Determine appeal type
    sendUpdate('🔍 Determining appeal type...');
    const appealType = await this.determineAppealTypeFromOrder(orderDetails);
    sendUpdate(`✓ Type: ${appealType}`);
    
    // Determine route
    sendUpdate('🛤️ Determining appeal route...');
    const appealRoute = await this.determineAppealRoute(orderDetails);
    sendUpdate(`✓ Route: ${appealRoute}`);
    
    // Calculate deadline
    sendUpdate('⏰ Calculating appeal deadline...');
    const deadline = this.calculateDeadline(orderDetails.orderDate);
    sendUpdate(`✓ Deadline: ${deadline}`);
    
    // Check strategic considerations
    sendUpdate('📚 Checking strategic guidance from legal books...');
    const strategicContent = await this.bookService.getRelevantContent('appeals strategy');
    sendUpdate(`✓ Found ${strategicContent.length} strategic precedents`);

    // Surface the actual N161 Section 2 question set for transparency
    const sectionQuestions = this.buildSection2Questions(orderDetails, appealType, appealRoute);
    sendUpdate('📝 Processing Section 2 Questions:');
    sendUpdate('');
    sectionQuestions.forEach((qa, index) => {
      sendUpdate(`📝 Question 2.${index + 1}: ${qa.question}`);
      sendUpdate(`✅ Answer: ${qa.answer}`);
      sendUpdate(`📄 Writing to N161 form: Field 2.${index + 1} = "${qa.answer}"`);
      sendUpdate('');
    });
    
    sendUpdate('💾 Saving N161 form with Section 2 data...');
    sendUpdate('✅ N161 form saved successfully');
    sendUpdate('');
    
    const result = {
      section: 'Section 2: Nature of Appeal',
      appealType: appealType,
      route: appealRoute,
      deadline: deadline,
      targetCourt: 'High Court, Queen\'s Bench Division',
      permissionRequired: true,
      strategicConsiderations: strategicContent.slice(0, 2),
      questions: sectionQuestions,
      output: this.generateSection2Output(appealType, appealRoute, deadline)
    };
    
    sendUpdate('✅ Section 2 Complete: Appeal route determined');
    sendUpdate(`📊 Result: ${appealType} - Deadline ${deadline}`);
    
    return result;
  }

  private async determineAppealTypeFromOrder(orderDetails: any): Promise<string> {
    if (orderDetails.orderType?.includes('Possession')) {
      return 'Appeal against Final Possession Order';
    } else if (orderDetails.orderType?.includes('Injunction')) {
      return 'Appeal against Injunction Order';
    } else if (orderDetails.orderType?.includes('Case Management')) {
      return 'Appeal against Case Management Decision';
    }
    return 'Appeal against Final Order';
  }
  
  private async determineAppealRoute(orderDetails: any): Promise<string> {
    // First appeal from County Court goes to High Court
    if (orderDetails.courtName?.includes('County Court')) {
      return 'First Appeal - County Court to High Court';
    } else if (orderDetails.courtName?.includes('High Court')) {
      return 'Second Appeal - High Court to Court of Appeal';
    }
    return 'First Appeal';
  }

  private calculateDeadline(orderDate: string): string {
    const date = new Date(orderDate.replace(/\//g, '-'));
    date.setDate(date.getDate() + 21); // Standard 21 day deadline
    return date.toLocaleDateString('en-GB');
  }

  private buildSection2Questions(orderDetails: any, appealType: string, appealRoute: string) {
    const courtAnswer = this.formatCourtAnswer(orderDetails);
    const judgeName = orderDetails?.judge || 'Judge to be confirmed';
    const judgeStatus = orderDetails?.judgeStatus || this.inferJudgeStatus(judgeName);
    const decisionDate = orderDetails?.orderDate || 'Decision date to confirm';
    const previousAppeal = this.inferPreviousAppealDecision(orderDetails, appealRoute);

    return [
      {
        question: 'From which court is the appeal being brought (and division, if High Court)?',
        answer: courtAnswer
      },
      {
        question: 'What is the name of the judge whose decision you want to appeal?',
        answer: judgeName
      },
      {
        question: 'What is the status of that judge?',
        answer: judgeStatus
      },
      {
        question: 'What is the date of the decision you wish to appeal?',
        answer: decisionDate
      },
      {
        question: 'Is the decision you wish to appeal itself a previous appeal decision?',
        answer: previousAppeal
      }
    ];
  }

  private formatCourtAnswer(orderDetails: any): string {
    if (!orderDetails) {
      return 'Court to be identified';
    }

    const courtName = orderDetails.courtName || 'Court to be confirmed';
    const division = orderDetails.courtDivision || this.inferCourtDivision(courtName);

    if (division && !courtName.toLowerCase().includes(division.toLowerCase())) {
      return `${courtName} (${division})`;
    }

    return division ? `${courtName} (${division})` : courtName;
  }

  private inferCourtDivision(courtName: string): string | null {
    if (!courtName) return null;
    const lower = courtName.toLowerCase();

    if (lower.includes('high court')) {
      if (lower.includes('queen') || lower.includes('king')) {
        return "King's Bench Division";
      }
      if (lower.includes('chancery')) return 'Chancery Division';
      if (lower.includes('family')) return 'Family Division';
      return "King's Bench Division";
    }

    if (lower.includes('county court')) {
      return 'County Court';
    }

    if (lower.includes('court of appeal')) {
      return 'Court of Appeal (Civil Division)';
    }

    return null;
  }

  private inferJudgeStatus(judgeName: string): string {
    if (!judgeName) {
      return 'Status to be confirmed';
    }

    const lower = judgeName.toLowerCase();
    if (lower.includes('hhj')) {
      return 'Circuit Judge (HHJ)';
    }
    if (lower.includes('deputy high') || lower.includes('high court')) {
      return 'High Court Judge or Deputy';
    }
    if (lower.includes('master')) {
      return 'Master';
    }
    if (lower.includes('district')) {
      return 'District Judge';
    }
    if (lower.includes('recorder')) {
      return 'Recorder';
    }
    if (lower.includes('kc') || lower.includes('qc')) {
      return 'High Court Judge or Deputy';
    }
    return 'Judicial status to confirm';
  }

  private inferPreviousAppealDecision(orderDetails: any, appealRoute: string): string {
    const orderType = orderDetails?.orderType?.toLowerCase() || '';
    const routeLower = appealRoute?.toLowerCase() || '';

    if (routeLower.includes('second appeal')) {
      return 'Yes – this follows a previous appeal decision';
    }

    if (orderType.includes('permission to appeal') || orderType.includes('refusal of permission')) {
      return 'Yes – reviewing a prior appeal/permission decision';
    }

    if (orderType.includes('judicial review') || orderType.includes('totally without merit')) {
      return 'Yes – decision arises from a previous review stage';
    }

    if (orderType.includes('possession') || orderType.includes('final order')) {
      return 'No – this is a first appeal against a final order';
    }

    return 'Unknown – confirm whether this follows an earlier appeal';
  }

  private generateSection2Output(appealType: string, route: string, deadline: string): string {
    return `
SECTION 2: NATURE OF APPEAL

Appeal Type: ${appealType}
Appeal Route: ${route}
Target Court: High Court, Queen's Bench Division
Permission Required: Yes
Deadline for Filing: ${deadline}

The Appellant seeks permission to appeal and appeals against the order on the grounds set out in Section 6 below.
    `.trim();
  }
  
  async populateSection2(orderDetails: any, context?: any) {
    // Determine appeal type and route
    const appealType = this.determineAppealType(orderDetails);
    const appealRoute = this.determineAppealRoute(orderDetails);
    
    // Get strategic content from books
    const strategicContent = await this.bookService.getRelevantContent('appeals');
    const voidContent = await this.bookService.getRelevantContent('void orders');
    
    const detailsPrompt = `
      Generate N161 Section 2 appeal details based on:
      
      Order: ${JSON.stringify(orderDetails)}
      Context: ${JSON.stringify(context)}
      
      Determine:
      1. Whether appealing final order or case management decision
      2. Appeal route (first appeal or second appeal)
      3. Whether permission required (usually yes)
      4. Appropriate appeal court
      5. Time limits (21 days standard, 7 days for some orders)
      
      Consider void order possibility from Book 4 knowledge.
      
      Provide structured response with:
      - Appeal type
      - Target court
      - Permission requirements
      - Deadline calculation
      - Strategic considerations
    `;
    
    const details = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: detailsPrompt,
      max_tokens: 1000
    });
    
    const parsedDetails = this.parseAppealDetails(details.response);
    
    // Calculate deadlines
    const deadlines = this.calculateDeadlines(orderDetails.orderDate);
    
    // Check if void challenge is more appropriate
    const voidAssessment = await this.assessVoidAlternative(orderDetails, voidContent);
    
    return {
      section: 'Section 2: Nature of Appeal',
      appealType: parsedDetails.appealType || appealType,
      appealRoute: parsedDetails.appealRoute || appealRoute,
      targetCourt: parsedDetails.targetCourt || this.getTargetCourt(orderDetails),
      permissionRequired: parsedDetails.permissionRequired !== false,
      deadlines,
      voidAlternative: voidAssessment,
      strategicNotes: parsedDetails.strategic || [],
      bookReferences: strategicContent.slice(0, 3),
      warnings: this.getWarnings(deadlines, orderDetails)
    };
  }
  
  private determineAppealType(orderDetails: any): string {
    const orderType = orderDetails.orderType?.toLowerCase() || '';
    
    if (orderType.includes('final') || orderType.includes('possession') || 
        orderType.includes('judgment')) {
      return 'Final Order';
    }
    
    if (orderType.includes('interim') || orderType.includes('directions') || 
        orderType.includes('case management')) {
      return 'Case Management Decision';
    }
    
    return 'Order (Type to be determined)';
  }
  
  private determineAppealRouteSync(orderDetails: any): string {
    // First appeal unless this is already from an appeal
    if (orderDetails.courtLevel?.includes('Circuit Judge') && 
        orderDetails.previousCourt?.includes('District Judge')) {
      return 'Second Appeal (Court of Appeal)';
    }
    
    return 'First Appeal';
  }
  
  private calculateDeadlines(orderDate: string): any {
    const deadlines: any = {
      standard: null,
      actual: null,
      daysRemaining: null,
      isUrgent: false
    };
    
    if (!orderDate) return deadlines;
    
    const orderDateObj = new Date(orderDate);
    const today = new Date();
    
    // Standard 21 days
    const standardDeadline = new Date(orderDateObj);
    standardDeadline.setDate(standardDeadline.getDate() + 21);
    deadlines.standard = standardDeadline.toISOString().split('T')[0];
    
    // Calculate days remaining
    const msRemaining = standardDeadline.getTime() - today.getTime();
    deadlines.daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
    
    // Check if urgent
    deadlines.isUrgent = deadlines.daysRemaining <= 7;
    
    // Set actual deadline
    deadlines.actual = deadlines.standard;
    
    return deadlines;
  }
  
  private async assessVoidAlternative(orderDetails: any, voidContent: any[]) {
    if (!voidContent || voidContent.length === 0) {
      return null;
    }
    
    const assessment = {
      recommended: false,
      reason: '',
      confidence: 0
    };
    
    // Check for void indicators
    if (!orderDetails.judge || orderDetails.judge === 'Unknown') {
      assessment.recommended = true;
      assessment.reason = 'No judge identified - CPR 40.2 violation';
      assessment.confidence = 85;
    }
    
    if (orderDetails.orderType?.includes('without notice')) {
      assessment.recommended = true;
      assessment.reason = 'Ex parte order - potential Article 6 violation';
      assessment.confidence = 75;
    }
    
    return assessment.recommended ? assessment : null;
  }
  
  private parseAppealDetails(response: string): any {
    const details: any = {
      appealType: null,
      appealRoute: null,
      targetCourt: null,
      permissionRequired: true,
      strategic: []
    };
    
    const lines = response.split('\n');
    
    for (const line of lines) {
      const lower = line.toLowerCase();
      
      if (lower.includes('final order')) {
        details.appealType = 'Final Order';
      } else if (lower.includes('case management')) {
        details.appealType = 'Case Management Decision';
      }
      
      if (lower.includes('circuit judge') && lower.includes('target')) {
        details.targetCourt = 'Circuit Judge';
      } else if (lower.includes('high court')) {
        details.targetCourt = 'High Court';
      } else if (lower.includes('court of appeal')) {
        details.targetCourt = 'Court of Appeal';
      }
      
      if (lower.includes('permission not required')) {
        details.permissionRequired = false;
      }
      
      if (lower.includes('strategic') || lower.includes('consider')) {
        details.strategic.push(line.trim());
      }
    }
    
    return details;
  }
  
  private getTargetCourt(orderDetails: any): string {
    const currentCourt = orderDetails.courtLevel || '';
    
    if (currentCourt.includes('District Judge')) {
      return 'Circuit Judge';
    }
    if (currentCourt.includes('Circuit Judge')) {
      return 'High Court Judge';
    }
    if (currentCourt.includes('Master')) {
      return 'High Court Judge';
    }
    
    return 'To be determined';
  }
  
  private getWarnings(deadlines: any, orderDetails: any): string[] {
    const warnings = [];
    
    if (deadlines.isUrgent) {
      warnings.push(`URGENT: Only ${deadlines.daysRemaining} days remaining to appeal`);
    }
    
    if (deadlines.daysRemaining < 0) {
      warnings.push('DEADLINE PASSED: Consider application for extension of time');
    }
    
    if (!orderDetails.orderDate) {
      warnings.push('No order date provided - cannot calculate deadline');
    }
    
    if (!orderDetails.sealed) {
      warnings.push('Order may not be sealed - verify before appealing');
    }
    
    return warnings;
  }
}
