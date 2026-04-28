import { DailyChainStatus } from '@/types/daily-chain.types';

export type DailyChainStage =
  | 'not_started'
  | 'fai_pending_review'
  | 'fci_in_progress'
  | 'fci_pending_review'
  | 'fid_pending_classification'
  | 'fid_pending_approval'
  | 'faf_pending'
  | 'faf_pending_review'
  | 'fop_ready'
  | 'fop_blocked'
  | 'completed';

export type ChainTone = 'start' | 'progress' | 'review' | 'blocker' | 'done';

export interface DailyChainMoment {
  stage: DailyChainStage;
  tone: ChainTone;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaRoute: string;
  stepCode: string;
  progress: number;
}

const TOTAL_STEPS = 5;

export function getDailyChainMoment(
  businessId: string,
  chain: DailyChainStatus | null,
  isManager: boolean,
): DailyChainMoment {
  const base = `/businesses/${businessId}/daily-chain`;

  if (!chain || !chain.fai) {
    return {
      stage: 'not_started',
      tone: 'start',
      eyebrow: 'Día sin iniciar',
      title: 'Arranca el día operativo',
      description:
        'Levanta el conteo de apertura (FAI) para habilitar ventas, recepciones y cierre.',
      ctaLabel: 'Iniciar día',
      ctaRoute: `${base}/opening`,
      stepCode: 'FAI · 1 de 5',
      progress: 0,
    };
  }

  if (chain.fai.status === 'PENDING') {
    return {
      stage: 'fai_pending_review',
      tone: isManager ? 'review' : 'progress',
      eyebrow: 'Apertura registrada',
      title: isManager
        ? 'Revisa y autoriza la apertura'
        : 'Apertura en revisión del gerente',
      description: isManager
        ? 'El operador envió el conteo FAI. Revisa las variaciones y autoriza para abrir el día.'
        : 'Un gerente debe autorizar el FAI para poder registrar ventas.',
      ctaLabel: isManager ? 'Revisar apertura' : 'Ver estado',
      ctaRoute: `${base}/opening-review`,
      stepCode: 'FAI · Autorización',
      progress: 10,
    };
  }

  if (!chain.fci) {
    return {
      stage: 'fci_in_progress',
      tone: 'progress',
      eyebrow: 'Día en curso',
      title: 'Cuando termines el día, cierra el inventario',
      description:
        'Las ventas y recepciones están habilitadas. Al cierre, captura el conteo final (FCI).',
      ctaLabel: 'Abrir FCI',
      ctaRoute: `${base}/closing`,
      stepCode: 'FCI · 2 de 5',
      progress: 25,
    };
  }

  if (chain.fci.status === 'PENDING') {
    return {
      stage: 'fci_pending_review',
      tone: isManager ? 'review' : 'progress',
      eyebrow: 'Conteo final enviado',
      title: isManager
        ? 'Autoriza el cierre de inventario'
        : 'FCI esperando autorización',
      description: isManager
        ? 'Revisa las desviaciones del conteo final y autoriza para disparar el reporte FID.'
        : 'Un gerente debe revisar el FCI para continuar con el cierre.',
      ctaLabel: isManager ? 'Revisar FCI' : 'Ver estado',
      ctaRoute: `${base}/closing-review`,
      stepCode: 'FCI · Autorización',
      progress: 40,
    };
  }

  if (chain.fid && chain.fid.status === 'PENDING_CLASSIFICATION') {
    return {
      stage: 'fid_pending_classification',
      tone: 'progress',
      eyebrow: 'Desviaciones detectadas',
      title: 'Clasifica las desviaciones del día',
      description:
        'Asigna causa (merma, error, desperdicio…) a cada partida para que el gerente pueda aprobar.',
      ctaLabel: 'Clasificar FID',
      ctaRoute: `${base}/deviations`,
      stepCode: 'FID · 3 de 5',
      progress: 55,
    };
  }

  if (chain.fid && chain.fid.status === 'CLASSIFIED') {
    return {
      stage: 'fid_pending_approval',
      tone: isManager ? 'review' : 'progress',
      eyebrow: 'FID clasificado',
      title: isManager
        ? 'Aprueba el reporte de desviaciones'
        : 'FID esperando aprobación',
      description: isManager
        ? 'Revisa las causas capturadas y aprueba para habilitar el arqueo financiero.'
        : 'El gerente debe aprobar las desviaciones para continuar.',
      ctaLabel: isManager ? 'Revisar FID' : 'Ver estado',
      ctaRoute: `${base}/deviations`,
      stepCode: 'FID · Aprobación',
      progress: 65,
    };
  }

  if (!chain.faf || chain.faf.status === 'PENDING') {
    return {
      stage: 'faf_pending',
      tone: 'progress',
      eyebrow: 'Arqueo pendiente',
      title: 'Cuadra el efectivo y las terminales',
      description:
        'Captura denominaciones y totales reportados por terminal para levantar el FAF.',
      ctaLabel: 'Abrir arqueo',
      ctaRoute: `${base}/reconciliation`,
      stepCode: 'FAF · 4 de 5',
      progress: 75,
    };
  }

  if (chain.faf.status === 'PENDING_REVIEW') {
    return {
      stage: 'faf_pending_review',
      tone: isManager ? 'review' : 'progress',
      eyebrow: 'Arqueo en revisión',
      title: isManager
        ? 'Aprueba el arqueo financiero'
        : 'FAF esperando aprobación',
      description: isManager
        ? 'Valida el arqueo capturado por el operador para habilitar el cierre operativo (FOP).'
        : 'El gerente debe aprobar el arqueo para cerrar el día.',
      ctaLabel: isManager ? 'Revisar arqueo' : 'Ver estado',
      ctaRoute: `${base}/reconciliation`,
      stepCode: 'FAF · Aprobación',
      progress: 85,
    };
  }

  if (chain.fop && chain.fop.status === 'SIGNED') {
    return {
      stage: 'completed',
      tone: 'done',
      eyebrow: 'Día cerrado',
      title: 'Todo cuadrado y firmado',
      description:
        'El cierre operativo (FOP) quedó firmado. Puedes revisar el resumen financiero cuando quieras.',
      ctaLabel: 'Ver resumen',
      ctaRoute: `${base}/fop`,
      stepCode: 'FOP · 5 de 5',
      progress: 100,
    };
  }

  if (chain.fop && chain.fop.status === 'BLOCKED') {
    return {
      stage: 'fop_blocked',
      tone: 'blocker',
      eyebrow: 'Validaciones fuera de umbral',
      title: isManager
        ? 'Firma con justificación o corrige'
        : 'Cierre bloqueado por discrepancias',
      description: isManager
        ? 'Hay validaciones fuera del umbral. Puedes firmar con justificación o regresar a corregir.'
        : 'Hay discrepancias que debe revisar un gerente antes de cerrar el día.',
      ctaLabel: isManager ? 'Revisar FOP' : 'Ver estado',
      ctaRoute: `${base}/fop`,
      stepCode: 'FOP · Discrepancia',
      progress: 90,
    };
  }

  return {
    stage: 'fop_ready',
    tone: isManager ? 'review' : 'progress',
    eyebrow: 'Listo para firmar',
    title: isManager
      ? 'Firma el cierre operativo'
      : 'FOP esperando firma del gerente',
    description: isManager
      ? 'Todas las validaciones cuadraron. Firma el FOP para dejar el día cerrado de forma inmutable.'
      : 'El gerente debe firmar el cierre operativo del día.',
    ctaLabel: isManager ? 'Firmar FOP' : 'Ver estado',
    ctaRoute: `${base}/fop`,
    stepCode: 'FOP · 5 de 5',
    progress: 95,
  };
}

