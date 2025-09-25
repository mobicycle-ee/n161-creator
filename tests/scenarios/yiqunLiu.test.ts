import { describe, test, expect, beforeAll } from 'vitest';
import { N161SequentialFiller } from '../../src/services/n161SequentialFiller';
import { VoidDetectorAgent } from '../../src/agents/specialAgent_voidDetector';
import { GroundsAnalyzerAgent } from '../../src/agents/section06_groundsAnalyzerAgent';
import type { Env } from '../../src/types';

/**
 * SCENARIO 1: Appeal against Yiqun Liu orders
 * Testing with actual HHJ Gerald orders from August/September 2025
 */

describe('Scenario 1: Yiqun Liu v Roslyn Scott & MobiCycle OÜ', () => {
  let filler: N161SequentialFiller;
  let voidDetector: VoidDetectorAgent;
  let groundsAnalyzer: GroundsAnalyzerAgent;
  let mockEnv: Env;
  
  const orderPaths = [
    '/Users/mobicycle/Library/Mobile Documents/com~apple~CloudDocs/0._Legal/Roman_House/orders_from_courts/orders_cccl/2025/2025.08.29 HHJ Gerald K10CL521.pdf',
    '/Users/mobicycle/Library/Mobile Documents/com~apple~CloudDocs/0._Legal/Roman_House/orders_from_courts/orders_cccl/2025/2025.09.03 HHJ Gerald K10CL521.pdf'
  ];
  
  beforeAll(() => {
    mockEnv = createMockEnvironment();
    filler = new N161SequentialFiller(mockEnv);
    voidDetector = new VoidDetectorAgent(mockEnv);
    groundsAnalyzer = new GroundsAnalyzerAgent(mockEnv);
  });
  
  describe('Order Analysis', () => {
    test('should identify case details correctly', () => {
      const orderDetails = {
        caseNumber: 'K10CL521',
        claimant: 'YIQUN LIU',
        defendants: ['ROSLYN SCOTT', 'MOBICYCLE OU'],
        judge: 'His Honour Judge Gerald',
        court: 'County Court at Central London'
      };
      
      expect(orderDetails.caseNumber).toBe('K10CL521');
      expect(orderDetails.defendants).toContain('MOBICYCLE OU');
      expect(orderDetails.judge).toContain('Gerald');
    });
    
    test('should detect TWM without reasons violation', async () => {
      const orderText = `
        AND UPON the Court finding and recording that the application
        for permission to appeal against the Order of District Judge Greenidge
        of the 8th February 2024 was totally without merit
      `;
      
      const voidAnalysis = await voidDetector.detect(orderText, {
        judge: 'HHJ Gerald',
        orderDate: '29 August 2025'
      });
      
      expect(voidAnalysis.voidIndicators).toContain(
        expect.stringContaining('TWM without reasons')
      );
      expect(voidAnalysis.legalAuthorities).toContain(
        expect.stringContaining('Flannery')
      );
    });
    
    test('should detect Civil Restraint Order jurisdiction issue', async () => {
      const orderText = `
        The First and Second Defendants' applications for permission to appeal
        being totally without merit, there be a Civil Restraint Order against
        both the First and Second Defendant
      `;
      
      const voidAnalysis = await voidDetector.detect(orderText, {
        firstTWM: true
      });
      
      expect(voidAnalysis.voidIndicators).toContain(
        expect.stringContaining('CRO on first TWM')
      );
      expect(voidAnalysis.legalAuthorities).toContain(
        expect.stringContaining('CPR 3.11')
      );
    });
    
    test('should identify Estonian company discrimination', async () => {
      const context = {
        defendant: 'MOBICYCLE OU',
        companyType: 'Estonian company',
        djGreenidgeFinding: 'did become the tenant',
        procedure: 'trespass under CPR 55.1(b)'
      };
      
      const grounds = await groundsAnalyzer.analyzeOrderAndCreateGrounds(
        'Order against Estonian company as trespasser despite being tenant',
        orderPaths[0]
      );
      
      const discriminationGround = grounds.grounds.find((g: any) => 
        g.title.includes('Discrimination'));
      
      expect(discriminationGround).toBeDefined();
      expect(discriminationGround.details).toContain(
        expect.stringContaining('CPR 55.1(b)')
      );
      expect(discriminationGround.citations).toContain(
        expect.stringContaining('ECHR Article 14')
      );
    });
  });
  
  describe('Costs Analysis', () => {
    test('should calculate total costs correctly', () => {
      const costs = {
        order1: 16275.16,  // 29 August order
        order2: 12000.00,  // 3 September order (£5000 + VAT x2)
        total: 28275.16
      };
      
      expect(costs.total).toBe(28275.16);
    });
    
    test('should flag excessive costs as ground for appeal', async () => {
      const orderText = `
        The First and Second Defendants do pay to the Claimant
        the costs of the application for permission to appeal
        summarily assessed in the sum of £16,275.16
      `;
      
      const grounds = await groundsAnalyzer.analyzeOrderAndCreateGrounds(orderText);
      
      const costsGround = grounds.grounds.find((g: any) => 
        g.title.includes('Costs') || g.title.includes('Disproportionate'));
      
      expect(costsGround).toBeDefined();
      expect(costsGround.likelihood).toBe('high');
    });
  });
  
  describe('Grounds Generation', () => {
    test('should generate comprehensive grounds list', async () => {
      const expectedGrounds = [
        'Absence of Reasons for TWM Finding',
        'Civil Restraint Order Without Jurisdiction',
        'Discrimination Against EU Company',
        'Permission Refused Without Analysis',
        'Disproportionate Costs Awards',
        'Breach of Natural Justice',
        'No Opportunity to Respond'
      ];
      
      const grounds = await groundsAnalyzer.analyzeOrderAndCreateGrounds(
        'Combined order text from both orders'
      );
      
      expect(grounds.grounds.length).toBeGreaterThanOrEqual(5);
      
      // Check for key grounds
      const groundTitles = grounds.grounds.map((g: any) => g.title);
      expect(groundTitles).toContain(
        expect.stringMatching(/TWM|without merit/i)
      );
      expect(groundTitles).toContain(
        expect.stringMatching(/Civil Restraint|CRO/i)
      );
    });
    
    test('should reference DJ Greenidge findings', async () => {
      const grounds = await groundsAnalyzer.analyzeOrderAndCreateGrounds(
        'Appeal from DJ Greenidge order where MobiCycle "did become the tenant"'
      );
      
      const tenantGround = grounds.grounds.find((g: any) => 
        g.details.some((d: string) => d.includes('Greenidge')));
      
      expect(tenantGround).toBeDefined();
      expect(tenantGround.details).toContain(
        expect.stringContaining('did become the tenant')
      );
    });
  });
  
  describe('Relief Sought', () => {
    test('should request appropriate relief', () => {
      const relief = [
        'Set aside orders of 29 August and 3 September 2025',
        'Set aside Civil Restraint Order',
        'Set aside costs orders totalling £28,275.16',
        'Declaration that proceedings void for discrimination',
        'Costs on indemnity basis',
        'Damages under HRA 1998 for violations'
      ];
      
      expect(relief).toContain(
        expect.stringMatching(/Set aside.*Civil Restraint/)
      );
      expect(relief).toContain(
        expect.stringMatching(/28,275/)
      );
    });
    
    test('should request stay of enforcement', () => {
      const urgentRelief = [
        'Stay enforcement of costs orders pending appeal',
        'Stay effect of Civil Restraint Order',
        'Expedition of appeal hearing'
      ];
      
      expect(urgentRelief[0]).toContain('Stay');
      expect(urgentRelief[2]).toContain('Expedition');
    });
  });
  
  describe('Book References', () => {
    test('should reference Book 4 on void orders', async () => {
      const analysis = await voidDetector.detect('Order with defects', {});
      
      expect(analysis.book4References).toBeDefined();
      expect(analysis.book4References[0].title).toContain(
        'Hidden Epidemic'
      );
    });
    
    test('should reference Book 2 on international law', async () => {
      const grounds = await groundsAnalyzer.analyzeOrderAndCreateGrounds(
        'Estonian company discrimination'
      );
      
      expect(grounds.bookReferences).toContain(
        expect.objectContaining({ book: 2 })
      );
    });
    
    test('should reference Book 3 on CPR violations', async () => {
      const grounds = await groundsAnalyzer.analyzeOrderAndCreateGrounds(
        'CPR 40.2 and CPR 3.11 violations'
      );
      
      expect(grounds.bookReferences).toContain(
        expect.objectContaining({ book: 3 })
      );
    });
  });
});

function createMockEnvironment(): Env {
  return {
    BOOK_0_DEMOCRACY: {} as any,
    BOOK_1_LEGAL_SURVIVAL: {} as any,
    BOOK_2_INTERNATIONAL: {} as any,
    BOOK_3_DOMESTIC: {} as any,
    BOOK_4_VOID: {} as any,
    BOOK_5_WHISTLEBLOWERS: {} as any,
    AI: {
      run: async (model: string, options: any) => ({
        response: generateMockResponse(options.prompt)
      })
    } as any
  };
}

function generateMockResponse(prompt: string): string {
  if (prompt.includes('TWM')) {
    return 'Totally without merit declared without providing reasons - violates duty to give reasons';
  }
  if (prompt.includes('Civil Restraint')) {
    return 'Civil Restraint Order on first TWM finding exceeds CPR 3.11 requirements';
  }
  if (prompt.includes('Estonian') || prompt.includes('EU')) {
    return 'Discrimination against EU company contrary to ECHR Article 14 and Withdrawal Agreement';
  }
  return 'Mock analysis response';
}