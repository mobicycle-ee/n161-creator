import type { Env } from '../types';
import { BookService } from '../services/bookService';

export class EvidenceSupportAgent {
  private bookService: BookService;
  
  constructor(private env: Env) {
    this.bookService = new BookService(env);
  }
  
  async organizeSection11(grounds: any[], existingEvidence?: any[], newEvidence?: any[]) {
    // Analyze evidence requirements for each ground
    const evidenceMap = await this.mapEvidenceToGrounds(grounds, existingEvidence);
    
    // Identify gaps and needed evidence
    const gaps = this.identifyEvidenceGaps(grounds, evidenceMap);
    
    // Get book content on evidence and procedure
    const systemicContent = await this.bookService.getRelevantContent('systemic issues');
    
    const evidencePrompt = `
      Analyze evidence requirements for N161 Section 11:
      
      Grounds: ${JSON.stringify(grounds)}
      Existing evidence: ${JSON.stringify(existingEvidence)}
      New evidence: ${JSON.stringify(newEvidence)}
      
      For each ground, identify:
      1. Evidence already in court record
      2. New evidence needed for appeal
      3. Whether fresh evidence meets Ladd v Marshall test
      4. Documentary vs witness evidence
      5. Expert evidence requirements
      
      Focus on evidence that proves:
      - Procedural defects
      - Jurisdictional issues  
      - Rights violations
      - Factual errors
    `;
    
    const analysis = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: evidencePrompt,
      max_tokens: 1500
    });
    
    const evidencePlan = this.structureEvidencePlan(analysis.response, evidenceMap, gaps);
    
    return {
      section: 'Section 11: Evidence in Support',
      evidenceMap,
      gaps,
      plan: evidencePlan,
      freshEvidenceTest: this.assessFreshEvidence(newEvidence),
      documentList: this.createDocumentList(existingEvidence, newEvidence),
      witnessRequirements: this.identifyWitnesses(grounds, evidencePlan),
      bookReferences: systemicContent.slice(0, 2),
      tips: this.getEvidenceTips(),
      warnings: this.getEvidenceWarnings(gaps, newEvidence)
    };
  }
  
  private async mapEvidenceToGrounds(grounds: any[], existingEvidence?: any[]): Promise<any> {
    const map: any = {};
    
    for (const ground of grounds) {
      map[ground.title] = {
        ground: ground.title,
        required: [],
        available: [],
        missing: [],
        strength: 'weak'
      };
      
      // Determine what evidence is needed
      if (ground.title.toLowerCase().includes('void')) {
        map[ground.title].required.push(
          'Order showing defects',
          'CPR 40.2 non-compliance proof',
          'Lack of jurisdiction evidence'
        );
      }
      
      if (ground.title.toLowerCase().includes('procedur')) {
        map[ground.title].required.push(
          'Hearing transcript or notes',
          'Correspondence showing no notice',
          'Applications not considered'
        );
      }
      
      if (ground.title.toLowerCase().includes('bias')) {
        map[ground.title].required.push(
          'Judge's comments transcript',
          'Previous rulings showing pattern',
          'Complaint correspondence'
        );
      }
      
      if (ground.title.toLowerCase().includes('fact')) {
        map[ground.title].required.push(
          'Documentary evidence contradicting findings',
          'Witness statements',
          'Expert reports if technical'
        );
      }
      
      // Map existing evidence
      if (existingEvidence) {
        for (const evidence of existingEvidence) {
          if (this.isRelevantToGround(evidence, ground)) {
            map[ground.title].available.push(evidence.description || evidence.name);
          }
        }
      }
      
      // Assess strength
      const availableCount = map[ground.title].available.length;
      const requiredCount = map[ground.title].required.length;
      
      if (availableCount >= requiredCount) {
        map[ground.title].strength = 'strong';
      } else if (availableCount >= requiredCount / 2) {
        map[ground.title].strength = 'moderate';
      } else {
        map[ground.title].strength = 'weak';
      }
    }
    
    return map;
  }
  
  private identifyEvidenceGaps(grounds: any[], evidenceMap: any): any[] {
    const gaps = [];
    
    for (const ground of grounds) {
      const mapping = evidenceMap[ground.title];
      if (!mapping) continue;
      
      for (const required of mapping.required) {
        const isAvailable = mapping.available.some((avail: string) => 
          avail.toLowerCase().includes(required.toLowerCase().substring(0, 10))
        );
        
        if (!isAvailable) {
          gaps.push({
            ground: ground.title,
            missing: required,
            importance: ground.likelihood === 'high' ? 'critical' : 'important',
            suggestion: this.suggestHowToObtain(required)
          });
        }
      }
    }
    
    return gaps;
  }
  
  private suggestHowToObtain(evidenceType: string): string {
    const lower = evidenceType.toLowerCase();
    
    if (lower.includes('transcript')) {
      return 'Request official transcript from court (Form EX107)';
    }
    if (lower.includes('order')) {
      return 'Obtain sealed copy from court office';
    }
    if (lower.includes('correspondence')) {
      return 'Compile emails, letters from your records';
    }
    if (lower.includes('witness')) {
      return 'Obtain signed witness statement on Form N265';
    }
    if (lower.includes('expert')) {
      return 'Commission expert report with CV attached';
    }
    if (lower.includes('judge')) {
      return 'Request judicial complaints history if applicable';
    }
    
    return 'Gather available documentation';
  }
  
  private assessFreshEvidence(newEvidence?: any[]): any {
    if (!newEvidence || newEvidence.length === 0) {
      return {
        hasNewEvidence: false,
        meetsTest: null,
        explanation: 'No fresh evidence to assess'
      };
    }
    
    const assessment = {
      hasNewEvidence: true,
      meetsTest: false,
      laddVMarshall: {
        notAvailableAtTrial: false,
        wouldHaveInfluencedResult: false,
        credible: false
      },
      explanation: ''
    };
    
    // Assess each piece of new evidence
    for (const evidence of newEvidence) {
      if (evidence.discoveredAfterOrder) {
        assessment.laddVMarshall.notAvailableAtTrial = true;
      }
      if (evidence.materiality === 'high' || evidence.contradictsFinding) {
        assessment.laddVMarshall.wouldHaveInfluencedResult = true;
      }
      if (evidence.source === 'official' || evidence.documentary) {
        assessment.laddVMarshall.credible = true;
      }
    }
    
    // Determine if test is met
    const { notAvailableAtTrial, wouldHaveInfluencedResult, credible } = assessment.laddVMarshall;
    
    if (notAvailableAtTrial && wouldHaveInfluencedResult && credible) {
      assessment.meetsTest = true;
      assessment.explanation = 'Fresh evidence meets Ladd v Marshall criteria';
    } else {
      assessment.explanation = 'Fresh evidence may not meet strict test - explain special circumstances';
    }
    
    return assessment;
  }
  
  private structureEvidencePlan(aiResponse: string, evidenceMap: any, gaps: any[]): any {
    const plan = {
      immediate: [],
      shortTerm: [],
      contingent: [],
      strategy: ''
    };
    
    // Immediate actions for critical gaps
    for (const gap of gaps) {
      if (gap.importance === 'critical') {
        plan.immediate.push({
          action: `Obtain ${gap.missing}`,
          method: gap.suggestion,
          deadline: '48 hours'
        });
      }
    }
    
    // Short term for important gaps
    for (const gap of gaps) {
      if (gap.importance === 'important') {
        plan.shortTerm.push({
          action: `Obtain ${gap.missing}`,
          method: gap.suggestion,
          deadline: '7 days'
        });
      }
    }
    
    // Parse AI response for additional strategies
    if (aiResponse.includes('transcript')) {
      plan.immediate.push({
        action: 'Order hearing transcript',
        method: 'Form EX107 to court',
        deadline: 'Today'
      });
    }
    
    if (aiResponse.includes('witness')) {
      plan.shortTerm.push({
        action: 'Prepare witness statements',
        method: 'Form N265 for each witness',
        deadline: '5 days'
      });
    }
    
    plan.strategy = 'Focus on documentary evidence first, then witness evidence if needed';
    
    return plan;
  }
  
  private createDocumentList(existing?: any[], newEvidence?: any[]): any[] {
    const documents = [];
    let docNumber = 1;
    
    // Existing court documents
    if (existing) {
      for (const doc of existing) {
        documents.push({
          number: docNumber++,
          description: doc.description || doc.name,
          type: 'Court record',
          date: doc.date || 'Unknown',
          relevance: doc.relevance || 'Supporting ground of appeal'
        });
      }
    }
    
    // New evidence
    if (newEvidence) {
      for (const doc of newEvidence) {
        documents.push({
          number: docNumber++,
          description: doc.description || doc.name,
          type: 'Fresh evidence',
          date: doc.date || 'Recent',
          relevance: doc.relevance || 'Not available at trial',
          laddVMarshall: doc.meetsTest || 'To be assessed'
        });
      }
    }
    
    return documents;
  }
  
  private identifyWitnesses(grounds: any[], plan: any): any[] {
    const witnesses = [];
    
    // Check if witness evidence needed
    const needsWitnesses = grounds.some(g => 
      g.title.toLowerCase().includes('fact') ||
      g.title.toLowerCase().includes('evidence') ||
      g.title.toLowerCase().includes('witness')
    );
    
    if (!needsWitnesses) {
      return [];
    }
    
    // Standard witnesses often needed
    witnesses.push({
      type: 'Appellant',
      purpose: 'First-hand account of proceedings',
      statement: 'Required - Form N265'
    });
    
    if (grounds.some(g => g.title.toLowerCase().includes('notice'))) {
      witnesses.push({
        type: 'Process server or postal worker',
        purpose: 'Prove lack of proper service',
        statement: 'If available'
      });
    }
    
    if (grounds.some(g => g.title.toLowerCase().includes('disab') || g.title.toLowerCase().includes('vulnerab'))) {
      witnesses.push({
        type: 'Medical professional',
        purpose: 'Confirm disability/vulnerability',
        statement: 'Medical report or statement'
      });
    }
    
    return witnesses;
  }
  
  private isRelevantToGround(evidence: any, ground: any): boolean {
    const evidenceStr = JSON.stringify(evidence).toLowerCase();
    const groundStr = JSON.stringify(ground).toLowerCase();
    
    // Check for keyword matches
    const keywords = ['void', 'procedur', 'bias', 'fact', 'jurisdiction', 'notice'];
    
    for (const keyword of keywords) {
      if (groundStr.includes(keyword) && evidenceStr.includes(keyword)) {
        return true;
      }
    }
    
    return false;
  }
  
  private getEvidenceTips(): string[] {
    return [
      'File evidence bundle 7 days before hearing',
      'Number all pages consecutively',
      'Include index at front',
      'Highlight relevant passages',
      'Provide copies for court and opponent',
      'Fresh evidence needs permission',
      'Focus on quality not quantity',
      'Ensure documents are legible'
    ];
  }
  
  private getEvidenceWarnings(gaps: any[], newEvidence?: any[]): string[] {
    const warnings = [];
    
    if (gaps.some(g => g.importance === 'critical')) {
      warnings.push('Critical evidence gaps - obtain urgently or appeal may fail');
    }
    
    if (newEvidence && newEvidence.length > 0) {
      warnings.push('Fresh evidence requires permission - address Ladd v Marshall test');
    }
    
    if (gaps.length > 5) {
      warnings.push('Many evidence gaps - prioritize most important');
    }
    
    if (!newEvidence || newEvidence.length === 0) {
      warnings.push('No new evidence - appeal limited to legal arguments');
    }
    
    return warnings;
  }
}