export interface ChainStepSummary {
  code: string;
  label: string;
  state: 'done' | 'active' | 'idle';
}

export function getChainStepsSummary(
  chain: DailyChainStatus | null,
): ChainStepSummary[] {
  const steps: ChainStepSummary[] = [
    { code: 'FAI', label: 'Apertura', state: 'idle' },
    { code: 'FCI', label: 'Cierre', state: 'idle' },
    { code: 'FID', label: 'Desviaciones', state: 'idle' },
    { code: 'FAF', label: 'Arqueo', state: 'idle' },
    { code: 'FOP', label: 'Firma', state: 'idle' },
  ];

  if (!chain) return steps;

  if (chain.fai?.status === 'AUTHORIZED') steps[0].state = 'done';
  else if (chain.fai) steps[0].state = 'active';

  if (chain.fci?.status === 'AUTHORIZED') steps[1].state = 'done';
  else if (chain.fci) steps[1].state = 'active';

  if (chain.fid?.status === 'APPROVED') steps[2].state = 'done';
  else if (chain.fid) steps[2].state = 'active';

  const fafDone =
    chain.faf?.status === 'RECONCILED' || chain.faf?.status === 'DISCREPANCY';
  if (fafDone) steps[3].state = 'done';
  else if (chain.faf) steps[3].state = 'active';

  if (chain.fop?.status === 'SIGNED') steps[4].state = 'done';
  else if (chain.fop) steps[4].state = 'active';

  const activeIndex = steps.findIndex((s) => s.state === 'active');
  if (activeIndex === -1) {
    const firstIdle = steps.findIndex((s) => s.state === 'idle');
    if (firstIdle !== -1) steps[firstIdle].state = 'active';
  }

  return steps;
}

