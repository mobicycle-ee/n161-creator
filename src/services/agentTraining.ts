/**
 * AGENT TRAINING SERVICE
 * 
 * Pre-trains agents with book knowledge so they don't need to
 * read databases every time. Only learns new patterns.
 */

export class AgentTrainingService {
  private static trainingCache = new Map<string, any>();
  private static lastTrainingDate: Date | null = null;
  
  /**
   * Pre-train all agents with book knowledge
   * This runs ONCE on deployment, not every request
   */
  static async preTrainAgents(): Promise<void> {
    console.log('🎯 Pre-training agents with book knowledge...');
    
    // Training data from all 6 books (cached)
    const trainingData = {
      // Book 0: Democracy Is Dead
      systemicPatterns: [
        'Courts operate as private corporations',
        'Due process systematically denied',
        'Access to justice blocked by design'
      ],
      
      // Book 1: Legal Survival Guide  
      survivalTactics: [
        'Always request reasons for decisions',
        'Document everything in writing',
        'File protective appeals within deadlines'
      ],
      
      // Book 2: International Law
      internationalViolations: [
        'EU Withdrawal Agreement protections ignored',
        'ECHR Article 6 & 8 violations common',
        'Discrimination against foreign nationals'
      ],
      
      // Book 3: Domestic Law
      domesticViolations: [
        'CPR 40.2 requirements routinely ignored',
        'PEA 1977 Notice to Quit bypassed',
        'CPR 55.1(b) tenant protection violated'
      ],
      
      // Book 4: Void ab Initio (CORRECTED - no fake stats)
      voidIndicators: [
        'Orders without judge identification',
        'Unsealed orders being enforced',
        'No jurisdiction but proceeding anyway',
        'The void epidemic is HIDDEN - no tracking'
      ],
      
      // Book 5: Whistleblowers
      insiderTestimony: [
        'System knows orders are void',
        'Deliberate obfuscation tactics',
        'Lawyers complicit in the system'
      ],
      
      // Past successful N161 patterns
      successPatterns: [
        'This Court must decide whether...',
        'Each question must be answered NO',
        'To uphold this order, the Court must state...',
        'But you cannot'
      ]
    };
    
    // Cache the training
    this.trainingCache.set('base_training', trainingData);
    this.lastTrainingDate = new Date();
    
    console.log('✅ Agents pre-trained and ready');
  }
  
  /**
   * Get cached training for an agent
   */
  static getTraining(agentName: string): any {
    const baseTraining = this.trainingCache.get('base_training');
    const agentSpecific = this.trainingCache.get(agentName);
    
    return {
      ...baseTraining,
      ...agentSpecific,
      trained: true,
      trainingDate: this.lastTrainingDate
    };
  }
  
  /**
   * Learn from new successful appeal
   */
  static async learnFromSuccess(appealOutcome: any): Promise<void> {
    console.log('📚 Learning from successful appeal...');
    
    // Add to success patterns
    const patterns = this.trainingCache.get('success_patterns') || [];
    patterns.push({
      date: new Date(),
      case: appealOutcome.caseNumber,
      successfulGrounds: appealOutcome.grounds,
      judge: appealOutcome.judge
    });
    
    this.trainingCache.set('success_patterns', patterns);
    
    console.log('✅ New pattern learned');
  }
}