// Orchestrator: Manages the sequential execution of all N161 form steps

import type { Env } from '../types';
import { loadSelectedOrder } from './section00_order';
import { step2_appealDetails } from './section02_appealDetails';
import { step3_legalRepresentation } from './section03_legalRepresentation';
import { step4_permission } from './section04_permission';
import { step5_orderDetails } from './section05_orderDetails';
import { step6_groundsAnalyzer } from './section06_groundsAnalyzer';
import { step7_skeletonArgument } from './section07_skeletonArgument';
import { step8_aarhus } from './section08_aarhus';
import { step9_reliefSought } from './section09_reliefSought';
import { step10_otherApplications } from './section10_otherApplications';
import { step11_evidenceSupport } from './section11_evidenceSupport';
import { step12_vulnerability } from './section12_vulnerability';
import { step13_supportingDocuments } from './section13_supportingDocuments';
import { step14_statementOfTruth } from './section14_statementOfTruth';

type StepKey =
  | 'section1'
  | 'section2'
  | 'section3'
  | 'section4'
  | 'section5'
  | 'section6'
  | 'section7'
  | 'section8'
  | 'section9'
  | 'section10'
  | 'section11'
  | 'section12'
  | 'section13'
  | 'section14';

const STEP_LABELS: Record<StepKey, string> = {
  section1: 'Section 1: Case Details and Parties',
  section2: 'Section 2: Nature of Appeal',
  section3: 'Section 3: Legal Representation',
  section4: 'Section 4: Permission to Appeal',
  section5: 'Section 5: Details of Order Being Appealed',
  section6: 'Section 6: Grounds of Appeal',
  section7: 'Section 7: Skeleton Argument',
  section8: 'Section 8: Aarhus Convention Claims',
  section9: 'Section 9: Relief Sought',
  section10: 'Section 10: Other Applications',
  section11: 'Section 11: Evidence and Supporting Documents',
  section12: 'Section 12: Vulnerability',
  section13: 'Section 13: Supporting Documents List',
  section14: 'Section 14: Statement of Truth'
};

const STEP_ALIAS_MAP: Record<string, StepKey> = {
  '1': 'section1',
  section1: 'section1',
  section01: 'section1',
  step1: 'section1',
  '2': 'section2',
  section2: 'section2',
  section02: 'section2',
  step2: 'section2',
  '3': 'section3',
  section3: 'section3',
  section03: 'section3',
  step3: 'section3',
  '4': 'section4',
  section4: 'section4',
  section04: 'section4',
  step4: 'section4',
  '5': 'section5',
  section5: 'section5',
  section05: 'section5',
  step5: 'section5',
  '6': 'section6',
  section6: 'section6',
  section06: 'section6',
  step6: 'section6',
  '7': 'section7',
  section7: 'section7',
  section07: 'section7',
  step7: 'section7',
  '8': 'section8',
  section8: 'section8',
  section08: 'section8',
  step8: 'section8',
  '9': 'section9',
  section9: 'section9',
  section09: 'section9',
  step9: 'section9',
  '10': 'section10',
  section10: 'section10',
  step10: 'section10',
  '11': 'section11',
  section11: 'section11',
  step11: 'section11',
  '12': 'section12',
  section12: 'section12',
  step12: 'section12',
  '13': 'section13',
  section13: 'section13',
  step13: 'section13',
  '14': 'section14',
  section14: 'section14',
  step14: 'section14'
};

interface StepSummary {
  sectionKey: StepKey;
  label: string;
  status: 'completed' | 'skipped' | 'failed';
  durationMs: number;
  error?: string;
  answersCollected?: number;
  savedPath?: string;
  logs: string[];
}

interface OrchestratorOptions {
  steps?: Array<StepKey | string | number>;
  continueOnError?: boolean;
  onStepComplete?: (summary: StepSummary) => void | Promise<void>;
  outputPdfPath?: string;
}

function normalizeStepKey(value: StepKey | string | number): StepKey | null {
  const normalized = typeof value === 'number'
    ? value.toString()
    : value.toLowerCase().replace(/\s+/g, '').replace(/_/g, '').replace(/-/g, '');
  return STEP_ALIAS_MAP[normalized] ?? null;
}

export class N161Orchestrator {
  private env: Env;
  private resultAll: Record<string, any> = {};
  private formPath = '';
  private sendUpdate: (msg: string) => void;

  constructor(env: Env, sendUpdate: (msg: string) => void = console.log) {
    this.env = env;
    this.sendUpdate = sendUpdate;
  }

