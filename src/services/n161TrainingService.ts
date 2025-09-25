import type { Env } from '../types';
import { BookService } from './bookService';

export class N161TrainingService {
  private bookService: BookService;
  private trainingPath = '/Users/mobicycle/Library/Mobile Documents/com~apple~CloudDocs/0._Legal/Roman_House/applications_N161_N16a_N244_N461_N463/N161_appeal';
  
  constructor(private env: Env) {
    this.bookService = new BookService(env);
  }
  
  // Extract successful patterns from past N161s
  async getSuccessfulPatterns(sectionNumber: number): Promise<any> {
    const patterns = {
      section: sectionNumber,
      successfulPhrasings: [],
      legalAuthorities: [],
      structuralPatterns: [],
      judgePreferences: {},
      voidIndicators: [],
      commonMistakes: []
    };
    
    // Based on the Grounds_of_Appeal_K10CL521.md we just read
    if (sectionNumber === 6) { // Grounds section
      patterns.successfulPhrasings = [
        'This Court must decide whether English judges have the power to...',
        'Each question must be answered NO.',
        'To uphold the order below, this Court must explicitly state...',
        'Parliament\'s Command',
        'The Court\'s Own Rules',
        'The Fatal Admission'
      ];
      
      patterns.legalAuthorities = [
        'Rome I Regulation (EC) No 593/2008',
        'EU Withdrawal Agreement Article 66',
        'Section 7A EU (Withdrawal) Act 2018',
        'ECHR Article 14',
        'Protection from Eviction Act 1977 s.5',
        'Spencer v Taylor [2013] EWCA Civ 1600',
        'CPR 55.1(b)',
        'CPR 40.2'
      ];
      
      patterns.structuralPatterns = [
        'Start with constitutional/jurisdictional issues',
        'Frame as questions the court must answer',
        'Use "This Court Must State" to highlight absurdity',
        'End each ground with "but you cannot"',
        'Build from international → primary → secondary law'
      ];
      
      patterns.voidIndicators = [
        'No Notice to Quit = void ab initio',
        'Unsealed order = non-existent',
        'Discrimination in applying CPR = void',
        'Violation of international treaty = no jurisdiction'
      ];
    }
    
    if (sectionNumber === 7) { // Skeleton argument
      patterns.structuralPatterns = [
        'Preliminary statement setting stakes',
        'Numbered grounds with subheadings',
        'Constitutional crisis framing',
        'Binary choice presentation',
        'Historical record emphasis'
      ];
    }
    
    if (sectionNumber === 9) { // Relief sought
      patterns.successfulPhrasings = [
        'Stay all enforcement - no enforcement while jurisdiction disputed',
        'Declare proceedings void for lack of Notice to Quit',
        'Set aside all orders as void ab initio',
        'Award costs on indemnity basis',
        'If this Court claims power to override all law, it must state so explicitly'
      ];
    }
    
    return patterns;
  }
  
  // Get examples from specific courts
  async getCourtSpecificExamples(court: string): Promise<any> {
    const examples = {
      'chancery': {
        style: 'Formal, constitutional focus',
        emphasis: 'Jurisdictional limits, rule of law',
        avoidTopics: [],
        successRate: 'Higher for jurisdictional challenges'
      },
      'central_london_county_court': {
        style: 'Practical, procedural focus',
        emphasis: 'CPR violations, PEA breaches',
        avoidTopics: ['Overly academic arguments'],
        successRate: 'Mixed - depends on judge'
      },
      'court_of_appeal': {
        style: 'Legal principle focus',
        emphasis: 'Points of law, precedent conflicts',
        avoidTopics: ['Factual disputes'],
        successRate: 'Higher for clear legal errors'
      },
      'kings_bench': {
        style: 'Traditional, authority-based',
        emphasis: 'Statutory interpretation, precedent',
        avoidTopics: ['Novel arguments without authority'],
        successRate: 'Good for well-established principles'
      }
    };
    
    return examples[court.toLowerCase().replace(/[^a-z]/g, '_')] || examples.chancery;
  }
  
