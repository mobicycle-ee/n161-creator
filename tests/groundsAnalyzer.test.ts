import { describe, test, expect, beforeAll } from 'vitest';
import { GroundsAnalyzerAgent } from '../src/agents/section06_groundsAnalyzerAgent';
import type { Env } from '../src/types';

/**
 * TEST: Section 6 Grounds Analyzer Agent
 * Tests the agent's ability to read orders and generate grounds
 */

describe('GroundsAnalyzerAgent', () => {
  let agent: GroundsAnalyzerAgent;
  let mockEnv: Env;
  
  beforeAll(() => {
    // Mock environment with book databases
    mockEnv = {
      BOOK_0_DEMOCRACY: {} as any,
      BOOK_1_LEGAL_SURVIVAL: {} as any,
      BOOK_2_INTERNATIONAL: {} as any,
      BOOK_3_DOMESTIC: {} as any,
      BOOK_4_VOID: {} as any,
      BOOK_5_WHISTLEBLOWERS: {} as any,
      AI: {
        run: async (model: string, options: any) => ({
          response: 'Mock AI response for testing'
        })
      } as any
    };
    
    agent = new GroundsAnalyzerAgent(mockEnv);
  });
  
  describe('Order Analysis', () => {
    test('should detect missing judge name as void indicator', async () => {
      const orderText = `
        General Form of Judgment or Order
        In the County Court at Central London
        Before [blank] sitting at the County Court
        IT IS ORDERED THAT the defendant pay costs
      `;
      
      const result = await agent.analyzeOrderAndCreateGrounds(orderText);
      
      expect(result.voidPossibility).toBeDefined();
      expect(result.voidPossibility.isVoid).toBe(true);
      expect(result.voidPossibility.indicators).toContain('CPR 40.2 violation - mandatory requirement');
    });
    
    test('should detect tenant as trespasser contradiction', async () => {
      const orderText = `
        AND UPON finding that the defendant did become the tenant
        AND UPON these being trespass proceedings under CPR 55.1(b)
        IT IS ORDERED THAT possession be given
      `;
      
      const result = await agent.analyzeOrderAndCreateGrounds(orderText);
      
      expect(result.grounds).toBeDefined();
      const tenantGround = result.grounds.find((g: any) => 
        g.title.includes('Jurisdiction'));
      expect(tenantGround).toBeDefined();
      expect(tenantGround.details).toContain(
        expect.stringContaining('CPR 55.1(b)')
      );
    });
    
    test('should detect TWM without reasons', async () => {
      const orderText = `
        AND UPON the Court finding and recording that the application
        for permission to appeal was totally without merit
        IT IS ORDERED THAT costs be paid
      `;
      
      const result = await agent.analyzeOrderAndCreateGrounds(orderText);
      
      const twmGround = result.grounds.find((g: any) => 
        g.title.includes('reasons') || g.title.includes('TWM'));
      expect(twmGround).toBeDefined();
      expect(twmGround.citations).toContain(
        expect.stringContaining('Flannery')
      );
    });
    
    test('should identify missing Notice to Quit in possession order', async () => {
      const orderText = `
        In the County Court
        Possession Order
        IT IS ORDERED THAT the defendant give possession
        No mention of Notice to Quit
      `;
      
      const result = await agent.analyzeOrderAndCreateGrounds(orderText);
      
      const peaGround = result.grounds.find((g: any) => 
        g.title.includes('Protection from Eviction'));
      expect(peaGround).toBeDefined();
      expect(peaGround.citations).toContain(
        expect.stringContaining('1977')
      );
    });
  });
  
  describe('Ground Generation', () => {
    test('should generate at least 3 grounds for problematic order', async () => {
      const orderText = `
        Before HHJ Gerald
        Finding application totally without merit
        Civil Restraint Order imposed
        Costs of £16,275.16 ordered
        Permission to appeal refused
      `;
      
      const result = await agent.analyzeOrderAndCreateGrounds(orderText);
      
      expect(result.grounds).toBeDefined();
      expect(result.grounds.length).toBeGreaterThanOrEqual(3);
    });
    
    test('should prioritize void grounds as high likelihood', async () => {
      const orderText = `
        Order made but judge name missing
        Not sealed according to CPR 40.2
      `;
      
      const result = await agent.analyzeOrderAndCreateGrounds(orderText);
      
      const voidGround = result.grounds.find((g: any) => 
        g.title.includes('Void'));
      expect(voidGround).toBeDefined();
      expect(voidGround.likelihood).toBe('high');
    });
    
    test('should reference Book 4 for void orders', async () => {
      const orderText = 'Order with multiple defects';
      
      const result = await agent.analyzeOrderAndCreateGrounds(orderText);
      
      expect(result.bookReferences).toBeDefined();
      const book4Ref = result.bookReferences.find((ref: any) => 
        ref.book === 4);
      expect(book4Ref).toBeDefined();
    });
  });
  
  describe('Success Pattern Application', () => {
    test('should apply "This Court must decide" framing', async () => {
      const orderText = 'Order with violations';
      
      const result = await agent.analyzeOrderAndCreateGrounds(orderText);
      
      expect(result.grounds[0].introduction).toContain(
        'This Court must decide'
      );
    });
    
    test('should use binary choice framing', async () => {
      const orderText = 'Problematic order';
      
      const result = await agent.analyzeOrderAndCreateGrounds(orderText);
      
      expect(result.grounds[0].framing).toContain(
        'questions the court must answer'
      );
    });
    
    test('should end with "but you cannot" pattern', async () => {
      const orderText = 'Invalid order';
      
      const result = await agent.analyzeOrderAndCreateGrounds(orderText);
      
      expect(result.grounds[0].conclusion).toContain(
        'but you cannot'
      );
    });
  });
  
  describe('Integration with Book Knowledge', () => {
    test('should reference Book 3 for CPR violations', async () => {
      const orderText = 'CPR 40.2 violation present';
      
      const result = await agent.analyzeOrderAndCreateGrounds(orderText);
      
      const book3Ref = result.bookReferences?.find((ref: any) => 
        ref.book === 3);
      expect(book3Ref).toBeDefined();
    });
    
    test('should reference Book 2 for EU citizen discrimination', async () => {
      const orderText = 'Estonian company treated differently';
      
      const result = await agent.analyzeOrderAndCreateGrounds(orderText);
      
      const book2Ref = result.bookReferences?.find((ref: any) => 
        ref.book === 2);
      expect(book2Ref).toBeDefined();
    });
    
    test('should suggest next steps based on void assessment', async () => {
      const orderText = 'Obviously void order';
      
      const result = await agent.analyzeOrderAndCreateGrounds(orderText);
      
      expect(result.nextSteps).toBeDefined();
      expect(result.nextSteps[0]).toContain(
        'Consider immediate application to set aside'
      );
    });
  });
});