export function getStageNumber(chain: DailyChainStatus | null): number {
  if (!chain || !chain.fai) return 1;
  if (chain.fai.status !== 'AUTHORIZED') return 1;
  if (!chain.fci || chain.fci.status !== 'AUTHORIZED') return 2;
  if (!chain.fid || chain.fid.status !== 'APPROVED') return 3;
  const fafDone =
    chain.faf?.status === 'RECONCILED' || chain.faf?.status === 'DISCREPANCY';
  if (!fafDone) return 4;
  return 5;
}

export type SemaphoreStepState =
  | 'done'
  | 'active'
  | 'review'
  | 'blocked'
  | 'pending';

export interface SemaphoreStepInfo {
  code: string;
  label: string;
  state: SemaphoreStepState;
}

export function getSemaphoreSteps(
  chain: DailyChainStatus | null,
): SemaphoreStepInfo[] {
  const steps: SemaphoreStepInfo[] = [
    { code: 'FAI', label: 'Apertura', state: 'pending' },
    { code: 'FCI', label: 'Cierre', state: 'pending' },
    { code: 'FID', label: 'Desviación', state: 'pending' },
    { code: 'FAF', label: 'Arqueo', state: 'pending' },
    { code: 'FOP', label: 'Firma', state: 'pending' },
  ];

  if (!chain) {
    steps[0].state = 'active';
    return steps;
  }

  // FAI
  const faiS = chain.fai?.status;
  if (faiS === 'AUTHORIZED') steps[0].state = 'done';
  else if (faiS === 'PENDING') steps[0].state = 'review';
  else if (faiS === 'REJECTED') steps[0].state = 'blocked';
  else steps[0].state = 'active';

  // FCI
  const fciS = chain.fci?.status;
  if (fciS === 'AUTHORIZED') steps[1].state = 'done';
  else if (fciS === 'PENDING') steps[1].state = 'review';
  else if (fciS === 'REJECTED') steps[1].state = 'blocked';
  else if (chain.fci) steps[1].state = 'active';
  else if (steps[0].state === 'done') steps[1].state = 'active';

  // FID
  const fidS = chain.fid?.status;
  if (fidS === 'APPROVED') steps[2].state = 'done';
  else if (fidS === 'CLASSIFIED') steps[2].state = 'review';
  else if (fidS === 'PENDING_CLASSIFICATION') steps[2].state = 'active';
  else if (steps[1].state === 'done') steps[2].state = 'active';

  // FAF
  const fafS = chain.faf?.status;
  if (fafS === 'RECONCILED') steps[3].state = 'done';
  else if (fafS === 'DISCREPANCY') steps[3].state = 'blocked';
  else if (fafS === 'PENDING_REVIEW') steps[3].state = 'review';
  else if (fafS === 'REJECTED') steps[3].state = 'blocked';
  else if (chain.faf) steps[3].state = 'active';
  else if (steps[2].state === 'done') steps[3].state = 'active';

  // FOP
  const fopS = chain.fop?.status;
  if (fopS === 'SIGNED') steps[4].state = 'done';
  else if (fopS === 'BLOCKED') steps[4].state = 'blocked';
  else if (fopS === 'PENDING') steps[4].state = 'review';
  else if (steps[3].state === 'done') steps[4].state = 'active';

  return steps;
}

export function getOperationalDateLabel(dateISO?: string | null): string {
  if (!dateISO) {
    const today = new Date();
    return today.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }
  try {
    const parsed = new Date(dateISO);
    return parsed.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return dateISO;
  }
}