  // Learn from void order successes
  async getVoidOrderTemplates(): Promise<any> {
    // Based on your actual cases
    return {
      cpr40_2_violations: {
        template: 'HHJ [Name] admitted on [date] that the order was never sealed. CPR 40.2 requires...',
        authority: 'Orders must be sealed to take effect',
        success: 'Admission by judge is conclusive'
      },
      cpr55_1b_misuse: {
        template: 'DJ [Name] found the defendant "did become the tenant". CPR 55.1(b) excludes tenants from trespass claims...',
        authority: 'Cannot be both tenant and trespasser',
        success: 'Definitional impossibility'
      },
      pea_violations: {
        template: 'No Notice to Quit was served before proceedings commenced. Section 5 PEA states "SHALL... UNLESS"...',
        authority: 'Spencer v Taylor [2013] - proceedings void without NTQ',
        success: 'Mandatory statutory requirement'
      },
      discrimination: {
        template: 'UK tenant would be protected by CPR 55.1(b). EU tenant denied same protection...',
        authority: 'Article 14 ECHR, TCA Article 29',
        success: 'Clear discrimination on nationality'
      }
    };
  }
  
  // Get judge-specific insights
  async getJudgePatterns(judgeName?: string): Promise<any> {
    const patterns = {
      'HHJ Gerald': {
        admissions: ['Admitted unsealed order on 31.07.2025'],
        preferences: 'Responds to clear procedural breaches',
        avoidances: 'May ignore complex arguments',
        approach: 'Focus on his own admissions'
      },
      'DJ Greenidge': {
        findings: ['Found MobiCycle "did become the tenant"'],
        preferences: 'Factual determinations',
        avoidances: 'Legal complexity',
        approach: 'Use his own findings against the judgment'
      },
      'default': {
        preferences: 'Clear structure, numbered points',
        avoidances: 'Repetition, emotional language',
        approach: 'Professional, cite authorities'
      }
    };
    
    if (judgeName) {
      return patterns[judgeName] || patterns.default;
    }
    return patterns;
  }
  
  // Extract winning arguments
  async getWinningArguments(): Promise<string[]> {
    return [
      'Void ab initio - no jurisdiction from the start',
      'Mandatory statutory requirements not met',
      'Judge\'s own admission defeats the order',
      'International treaty obligations binding',
      'Discrimination violates ECHR',
      'Cannot enforce non-existent orders',
      'Parliament\'s commands are not optional',
      'Constitutional crisis if courts claim supremacy'
    ];
  }
  
  // Get strategic advice from past cases
  async getStrategicAdvice(situation: any): Promise<any> {
    const advice = {
      orderingGrounds: [
        'Lead with jurisdictional/void arguments',
        'Follow with international law',
        'Then primary legislation',
        'Finally procedural rules',
        'End with discrimination/fairness'
      ],
      presentation: [
        'Frame as limited judicial power',
        'Force explicit admissions',
        'Create binary choices',
        'Reference historical record',
        'Use judge\'s own words/findings'
      ],
      relief: [
        'Always request stay first',
        'Seek declarations not just set aside',
        'Include indemnity costs for egregious conduct',
        'Add alternative relief options',
        'Reference specific violations for each relief'
      ],
      warnings: [
        'Don\'t make personal attacks on judges',
        'Avoid conspiracy theories',
        'Stay focused on law not emotion',
        'Don\'t relitigate facts on appeal',
        'Keep grounds to 3-5 maximum'
      ]
    };
    
    return advice;
  }
  
  // Check if similar case succeeded
  async findSimilarSuccesses(caseDetails: any): Promise<any[]> {
    const similarities = [];
    
    if (caseDetails.noNoticeToQuit) {
      similarities.push({
        case: 'Spencer v Taylor [2013]',
        outcome: 'Proceedings void without NTQ',
        application: 'Direct precedent for voidness'
      });
    }
    
    if (caseDetails.unsealedOrder) {
      similarities.push({
        case: 'CPR 40.2 violation admitted by HHJ Gerald',
        outcome: 'Order non-existent',
        application: 'Judge admission is conclusive'
      });
    }
    
    if (caseDetails.tenantAsTrespasser) {
      similarities.push({
        case: 'DJ Greenidge finding',
        outcome: 'Cannot be both tenant and trespasser',
        application: 'Logical impossibility'
      });
    }
    
    return similarities;
  }
}