// ── AMD content schema v1 ────────────────────────────────────────────
// Forma del documento que vive en DailyMasterArchive.contentJson.
// Campos siempre snapshot — sin FKs (decision 3 INVENTORY_COSTING.md).
//
// Versionado por `schemaVersion` en el modelo. Cuando se agreguen campos
// se incrementa la version; los AMDs viejos se siguen leyendo con su
// version original. NUNCA cambiar la forma de v1 retroactivamente.

export const AMD_SCHEMA_VERSION = 1 as const;

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

// ── Meta ────────────────────────────────────────────────────────────

export interface AMDMeta {
  businessId: string;
  businessName: string;
  operationalDate: string; // ISO YYYY-MM-DD
  timezone: string;
  cutoffHour: number;
  generatedAt: string; // ISO timestamp
  fopId: string;
  fopSignedByUserId: string | null;
  fopSignedAt: string | null;
  fopSignedWithDiscrepancy: boolean;
  fopDiscrepancyJustification: string | null;
  currency: string;
}

// ── P1 — Resumen humano ─────────────────────────────────────────────

export interface AMDP1Summary {
  revenue: {
    gross: number;
    ticketCount: number;
    avgTicket: number;
  };
  cogs: {
    theoretical: number;
    real: number;
    deviationValue: number;
  };
  margin: {
    absolute: number;
    percent: number;
  };
  laborCost: {
    paidToday: number;
    accruedThisPeriod: number;
  };
  vsYesterday: {
    revenueDelta: number;
    marginDeltaPercent: number;
  } | null;
  alerts: {
    count: number;
  };
}

// ── P2 — Estados financieros formales ───────────────────────────────

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
    inflows: {
      sales: number;
      other: number;
    };
    outflows: {
      receipts: number;
      payroll: number;
      other: number;
    };
    net: number;
  };
}

// ── P3 — Detalle operativo completo ─────────────────────────────────

export interface AMDP3Operational {
  fai: AMDFAISnapshot | null;
  fci: AMDFCISnapshot | null;
  fid: AMDFIDSnapshot | null;
  faf: AMDFAFSnapshot | null;
  fop: AMDFOPSnapshot;
  processExecutions: Array<AMDProcessExecutionSnapshot>;
  shifts: Array<AMDShiftSnapshot>;
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

// ── P4 — Alertas ────────────────────────────────────────────────────

export interface AMDP4Alerts {
  rulesVersion: number;
  alerts: Array<{
    code: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    evidence: Record<string, unknown>;
  }>;
}

// ── P5 — Trazabilidad fiscal ───────────────────────────────────────

export interface AMDP5Traceability {
  documentCompleteness: {
    sales: { total: number; withCfdi: number; withoutCfdi: number; percent: number };
    receipts: { total: number; withInvoice: number; withoutInvoice: number; percent: number };
    supplierInvoices: { total: number; withDocument: number; withoutDocument: number; percent: number };
    overall: 'GREEN' | 'YELLOW' | 'RED';
  };
}

// ── P6 — Rendimiento por usuario ───────────────────────────────────

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
    deviationsAttributed: {
      count: number;
      valueMXN: number;
    };
  }>;
}