  /**
   * Execute all steps sequentially to complete the N161 form.
   * Each step gathers answers, persists them to the working PDF and
   * stores its output so later sections can reuse earlier data.
   */
  async executeFullProcess(orderKey?: string, options: OrchestratorOptions = {}): Promise<any> {
    try {
      this.sendUpdate('🚀 Starting N161 Form Generation Process');
      this.sendUpdate('═══════════════════════════════════════');

      const invalidSteps: Array<string | number> = [];
      const normalizedSteps = options.steps
        ?.map((step) => {
          const key = normalizeStepKey(step);
          if (!key) {
            invalidSteps.push(step);
          }
          return key;
        })
        .filter((step): step is StepKey => step !== null);

      if (invalidSteps.length > 0) {
        throw new Error(`Unknown section keys requested: ${invalidSteps.join(', ')}`);
      }

      const stepsSet = normalizedSteps && normalizedSteps.length > 0 ? new Set(normalizedSteps) : null;
      const shouldRunStep = (key: StepKey) => !stepsSet || stepsSet.has(key);
      const continueOnError = options.continueOnError ?? false;
      const stepSummaries: Partial<Record<StepKey, StepSummary>> = {};

      const recordSummary = async (summary: StepSummary) => {
        stepSummaries[summary.sectionKey] = summary;
        if (options.onStepComplete) {
          await options.onStepComplete(summary);
        }
      };

      const runStep = async <T>(
        key: StepKey,
        label: string,
        execute: (log: (msg: string) => void) => Promise<T>,
        handleSuccess: (result: T) => { success: boolean; summary?: Partial<Omit<StepSummary, 'sectionKey' | 'label' | 'status' | 'durationMs' | 'logs'>> },
        handleSkip?: () => void
      ): Promise<{ continue: boolean; result?: T }> => {
        if (!shouldRunStep(key)) {
          handleSkip?.();
          await recordSummary({
            sectionKey: key,
            label,
            status: 'skipped',
            durationMs: 0,
            logs: []
          });
          return { continue: true };
        }

        const logs: string[] = [];
        const logFn = (msg: string) => {
          logs.push(msg);
          this.sendUpdate(msg);
        };
        const startTime = Date.now();

        try {
          const result = await execute(logFn);
          const durationMs = Date.now() - startTime;
          const outcome = handleSuccess(result);
          await recordSummary({
            sectionKey: key,
            label,
            status: outcome.success ? 'completed' : 'failed',
            durationMs,
            logs,
            ...outcome.summary,
          });

          if (!outcome.success && !continueOnError) {
            return { continue: false, result };
          }

          return { continue: true, result };
        } catch (error) {
          const durationMs = Date.now() - startTime;
          const message = error instanceof Error ? error.message : String(error);
          await recordSummary({
            sectionKey: key,
            label,
            status: 'failed',
            durationMs,
            logs,
            error: message
          });

          if (!continueOnError) {
            throw error;
          }

          return { continue: true };
        }
      };

      const buildResult = (success: boolean, extras: Record<string, any> = {}) => {
        const totalSections = Object.keys(this.resultAll).length;
        const totalAnswers = Object.values(this.resultAll).reduce((sum, section: any) => {
          return sum + Object.keys(section?.answers || {}).length;
        }, 0);

        return {
          success,
          formPath: this.formPath,
          resultAll: this.resultAll,
          summaries: stepSummaries,
          completedAt: new Date().toISOString(),
          summary: {
            totalSections,
            totalAnswers
          },
          ...extras
        };
      };

      // STEP 0: Order Selection (only if no order was provided)
      let selectedOrderKey = orderKey;
      if (!selectedOrderKey) {
        this.sendUpdate('\n📂 STEP 0: Order Selection');
        const orderData = await loadSelectedOrder(this.env, selectedOrderKey!, this.sendUpdate);
        selectedOrderKey = orderData.key;

        if (!selectedOrderKey) {
          throw new Error('No order selected - cannot proceed to Step 1');
        }
        this.sendUpdate('✅ Orchestrator: Order selected, proceeding to Step 1');
      }

      // Set up working form path for downstream steps
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      this.formPath = options.outputPdfPath || `/tmp/N161_${selectedOrderKey}_${timestamp}.pdf`;

      const step1Outcome = await runStep(
        'section1',
        STEP_LABELS.section1,
        async (log) => {
          this.sendUpdate('\n📋 STEP 1: Case Details');
          this.sendUpdate('Loading questions for Section 1...');

          const { CaseDetailsAgent } = await import('../agents/section01_caseDetailsAgent');
          const caseDetailsAgent = new CaseDetailsAgent(this.env);
          const result = await caseDetailsAgent.populateSection1(selectedOrderKey!, log);
          this.resultAll.section1 = result;
          return result;
        },
        (result) => {
          const success = result.status === 'completed';
          if (success) {
            this.sendUpdate('✅ Orchestrator: Step 1 completed');
            this.sendUpdate(`📊 Collected ${Object.keys(result.answers || {}).length} answers`);
            this.sendUpdate('Proceeding to Step 2...');
          } else {
            this.sendUpdate('⚠️ Orchestrator: Step 1 not completed, stopping process');
          }

          return {
            success,
            summary: {
              answersCollected: Object.keys(result.answers || {}).length,
              savedPath: result.savedPath
            }
          };
        },
        () => {
          this.sendUpdate(`⏭️ Skipping ${STEP_LABELS.section1}`);
          this.resultAll.section1 = { status: 'skipped' };
        }
      );

      if (!step1Outcome.continue) {
        return buildResult(false, {
          stoppedAt: 'Section 1',
          reason: 'Step 1 not completed'
        });
      }

      const section1 = this.resultAll.section1;

      const step2Outcome = await runStep(
        'section2',
        STEP_LABELS.section2,
        async (log) => {
          this.sendUpdate('\n📋 STEP 2: Appeal Details');
          this.sendUpdate('Loading questions for Section 2...');

          if (!section1 || !section1.caseDetails) {
            throw new Error('Section 1 case details are required to populate Section 2');
          }

          const section2Result = await step2_appealDetails(
            this.env,
            section1.caseDetails,
            this.resultAll,
            this.formPath,
            log
          );
          this.resultAll.section2 = section2Result;
          return section2Result;
        },
        (section2Result) => {
          const success = section2Result.status === 'completed';
          return {
            success,
            summary: {
              answersCollected: Object.keys(section2Result.appealDetails || {}).length,
              savedPath: section2Result.savedPath
            }
          };
        },
        () => {
          this.sendUpdate(`⏭️ Skipping ${STEP_LABELS.section2}`);
          this.resultAll.section2 = { status: 'skipped' };
        }
      );

      if (!step2Outcome.continue) {
        return buildResult(false, {
          stoppedAt: STEP_LABELS.section2,
          reason: 'Section 2 not completed'
        });
      }

      const section2 = this.resultAll.section2;

      const userDetails = { isLitigantInPerson: true };
      const step3Outcome = await runStep(
        'section3',
        STEP_LABELS.section3,
        async (log) => {
          this.sendUpdate('\n📋 STEP 3: Legal Representation');
          const section3Result = await step3_legalRepresentation(
            this.env,
            userDetails,
            this.resultAll,
            this.formPath,
            log
          );
          this.resultAll.section3 = section3Result;
          return section3Result;
        },
        (section3Result) => {
          const success = section3Result.status === 'completed';
          return {
            success,
            summary: {
              answersCollected: Object.keys(section3Result.answers || {}).length,
              savedPath: section3Result.savedPath
            }
          };
        },
        () => {
          this.sendUpdate(`⏭️ Skipping ${STEP_LABELS.section3}`);
          this.resultAll.section3 = { status: 'skipped' };
        }
      );

      if (!step3Outcome.continue) {
        return buildResult(false, {
          stoppedAt: STEP_LABELS.section3,
          reason: 'Section 3 not completed'
        });
      }

      const section3 = this.resultAll.section3;

      const step4Initial = await runStep(
        'section4',
        STEP_LABELS.section4,
        async (log) => {
          this.sendUpdate('\n📋 STEP 4: Permission to Appeal');

          if (!section1 || !section1.caseDetails) {
            throw new Error('Section 1 case details are required to populate Section 4');
          }

          const section4Result = await step4_permission(
            this.env,
            section1.caseDetails,
            [],
            this.resultAll,
            this.formPath,
            log
          );
          this.resultAll.section4 = section4Result;
          return section4Result;
        },
        (section4Result) => {
          const success = section4Result.status === 'completed';
          return {
            success,
            summary: {
              answersCollected: Object.keys(section4Result.answers || {}).length,
              savedPath: section4Result.savedPath
            }
          };
        },
        () => {
          this.sendUpdate(`⏭️ Skipping ${STEP_LABELS.section4}`);
          this.resultAll.section4 = { status: 'skipped' };
        }
      );

      if (!step4Initial.continue) {
        return buildResult(false, {
          stoppedAt: STEP_LABELS.section4,
          reason: 'Section 4 not completed'
        });
      }

      let section4 = this.resultAll.section4;

      const step5Outcome = await runStep(
        'section5',
        STEP_LABELS.section5,
        async (log) => {
          this.sendUpdate('\n📋 STEP 5: Order Details');

          if (!section1 || !section1.caseDetails) {
            throw new Error('Section 1 case details are required to populate Section 5');
          }

          const section5Result = await step5_orderDetails(
            this.env,
            section1.caseDetails,
            this.resultAll,
            this.formPath,
            log
          );
          this.resultAll.section5 = section5Result;
          return section5Result;
        },
        (section5Result) => {
          const success = section5Result.status === 'completed';
          return {
            success,
            summary: {
              answersCollected: Object.keys(section5Result.answers || {}).length,
              savedPath: section5Result.savedPath
            }
          };
        },
        () => {
          this.sendUpdate(`⏭️ Skipping ${STEP_LABELS.section5}`);
          this.resultAll.section5 = { status: 'skipped' };
        }
      );

      if (!step5Outcome.continue) {
        return buildResult(false, {
          stoppedAt: STEP_LABELS.section5,
          reason: 'Section 5 not completed'
        });
      }

      // STEP 6: Grounds of Appeal
      this.sendUpdate('\n📋 STEP 6: Grounds of Appeal');
      result = await step6_groundsAnalyzer(
        this.env,
        'Order content here',
        section1.caseDetails,
        this.resultAll,
        this.formPath,
        this.sendUpdate
      );
      this.resultAll.section6 = result;
      const section6 = this.resultAll.section6;

      // Update permission section once grounds are known
      if (section6.grounds) {
        result = await step4_permission(
          this.env,
          section1.caseDetails,
          section6.grounds,
          this.resultAll,
          this.formPath,
          this.sendUpdate
        );
        this.resultAll.section4 = result;
        section4 = this.resultAll.section4;
      }

      // STEP 7: Skeleton Argument
      this.sendUpdate('\n📋 STEP 7: Skeleton Argument');
      result = await step7_skeletonArgument(
        this.env,
        section6.grounds || [],
        this.resultAll,
        this.formPath,
        this.sendUpdate
      );
      this.resultAll.section7 = result;

      // STEP 8: Aarhus Convention
      this.sendUpdate('\n📋 STEP 8: Aarhus Convention');
      result = await step8_aarhus(
        this.env,
        section1.caseDetails?.orderType || '',
        this.resultAll,
        this.formPath,
        this.sendUpdate
      );
      this.resultAll.section8 = result;

      // STEP 9: Relief Sought
      this.sendUpdate('\n📋 STEP 9: Relief Sought');
      result = await step9_reliefSought(
        this.env,
        { orderDetails: section1.caseDetails, grounds: section6.grounds },
        this.resultAll,
        this.formPath,
        this.sendUpdate
      );
      this.resultAll.section9 = result;

      // STEP 10: Other Applications
      this.sendUpdate('\n📋 STEP 10: Other Applications');
      result = await step10_otherApplications(
        this.env,
        { urgency: false, extensionRequired: section2.appealDetails?.extensionRequired },
        this.resultAll,
        this.formPath,
        this.sendUpdate
      );
      this.resultAll.section10 = result;

      // STEP 11: Evidence in Support
      this.sendUpdate('\n📋 STEP 11: Evidence in Support');
      result = await step11_evidenceSupport(
        this.env,
        { grounds: section6.grounds, orderDetails: section1.caseDetails },
        this.resultAll,
        this.formPath,
        this.sendUpdate
      );
      this.resultAll.section11 = result;
      const section11 = this.resultAll.section11;

      // STEP 12: Vulnerability Assessment
      this.sendUpdate('\n📋 STEP 12: Vulnerability Assessment');
      result = await step12_vulnerability(
        this.env,
        { userDetails, isLitigantInPerson: true },
        this.resultAll,
        this.formPath,
        this.sendUpdate
      );
      this.resultAll.section12 = result;

      // STEP 13: Supporting Documents
      this.sendUpdate('\n📋 STEP 13: Supporting Documents');
      result = await step13_supportingDocuments(
        this.env,
        { grounds: section6.grounds, evidence: section11.data },
        this.resultAll,
        this.formPath,
        this.sendUpdate
      );
      this.resultAll.section13 = result;

      // STEP 14: Statement of Truth
      this.sendUpdate('\n📋 STEP 14: Statement of Truth');
      result = await step14_statementOfTruth(
        this.env,
        { appellantName: section1.parties?.[0]?.name || 'Appellant' },
        this.resultAll,
        this.formPath,
        this.sendUpdate
      );
      this.resultAll.section14 = result;

      // Final summary
      this.sendUpdate('\n═══════════════════════════════════════');
      this.sendUpdate('✅ N161 FORM GENERATION COMPLETE');
      this.sendUpdate(`📄 Form saved to: ${this.formPath}`);

      const totalSections = Object.keys(this.resultAll).length;
      const totalAnswers = Object.values(this.resultAll).reduce((sum, section: any) => {
        return sum + Object.keys(section?.answers || {}).length;
      }, 0);

      return {
        success: true,
        formPath: this.formPath,
        resultAll: this.resultAll,
        completedAt: new Date().toISOString(),
        summary: {
          totalSections,
          totalAnswers
        }
      };
    } catch (error: any) {
      this.sendUpdate(`❌ Error: ${error.message}`);
      throw error;
    }
  }
}
