export interface Env {
  AI: any;
  ORDERS: KVNamespace;
  APPEALS: KVNamespace;
}

export interface Order {
  id: string;
  caseNumber: string;
  courtName: string;
  judge: string;
  dateOfOrder: string;
  orderType: string;
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