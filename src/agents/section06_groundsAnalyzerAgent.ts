import type { Env } from '../types';
import { BookService } from '../services/bookService';
import { N161TrainingService } from '../services/n161TrainingService';

export class GroundsAnalyzerAgent {
  private bookService: BookService;
  private trainingService: N161TrainingService;
  
  constructor(private env: Env) {
    this.bookService = new BookService(env);
    this.trainingService = new N161TrainingService(env);
  }
  
  async analyzeOrderAndCreateGrounds(orderText: string, orderPath?: string) {
    // Step 1: Read the actual order document
    const orderContent = orderPath ? 
      await this.readOrderDocument(orderPath) : orderText;
    
    // Step 2: Extract key defects from order
    const defects = await this.extractOrderDefects(orderContent);
    
    // Step 3: Check against all 6 books for violations
    const violations = await this.checkAgainstBooks(defects, orderContent);
    
    // Step 4: Generate grounds based on violations found
    const grounds = await this.generateGroundsFromViolations(violations);
    
    // Step 5: Apply successful patterns from past N161s
    const enhancedGrounds = await this.enhanceWithSuccessfulPatterns(grounds);
    
    return {
      grounds: enhancedGrounds,
      confidence: this.assessConfidence(enhancedGrounds),
      voidPossibility: this.checkVoidIndicators(defects),
      priority: this.prioritizeGrounds(enhancedGrounds),
      nextSteps: this.suggestNextSteps(enhancedGrounds)
    };
  }
  
  private async readOrderDocument(orderPath: string): Promise<string> {
    // This would read from the orders folder
    // For now, returning placeholder
    return `Order document from ${orderPath}`;
  }
  
  private async extractOrderDefects(orderContent: string): Promise<any> {
    const defects = {
      procedural: [],
      jurisdictional: [],
      statutory: [],
      constitutional: [],
      international: []
    };
    
    // Check for missing judge name (CPR 40.2)
    if (!orderContent.match(/(?:His|Her) Honour Judge|District Judge|Circuit Judge|Master/i)) {
      defects.procedural.push({
        defect: 'No judge identified',
        rule: 'CPR 40.2(2)(a)',
        consequence: 'Order potentially void'
      });
    }
    
    // Check for seal
    if (!orderContent.includes('seal') && !orderContent.includes('SEAL')) {
      defects.procedural.push({
        defect: 'No seal mentioned',
        rule: 'CPR 40.2(2)(c)',
        consequence: 'Order may not be enforceable'
      });
    }
    
    // Check for Notice to Quit in possession cases
    if (orderContent.includes('possession') && !orderContent.includes('Notice to Quit')) {
      defects.statutory.push({
        defect: 'No Notice to Quit mentioned',
        rule: 'Protection from Eviction Act 1977 s.5',
        consequence: 'Proceedings void ab initio'
      });
    }
    
    // Check for without notice/ex parte
    if (orderContent.match(/without notice|ex parte/i)) {
      defects.constitutional.push({
        defect: 'Ex parte order',
        rule: 'Article 6 ECHR',
        consequence: 'Right to fair hearing violated'
      });
    }
    
    // Check for tenant as trespasser (CPR 55.1(b))
    if (orderContent.includes('tenant') && orderContent.includes('trespass')) {
      defects.jurisdictional.push({
        defect: 'Tenant sued as trespasser',
        rule: 'CPR 55.1(b)',
        consequence: 'No jurisdiction - definitional impossibility'
      });
    }
    
    return defects;
  }
  
  private async checkAgainstBooks(defects: any, orderContent: string): Promise<any[]> {
    const violations = [];
    
    // Book 0: Democracy Is Dead - systemic violations
    if (defects.constitutional.length > 0) {
      const book0Content = await this.bookService.getBookContent(0, 1);
      violations.push({
        book: 'Book 0: Democracy Is Dead',
        violation: 'Systemic denial of due process',
        chapter: 'The Democracy Illusion',
        relevance: 'Pattern of constitutional violations'
      });
    }
    
    // Book 2: International Law violations
    if (orderContent.includes('EU') || orderContent.includes('Estonian')) {
      const book2Content = await this.bookService.getBookContent(2, 1);
      violations.push({
        book: 'Book 2: Britain & International Law',
        violation: 'Breach of EU Withdrawal Agreement',
        chapter: 'Treaty Protections Ignored',
        relevance: 'Discrimination against EU citizens'
      });
    }
    
    // Book 3: Domestic Law violations  
    if (defects.statutory.length > 0) {
      const book3Content = await this.bookService.getBookContent(3, 2);
      violations.push({
        book: 'Book 3: Britain & Domestic Law',
        violation: 'PEA 1977 breach',
        chapter: 'Eviction Protections in Freefall',
        relevance: 'Mandatory statutory requirements ignored'
      });
    }
    
    // Book 4: Void ab initio (68% of orders)
    if (defects.procedural.length > 0 || defects.jurisdictional.length > 0) {
      const book4Content = await this.bookService.getBookContent(4, 1);
      violations.push({
        book: 'Book 4: Void ab Initio',
        violation: 'Order void from inception',
        chapter: 'Exposing the Hidden Epidemic',
        relevance: '68% of orders contain void defects'
      });
    }
    
    return violations;
  }
  
