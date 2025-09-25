import type { Env, Order } from '../types';
import { PDFReferenceService } from './pdfReferenceService';

export class AIService {
  private env: Env;
  private pdfService: PDFReferenceService;

  constructor(env: Env) {
    this.env = env;
    this.pdfService = new PDFReferenceService(env);
  }

  async analyzeOrderForAppeal(order: Order): Promise<{
    grounds: string[];
    evidence: string[];
    skeletonPoints: string[];
    witnessStatements: string[];
  }> {
    const prompt = `Analyze this court order for potential appeal grounds:
      Case: ${order.caseNumber}
      Judge: ${order.judge}
      Date: ${order.orderDate}
      Decision: ${order.decision}
      
      Identify:
      1. Potential grounds of appeal (errors of law, procedural irregularities, etc.)
      2. Evidence that would support the appeal
      3. Key skeleton argument points
      4. Potential witness statements needed
      
      Format as JSON with keys: grounds, evidence, skeletonPoints, witnessStatements (all arrays of strings)`;

    const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    return response.response || {
      grounds: [],
      evidence: [],
      skeletonPoints: [],
      witnessStatements: []
    };
  }

  async generateN161Form(order: Order, appellantDetails: any): Promise<string> {
    // First, try to find similar successful cases
    const similarCases = await this.pdfService.fetchSimilarCases(
      order.caseNumber,
      ['judicial review', 'procedural error'] // Example grounds
    );

    let prompt = `Generate N161 Notice of Appeal form content for:
      Appellant: ${appellantDetails.name}
      Case: ${order.caseNumber}
      Original Decision Date: ${order.orderDate}`;

    if (similarCases.length > 0) {
      prompt += `\n\nReference these similar successful appeals: ${JSON.stringify(similarCases)}
      Use similar language patterns and structure that worked in these cases.`;
    }

    prompt += `\n\nInclude all standard N161 sections. Format as structured text.`;

    const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 2000
    });

    return response.response;
  }

  async generateGroundsOfAppeal(order: Order, analysis: any): Promise<string> {
    const prompt = `Generate formal grounds of appeal for case ${order.caseNumber}.
      
      Based on: ${JSON.stringify(analysis.grounds)}
      
      Format each ground formally with:
      - Ground number
      - Title
      - Legal basis
      - Full explanation
      - Relief sought`;

    const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 2000
    });

    return response.response;
  }

  async generateSkeletonArgument(order: Order, grounds: string): Promise<string> {
    const prompt = `Generate skeleton argument for appeal in case ${order.caseNumber}.
      
      Grounds of appeal: ${grounds}
      
      Include:
      1. Introduction and parties
      2. Chronology of events
      3. Issues for determination
      4. Legal framework
      5. Submissions on each ground
      6. Conclusion and relief sought`;

    const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 3000
    });

    return response.response;
  }

  async generateEvidenceList(order: Order, analysis: any): Promise<string> {
    const prompt = `Generate evidence list for appeal in case ${order.caseNumber}.
      
      Suggested evidence: ${JSON.stringify(analysis.evidence)}
      
      Format as formal exhibit list with:
      - Exhibit reference
      - Description
      - Relevance to grounds of appeal
      - Source/availability`;

    const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 1500
    });

    return response.response;
  }

  async generateWitnessStatement(order: Order, witnessInfo: any): Promise<string> {
    const prompt = `Generate witness statement template for appeal in case ${order.caseNumber}.
      
      Witness: ${witnessInfo.name}
      Relevant to: ${witnessInfo.relevantGrounds}
      
      Include standard witness statement format with:
      - Statement of truth
      - Background
      - Relevant facts
      - Exhibits referenced
      - Signature section`;

    const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 2000
    });

    return response.response;
  }
}