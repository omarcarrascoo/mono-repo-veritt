// ── AMD types (mirror del contentJson v1) ────────────────────────────
// Sigue exactamente el shape definido en monkeys-api/src/amd/types/
// amd-content.types.ts. Mantener sincronizado manualmente.

export type AMDStatus = 'GENERATED' | 'VERIFIED' | 'TAMPERED';

export interface AMDRow {
  id: string;
  businessId: string;
  operationalDate: string;
  fopId: string;
  contentJson: AMDContentV1;
  contentHash: string;
  schemaVersion: number;
  generatedAt: string;
  status: AMDStatus;
}

export interface AMDListItem {
  id: string;
  operationalDate: string;
  contentHash: string;
  status: AMDStatus;
  generatedAt: string;
  schemaVersion: number;
}

export interface AMDVerifyResult {
  amdId: string;
  operationalDate: string;
  storedHash: string;
  computedHash: string;
  valid: boolean;
  status: AMDStatus;
  verifiedAt: string;
}

export interface AMDContentV1 {
  schemaVersion: 1;
  meta: AMDMeta;
  p1_summary: AMDP1Summary;
  p2_financials: AMDP2Financials;
  p3_operational: AMDP3Operational;
  p4_alerts: AMDP4Alerts;
  p5_traceability: AMDP5Traceability;
  p6_user_performance: AMDP6UserPerformance;
}

export interface AMDMeta {
  businessId: string;
  businessName: string;
  operationalDate: string;
  timezone: string;
  cutoffHour: number;
  generatedAt: string;
  fopId: string;
  fopSignedByUserId: string | null;
  fopSignedAt: string | null;
  fopSignedWithDiscrepancy: boolean;
  fopDiscrepancyJustification: string | null;
  currency: string;
}

export interface AMDP1Summary {
  revenue: { gross: number; ticketCount: number; avgTicket: number };
  cogs: { theoretical: number; real: number; deviationValue: number };
  margin: { absolute: number; percent: number };
  laborCost: { paidToday: number; accruedThisPeriod: number };
  vsYesterday: {
    revenueDelta: number;
    marginDeltaPercent: number;
  } | null;
  alerts: { count: number };
}

export interface AMDP2Financials {
  incomeStatement: {
    revenue: number;
    costOfGoodsSold: {
      material: number;
      directLabor: number;
      allocatedCif: number;
      total: number;
    };
    grossProfit: number;
    laborExpense: number;
    operatingExpenses: number;
    netResult: number;
  };
  balanceSheetSnapshot: {
    assets: {
      cash: number;
      inventoryAtCost: number;
      inventoryDetail: Array<{
        materialId: string;
        name: string;
        baseUnit: string;
        totalQuantity: number;
        totalValueAtCost: number;
      }>;
      accountsReceivable: number;
    };
    liabilities: {
      accruedLaborBenefits: number;
      accountsPayable: number;
    };
    equity: number;
  };
  cashFlow: {
    inflows: { sales: number; other: number };
    outflows: { receipts: number; payroll: number; other: number };
    net: number;
  };
}

export interface AMDP3Operational {
  fai: AMDFAISnapshot | null;
  fci: AMDFCISnapshot | null;
  fid: AMDFIDSnapshot | null;
  faf: AMDFAFSnapshot | null;
  fop: AMDFOPSnapshot;
  processExecutions: AMDProcessExecutionSnapshot[];
  shifts: AMDShiftSnapshot[];
}

export interface AMDFAISnapshot {
  id: string;
  status: string;
  locationId: string;
  locationName: string;
  authorizedByUserId: string | null;
  authorizedAt: string | null;
  rejectedReason: string | null;
  createdByUserId: string;
  createdAt: string;
  items: Array<{
    materialId: string;
    materialName: string;
    baseUnit: string;
    countedQuantity: number;
    previousClosingQuantity: number;
    systemQuantity: number;
    variance: number;
    varianceValueMXN: number;
    varianceNote: string | null;
  }>;
}

export interface AMDFCISnapshot {
  id: string;
  status: string;
  locationId: string;
  locationName: string;
  authorizedByUserId: string | null;
  authorizedAt: string | null;
  rejectedReason: string | null;
  createdByUserId: string;
  createdAt: string;
  items: Array<{
    materialId: string;
    materialName: string;
    baseUnit: string;
    countedQuantity: number;
    openingQuantity: number;
    receivedQuantity: number;
    realConsumption: number;
  }>;
}

export interface AMDFIDSnapshot {
  id: string;
  status: string;
  totalDeviationValueMXN: number;
  approvedByUserId: string | null;
  approvedAt: string | null;
  createdAt: string;
  items: Array<{
    materialId: string;
    materialName: string;
    baseUnit: string;
    theoreticalConsumption: number;
    realConsumption: number;
    deviationQuantity: number;
    deviationValueMXN: number;
    cause: string | null;
    classifiedByUserId: string | null;
    note: string | null;
  }>;
}

export interface AMDFAFSnapshot {
  id: string;
  status: string;
  totalExpected: number;
  totalCounted: number;
  difference: number;
  approvedByUserId: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
  cashDenominations: Array<{
    denomination: number;
    quantity: number;
    subtotal: number;
  }>;
  terminalReconciliations: Array<{
    paymentMethodId: string;
    paymentMethodName: string;
    expectedTotal: number;
    reportedTotal: number;
    reference: string | null;
    difference: number;
  }>;
  transferReconciliations: Array<{
    expectedTotal: number;
    reportedTotal: number;
    folioReferences: string | null;
    difference: number;
  }>;
}

export interface AMDFOPSnapshot {
  id: string;
  status: string;
  signedByUserId: string | null;
  signedAt: string | null;
  signedWithDiscrepancy: boolean;
  discrepancyJustification: string | null;
  validations: Array<{
    validationType: string;
    label: string;
    operatorValue: number;
    systemValue: number;
    difference: number;
    isWithinThreshold: boolean;
    resolution: string | null;
  }>;
}

export interface AMDProcessExecutionSnapshot {
  id: string;
  templateId: string;
  templateName: string;
  status: string;
  executedByUserId: string | null;
  executedByName: string | null;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
}

export interface AMDShiftSnapshot {
  id: string;
  staffProfileId: string;
  staffFullName: string;
  operationalRole: string;
  areaId: string | null;
  areaName: string | null;
  clockInAt: string;
  clockOutAt: string | null;
  totalMinutes: number;
  status: string;
}

export interface AMDP4Alerts {
  rulesVersion: number;
  alerts: Array<{
    code: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    evidence: Record<string, unknown>;
  }>;
}

export interface AMDP5Traceability {
  documentCompleteness: {
    sales: {
      total: number;
      withCfdi: number;
      withoutCfdi: number;
      percent: number;
    };
    receipts: {
      total: number;
      withInvoice: number;
      withoutInvoice: number;
      percent: number;
    };
    supplierInvoices: {
      total: number;
      withDocument: number;
      withoutDocument: number;
      percent: number;
    };
    overall: 'GREEN' | 'YELLOW' | 'RED';
  };
}

export interface AMDP6UserPerformance {
  users: Array<{
    userId: string;
    fullName: string;
    role: string | null;
    hoursWorked: number;
    actions: {
      salesCreated: number;
      salesValue: number;
      receiptsCreated: number;
      processesExecuted: number;
      faiCreated: number;
      fciCreated: number;
      fafCreated: number;
      fopSigned: number;
      deviationsClassified: number;
    };
    deviationsAttributed: { count: number; valueMXN: number };
  }>;
}
