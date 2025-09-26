export interface Env {
  AI: any;
  ORDERS: KVNamespace;
  APPEALS: KVNamespace;
  LEGAL_DB: D1Database;
  BOOK_0_DEMOCRACY: D1Database;
  BOOK_1_LEGAL_SURVIVAL: D1Database;
  BOOK_2_INTERNATIONAL: D1Database;
  BOOK_3_DOMESTIC: D1Database;
  BOOK_4_VOID: D1Database;
  BOOK_5_WHISTLEBLOWERS: D1Database;
  VOID_TRACKER_DB?: D1Database;
}

export interface Order {
  id: string;
  caseNumber: string;
  courtName: string;
  judge: string;
  orderDate: string;  // Changed from dateOfOrder for consistency
  orderType: string;
  decision: string;   // Added decision field
  parties: {
    claimant: string;
    defendant: string;
  };
  summary: string;
  fullText?: string;
}

export interface Appeal {
  id: string;
  orderId: string;
  caseNumber: string;
  appellant: {
    name: string;
    address: string;
    phone?: string;
    email?: string;
  };
  respondent: {
    name: string;
    address: string;
  };
  grounds: string[];
  documents: {
    n161?: any;
    groundsOfAppeal?: any;
    evidenceList?: any;
    skeletonArgument?: any;
    witnessStatement?: any;
  };
  createdAt: string;
  status: 'draft' | 'submitted' | 'pending' | 'accepted' | 'rejected';
}