  private async generateGroundsFromViolations(violations: any[]): Promise<any[]> {
    const grounds = [];
    const patterns = await this.trainingService.getSuccessfulPatterns(6);
    const templates = await this.trainingService.getVoidOrderTemplates();
    
    for (const violation of violations) {
      let ground: any = {
        title: '',
        details: [],
        citations: [],
        likelihood: 'medium'
      };
      
      if (violation.book.includes('Book 4')) {
        ground.title = 'Order Void Ab Initio - No Jurisdiction';
        ground.details = [
          'The order is void from inception and creates no legal obligations',
          templates.cpr40_2_violations.template,
          'As documented in comprehensive legal analysis, 68% of UK orders are void'
        ];
        ground.citations = [
          'Anisminic v Foreign Compensation [1969]',
          'CPR 40.2 - mandatory requirements',
          'Book 4: Void ab Initio, Chapter 1'
        ];
        ground.likelihood = 'high';
      } else if (violation.book.includes('Book 3')) {
        ground.title = 'Violation of Primary Legislation - PEA 1977';
        ground.details = [
          patterns.successfulPhrasings[3], // "Parliament's Command"
          templates.pea_violations.template,
          'Proceedings commenced without mandatory Notice to Quit'
        ];
        ground.citations = [
          'Protection from Eviction Act 1977 s.5',
          templates.pea_violations.authority,
          'Book 3: Britain & Domestic Law, Chapter 2'
        ];
        ground.likelihood = 'high';
      } else if (violation.book.includes('Book 2')) {
        ground.title = 'Violation of International Treaty Obligations';
        ground.details = [
          patterns.successfulPhrasings[2], // "To uphold this order..."
          templates.discrimination.template,
          'UK bound by Withdrawal Agreement and ECHR'
        ];
        ground.citations = [
          'EU Withdrawal Agreement Article 66',
          'ECHR Article 14',
          'Book 2: Britain & International Law'
        ];
        ground.likelihood = 'high';
      }
      
      if (ground.title) {
        grounds.push(ground);
      }
    }
    
    return grounds;
  }
  
  private async enhanceWithSuccessfulPatterns(grounds: any[]): Promise<any[]> {
    const patterns = await this.trainingService.getSuccessfulPatterns(6);
    const winningArgs = await this.trainingService.getWinningArguments();
    
    // Apply successful framing from past N161s
    return grounds.map(ground => ({
      ...ground,
      introduction: patterns.successfulPhrasings[0], // "This Court must decide..."
      framing: patterns.structuralPatterns[1], // "Frame as questions court must answer"
      conclusion: patterns.successfulPhrasings[5], // "but you cannot"
      winningAngle: winningArgs.find(arg => 
        ground.title.toLowerCase().includes(arg.toLowerCase().substring(0, 10))
      )
    }));
  }
  
  private checkVoidIndicators(defects: any): any {
    const voidIndicators = [];
    
    if (defects.procedural.some((d: any) => d.rule.includes('CPR 40.2'))) {
      voidIndicators.push('CPR 40.2 violation - mandatory requirement');
    }
    
    if (defects.statutory.some((d: any) => d.rule.includes('PEA'))) {
      voidIndicators.push('PEA violation - proceedings void ab initio');
    }
    
    if (defects.jurisdictional.length > 0) {
      voidIndicators.push('Jurisdictional defect - no power to make order');
    }
    
    return {
      isVoid: voidIndicators.length > 0,
      indicators: voidIndicators,
      confidence: voidIndicators.length > 2 ? 'HIGH' : 'MEDIUM'
    };
  }
  
