import type { Env } from '../types';
import { BookService } from '../services/bookService';

export class SupportingDocumentsAgent {
  private bookService: BookService;
  
  constructor(private env: Env) {
    this.bookService = new BookService(env);
  }
  
  async organizeSection13(orderDetails: any, grounds: any[], evidence: any[]) {
    // Create comprehensive document checklist
    const checklist = this.createDocumentChecklist(orderDetails, grounds);
    
    // Organize documents by category
    const organized = this.organizeByCategory(evidence);
    
    // Get book references for documentation strategy
    const legalContent = await this.bookService.getRelevantContent('appeals');
    
    const documentPrompt = `
      Create document list for N161 Section 13 based on:
      
      Order: ${JSON.stringify(orderDetails)}
      Grounds: ${JSON.stringify(grounds)}
      Available documents: ${JSON.stringify(evidence)}
      
      Required documents:
      1. The sealed order being appealed
      2. Appellant's notice (this form)
      3. Skeleton argument
      4. Grounds of appeal
      5. Evidence bundle
      6. Authorities bundle
      7. Chronology
      8. Transcript (if relying on)
      
      Optional but helpful:
      - Correspondence
      - Previous orders
      - Procedural applications
      - Costs schedules
      
      Format as paginated bundle with index.
    `;
    
    const analysis = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: documentPrompt,
      max_tokens: 1200
    });
    
    const bundle = this.createBundle(checklist, organized, analysis.response);
    
    return {
      section: 'Section 13: Documents Filed in Support',
      checklist,
      bundle,
      index: this.createIndex(bundle),
      missing: this.identifyMissingDocuments(checklist, evidence),
      filing: this.getFilingRequirements(),
      bookReferences: legalContent.slice(0, 2),
      tips: this.getDocumentTips(),
      warnings: this.getDocumentWarnings(checklist, bundle)
    };
  }
  
  private createDocumentChecklist(orderDetails: any, grounds: any[]): any {
    const checklist = {
      mandatory: [],
      recommended: [],
      optional: [],
      special: []
    };
    
    // Mandatory documents
    checklist.mandatory = [
      { name: 'Sealed order being appealed', required: true, included: false },
      { name: 'Appellant\'s Notice (N161)', required: true, included: true },
      { name: 'Grounds of Appeal', required: true, included: false },
      { name: 'Skeleton Argument', required: true, included: false }
    ];
    
    // Recommended based on case
    checklist.recommended = [
      { name: 'Chronology of events', required: false, included: false },
      { name: 'Bundle index', required: false, included: false },
      { name: 'Authorities bundle', required: false, included: false }
    ];
    
    // Add transcript if procedural grounds
    if (grounds.some(g => g.title.toLowerCase().includes('procedur') || 
                         g.title.toLowerCase().includes('bias'))) {
      checklist.mandatory.push({
        name: 'Hearing transcript or approved note',
        required: true,
        included: false
      });
    }
    
    // Add CPR/statute extracts if void grounds
    if (grounds.some(g => g.title.toLowerCase().includes('void'))) {
      checklist.recommended.push({
        name: 'CPR 40.2 extract',
        required: false,
        included: false
      });
      checklist.recommended.push({
        name: 'Relevant statute extracts',
        required: false,
        included: false
      });
    }
    
    // Special requirements
    if (orderDetails.method === 'Without notice/Ex parte') {
      checklist.special.push({
        name: 'Evidence of urgency justifying ex parte',
        required: false,
        included: false
      });
    }
    
    if (grounds.some(g => g.title.toLowerCase().includes('human rights'))) {
      checklist.special.push({
        name: 'Human Rights Act extracts',
        required: false,
        included: false
      });
      checklist.special.push({
        name: 'ECHR case law bundle',
        required: false,
        included: false
      });
    }
    
    // Optional documents
    checklist.optional = [
      { name: 'Correspondence between parties', required: false, included: false },
      { name: 'Previous court orders in case', required: false, included: false },
      { name: 'Witness statements', required: false, included: false },
      { name: 'Expert reports', required: false, included: false },
      { name: 'Photographs or plans', required: false, included: false }
    ];
    
    return checklist;
  }
  
  private organizeByCategory(evidence: any[]): any {
    const categories = {
      orders: [],
      pleadings: [],
      evidence: [],
      correspondence: [],
      authorities: [],
      other: []
    };
    
    for (const doc of evidence) {
      const lower = (doc.name || doc.description || '').toLowerCase();
      
      if (lower.includes('order') || lower.includes('judgment')) {
        categories.orders.push(doc);
      } else if (lower.includes('claim') || lower.includes('defence') || 
                 lower.includes('statement of case')) {
        categories.pleadings.push(doc);
      } else if (lower.includes('witness') || lower.includes('exhibit') || 
                 lower.includes('report')) {
        categories.evidence.push(doc);
      } else if (lower.includes('letter') || lower.includes('email') || 
                 lower.includes('correspondence')) {
        categories.correspondence.push(doc);
      } else if (lower.includes('case') || lower.includes('[') || 
                 lower.includes('cpr') || lower.includes('act')) {
        categories.authorities.push(doc);
      } else {
        categories.other.push(doc);
      }
    }
    
    return categories;
  }
  
  private createBundle(checklist: any, organized: any, aiResponse: string): any[] {
    const bundle = [];
    let pageNumber = 1;
    
    // Section A: Core Documents
    bundle.push({
      section: 'A',
      title: 'Core Documents',
      documents: [
        { pages: `${pageNumber}-${pageNumber+2}`, description: 'Appellant\'s Notice (N161)' },
        { pages: `${pageNumber+3}-${pageNumber+10}`, description: 'Grounds of Appeal' },
        { pages: `${pageNumber+11}-${pageNumber+20}`, description: 'Skeleton Argument' }
      ]
    });
    pageNumber += 21;
    
    // Section B: Orders
    if (organized.orders.length > 0) {
      const orderDocs = [];
      for (const order of organized.orders) {
        const pages = 5; // Estimate
        orderDocs.push({
          pages: `${pageNumber}-${pageNumber+pages-1}`,
          description: order.description || order.name
        });
        pageNumber += pages;
      }
      bundle.push({
        section: 'B',
        title: 'Court Orders',
        documents: orderDocs
      });
    }
    
    // Section C: Evidence
    if (organized.evidence.length > 0) {
      const evidenceDocs = [];
      for (const evidence of organized.evidence) {
        const pages = 10; // Estimate
        evidenceDocs.push({
          pages: `${pageNumber}-${pageNumber+pages-1}`,
          description: evidence.description || evidence.name
        });
        pageNumber += pages;
      }
      bundle.push({
        section: 'C',
        title: 'Evidence',
        documents: evidenceDocs
      });
    }
    
    // Section D: Authorities
    const authorities = [
      'CPR Part 52 (Appeals)',
      'CPR Part 40.2 (Orders)',
      'Ladd v Marshall [1954] 1 WLR 1489'
    ];
    
    if (checklist.special.some((s: any) => s.name.includes('Human Rights'))) {
      authorities.push('Human Rights Act 1998, s.6-8');
      authorities.push('ECHR Articles 6 & 8');
    }
    
    const authorityDocs = authorities.map(auth => ({
      pages: `${pageNumber}-${pageNumber+2}`,
      description: auth
    }));
    pageNumber += authorities.length * 3;
    
    bundle.push({
      section: 'D',
      title: 'Authorities',
      documents: authorityDocs
    });
    
    return bundle;
  }
  
  private createIndex(bundle: any[]): string[] {
    const index = ['BUNDLE INDEX', ''];
    
    for (const section of bundle) {
      index.push(`SECTION ${section.section}: ${section.title}`);
      index.push('');
      
      for (const doc of section.documents) {
        index.push(`${doc.pages}\t${doc.description}`);
      }
      index.push('');
    }
    
    return index;
  }
  
  private identifyMissingDocuments(checklist: any, evidence: any[]): string[] {
    const missing = [];
    
    // Check mandatory documents
    for (const doc of checklist.mandatory) {
      if (!doc.included && doc.required) {
        const found = evidence.some(e => 
          (e.name || e.description || '').toLowerCase()
            .includes(doc.name.toLowerCase().substring(0, 10))
        );
        
        if (!found) {
          missing.push(`REQUIRED: ${doc.name}`);
        }
      }
    }
    
    // Check recommended documents
    for (const doc of checklist.recommended) {
      const found = evidence.some(e => 
        (e.name || e.description || '').toLowerCase()
          .includes(doc.name.toLowerCase().substring(0, 10))
      );
      
      if (!found) {
        missing.push(`Recommended: ${doc.name}`);
      }
    }
    
    return missing;
  }
  
  private getFilingRequirements(): any {
    return {
      copies: 'File 3 copies (court, respondent, appellant)',
      format: 'A4 paper, paginated, bound or secured',
      timing: 'Lodge bundle 7 days before hearing',
      service: 'Serve on respondent same day as filing',
      index: 'Include index as first document',
      pagination: 'Consecutive page numbers throughout',
      highlighting: 'Highlight relevant passages sparingly',
      tabs: 'Use divider tabs between sections'
    };
  }
  
  private getDocumentTips(): string[] {
    return [
      'Create master index with page references',
      'Number pages consecutively (not by document)',
      'Put most important documents first',
      'Include only relevant pages of long documents',
      'Ensure all copies are legible',
      'Use divider tabs for easy navigation',
      'Highlight key passages (not whole pages)',
      'File and serve bundle at same time',
      'Keep spare copy for court'
    ];
  }
  
  private getDocumentWarnings(checklist: any, bundle: any[]): string[] {
    const warnings = [];
    
    // Check for missing mandatory documents
    const missingMandatory = checklist.mandatory.filter((d: any) => 
      d.required && !d.included
    );
    
    if (missingMandatory.length > 0) {
      warnings.push(`Missing ${missingMandatory.length} required documents`);
    }
    
    // Check bundle size
    const totalDocs = bundle.reduce((sum, section) => 
      sum + section.documents.length, 0
    );
    
    if (totalDocs > 50) {
      warnings.push('Bundle very large - consider core bundle');
    }
    
    if (totalDocs < 5) {
      warnings.push('Bundle very thin - include key documents');
    }
    
    // Check for sealed order
    if (!checklist.mandatory.find((d: any) => 
      d.name.includes('Sealed order') && d.included)) {
      warnings.push('Sealed order not confirmed - essential document');
    }
    
    return warnings;
  }
}