import type { Env } from '../types';

export class PDFReferenceService {
  private env: Env;
  private tunnelUrl = 'https://n161-pdfs.mobicycle.workers.dev.mobicycle.ee';

  constructor(env: Env) {
    this.env = env;
  }

  async listAvailablePDFs(): Promise<any[]> {
    try {
      const response = await fetch(`${this.tunnelUrl}/list`);
      if (!response.ok) throw new Error('Failed to fetch PDF list');
      return await response.json();
    } catch (error) {
      console.error('Error fetching PDF list:', error);
      return [];
    }
  }

  async fetchSimilarCases(caseType: string, grounds?: string[]): Promise<string[]> {
    // Get list of available PDFs
    const pdfs = await this.listAvailablePDFs();
    
    // Filter for relevant PDFs based on case type or grounds
    const relevant = pdfs.filter(pdf => 
      pdf.name.toLowerCase().includes(caseType.toLowerCase()) ||
      pdf.name.toLowerCase().includes('n161')
    ).slice(0, 3); // Get top 3 most relevant

    // Fetch and extract text from relevant PDFs
    const references = [];
    for (const pdf of relevant) {
      try {
        const response = await fetch(`${this.tunnelUrl}/pdf/${pdf.name}`);
        if (response.ok) {
          // Note: In production, you'd parse the PDF to extract text
          // For now, we'll use the PDF metadata
          references.push({
            name: pdf.name,
            url: `${this.tunnelUrl}/pdf/${pdf.name}`,
            size: pdf.size
          });
        }
      } catch (error) {
        console.error(`Error fetching PDF ${pdf.name}:`, error);
      }
    }

    return references;
  }

  async analyzeSuccessfulAppeal(pdfName: string): Promise<any> {
    // Use AI to analyze a successful appeal PDF
    const prompt = `Analyze this N161 appeal document: ${pdfName}
    Extract:
    1. Key grounds that were successful
    2. Legal arguments used
    3. Structure and formatting
    4. Language patterns
    Return as structured JSON.`;

    const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });

    return response.response;
  }

  async generateFromExamples(caseDetails: any, examples: any[]): Promise<string> {
    // Use successful examples to generate new N161 content
    const prompt = `Based on these successful N161 appeals: ${JSON.stringify(examples)}
    
    Generate a new N161 form for:
    Case: ${caseDetails.caseNumber}
    Appellant: ${caseDetails.appellantName}
    Grounds: ${caseDetails.grounds}
    
    Use the same successful patterns and language from the examples.
    Include all standard N161 sections.`;

    const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 3000
    });

    return response.response;
  }
}