  async analyze(orderDetails: any, context?: any) {
    // Get relevant void order content from books
    const voidContent = await this.bookService.getRelevantContent('void orders');
    const democracyContent = await this.bookService.getRelevantContent('democracy');
    const systemicContent = await this.bookService.getRelevantContent('systemic issues');
    
    // Get successful patterns from past N161s
    const successfulPatterns = await this.trainingService.getSuccessfulPatterns(6);
    const voidTemplates = await this.trainingService.getVoidOrderTemplates();
    const winningArguments = await this.trainingService.getWinningArguments();
    
    // Combine context with book knowledge
    const enhancedContext = {
      ...context,
      voidOrderKnowledge: voidContent,
      systemicIssues: [...democracyContent, ...systemicContent]
    };
    
    // Use AI to analyze with enhanced context
    const analysisPrompt = `
      Analyze this court order for appeal grounds, considering:
      1. Potential voidness (jurisdiction, mandatory breaches)
      2. International law violations (ECHR, UN treaties)
      3. Domestic law breaches (CPR, statutes)
      4. Systemic/constitutional issues
      5. Procedural irregularities
      
      Order details: ${JSON.stringify(orderDetails)}
      
      Reference knowledge from legal database:
      - Book 0: Democracy Is Dead (systemic failures)
      - Book 3: Britain & Domestic Law (CPR violations)
      - Book 4: Void ab Initio (void order doctrine)
      
      Provide specific, actionable grounds with:
      - Legal citations
      - Percentage likelihood of success
      - Priority ranking
      - Evidence needed
    `;
    
    const analysis = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: analysisPrompt,
      max_tokens: 2000
    });
    
    // Parse and structure the response
    const grounds = this.parseGrounds(analysis.response);
    
    return {
      grounds,
      bookReferences: enhancedContext,
      voidPossibility: this.assessVoidness(grounds),
      priority: this.prioritizeGrounds(grounds),
      nextSteps: this.suggestNextSteps(grounds)
    };
  }
  
  private assessConfidence(grounds: any[]): string {
    const highGrounds = grounds.filter(g => g.likelihood === 'high').length;
    if (highGrounds >= 2) return 'VERY HIGH';
    if (highGrounds >= 1) return 'HIGH';
    return 'MEDIUM';
  }
  
  private parseGrounds(response: string): any[] {
    // Extract and structure grounds from AI response
    const grounds = [];
    const lines = response.split('\n');
    let currentGround = null;
    
    for (const line of lines) {
      if (line.match(/^\d+\./)) {
        if (currentGround) grounds.push(currentGround);
        currentGround = {
          title: line.replace(/^\d+\.\s*/, ''),
          details: [],
          citations: [],
          likelihood: 'medium'
        };
      } else if (currentGround) {
        if (line.includes('Citation:') || line.includes('Ref:')) {
          currentGround.citations.push(line);
        } else if (line.includes('%')) {
          const match = line.match(/(\d+)%/);
          if (match) {
            const percent = parseInt(match[1]);
            currentGround.likelihood = percent > 70 ? 'high' : percent > 40 ? 'medium' : 'low';
          }
        } else if (line.trim()) {
          currentGround.details.push(line.trim());
        }
      }
    }
    
    if (currentGround) grounds.push(currentGround);
    return grounds;
  }
  
  private assessVoidness(grounds: any[]): boolean {
    // Check if any grounds suggest void order
    const voidIndicators = [
      'jurisdiction',
      'void',
      'nullity',
      'ultra vires',
      'mandatory',
      'fundamental'
    ];
    
    return grounds.some(g => 
      voidIndicators.some(indicator => 
        g.title.toLowerCase().includes(indicator) ||
        g.details.some((d: string) => d.toLowerCase().includes(indicator))
      )
    );
  }
  
  private prioritizeGrounds(grounds: any[]): any[] {
    // Sort grounds by priority
    return grounds.sort((a, b) => {
      const priorityMap: any = { 'high': 3, 'medium': 2, 'low': 1 };
      return priorityMap[b.likelihood] - priorityMap[a.likelihood];
    });
  }
  
  private suggestNextSteps(grounds: any[]): string[] {
    const steps = [];
    
    if (this.assessVoidness(grounds)) {
      steps.push('Consider immediate application to set aside as void');
      steps.push('Gather evidence of jurisdictional defects');
    }
    
    if (grounds.some(g => g.title.includes('international'))) {
      steps.push('Prepare ECHR application in parallel');
    }
    
    steps.push('File N161 within 21 days');
    steps.push('Request transcript of proceedings');
    steps.push('Identify and contact potential witnesses');
    
    return steps;
  }
}