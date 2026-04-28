import { Ionicons } from '@expo/vector-icons';

import { DailyChainStatus } from '@/types/daily-chain.types';
import { DailySaleSummary } from '@/types/sale.types';
import { formatCurrency } from '@/lib/staff-formatters';
import type {
  VrittBentoBadgeTone,
  VrittBentoPalette,
} from '@/components/home/VrittBentoGrid';
import type { VrittTimelineEventState } from '@/components/home/VrittDayTimeline';
import type { VrittNextMoveSkin } from '@/components/home/VrittNextMove';

// ── Items de dato planos (sin onPress) ──
// Los componentes convierten `route` en onPress al momento de render. Así los
// builders son puros y memoizables, y los closures se crean una sola vez
// junto al navigate.

export type TimelineItemData = {
  key: string;
  title: string;
  detail?: string;
  state: VrittTimelineEventState;
  icon: keyof typeof Ionicons.glyphMap;
};

export type BentoItemData = {
  key: string;
  kind: 'headline' | 'metric' | 'list' | 'cta';
  label: string;
  value?: string;
  sub?: string;
  badgeTone?: VrittBentoBadgeTone;
  bullets?: Array<{ label: string; value: string }>;
  icon?: keyof typeof Ionicons.glyphMap;
  palette: VrittBentoPalette;
  route: string;
};

export type NextMoveItemData = {
  key: string;
  label: string;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  skin: VrittNextMoveSkin;
  route: string;
};

export type ModuleItemData = {
  key: string;
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

// ── Builders ──

function faiState(chain: DailyChainStatus | null): VrittTimelineEventState {
  const s = chain?.fai?.status;
  if (s === 'AUTHORIZED') return 'done';
  if (s === 'PENDING') return 'review';
  return 'active';
}

export function buildTimeline(
  chain: DailyChainStatus | null,
  dailySales: DailySaleSummary | null,
): TimelineItemData[] {
  const events: TimelineItemData[] = [];
  const faiStatus = chain?.fai?.status;

  events.push({
    key: 'fai',
    title: 'Apertura de inventario',
    detail:
      faiStatus === 'AUTHORIZED'
        ? 'Conteo FAI autorizado · ventas habilitadas'
        : faiStatus === 'PENDING'
        ? 'Esperando autorización del gerente'
        : 'Levanta el FAI para iniciar el día',
    state: faiState(chain),
    icon: 'sunny-outline',
  });

  if (faiStatus === 'AUTHORIZED') {
    events.push({
      key: 'ops',
      title: 'Operación del día',
      detail: dailySales
        ? `${dailySales.saleCount} tickets · ${formatCurrency(dailySales.totalRevenue)}`
        : 'Registra ventas y recepciones',
      state: chain?.fci ? 'done' : 'active',
      icon: 'cart-outline',
    });
  }

  const fciStatus = chain?.fci?.status;
  if (chain?.fci) {
    events.push({
      key: 'fci',
      title: 'Cierre de inventario',
      detail:
        fciStatus === 'AUTHORIZED'
          ? 'FCI autorizado'
          : fciStatus === 'PENDING'
          ? 'Esperando autorización del gerente'
          : 'Conteo final en proceso',
      state:
        fciStatus === 'AUTHORIZED'
          ? 'done'
          : fciStatus === 'PENDING'
          ? 'review'
          : 'active',
      icon: 'clipboard-outline',
    });
  } else if (faiStatus === 'AUTHORIZED') {
    events.push({
      key: 'fci',
      title: 'Cierre de inventario',
      detail: 'Al terminar el día, levanta el FCI',
      state: 'pending',
      icon: 'clipboard-outline',
    });
  }

  const fidStatus = chain?.fid?.status;
  if (chain?.fid) {
    events.push({
      key: 'fid',
      title: 'Reporte de desviaciones',
      detail:
        fidStatus === 'APPROVED'
          ? 'FID aprobado'
          : fidStatus === 'CLASSIFIED'
          ? 'Esperando aprobación'
          : 'Clasifica las causas',
      state:
        fidStatus === 'APPROVED'
          ? 'done'
          : fidStatus === 'CLASSIFIED'
          ? 'review'
          : 'active',
      icon: 'analytics-outline',
    });
  }

  const fafStatus = chain?.faf?.status;
  if (chain?.faf) {
    const fafDone = fafStatus === 'RECONCILED' || fafStatus === 'DISCREPANCY';
    events.push({
      key: 'faf',
      title: 'Arqueo financiero',
      detail:
        fafStatus === 'RECONCILED'
          ? 'Cuadrado sin diferencias'
          : fafStatus === 'DISCREPANCY'
          ? 'Cerrado con discrepancia'
          : fafStatus === 'PENDING_REVIEW'
          ? 'Esperando aprobación'
          : 'Cuenta efectivo y terminales',
      state: fafDone
        ? 'done'
        : fafStatus === 'PENDING_REVIEW'
        ? 'review'
        : 'active',
      icon: 'cash-outline',
    });
  }

  const fopStatus = chain?.fop?.status;
  if (chain?.fop) {
    events.push({
      key: 'fop',
      title: 'Cierre operativo',
      detail:
        fopStatus === 'SIGNED'
          ? 'Día cerrado y firmado'
          : fopStatus === 'BLOCKED'
          ? 'Con validaciones fuera de umbral'
          : 'Listo para que el gerente firme',
      state:
        fopStatus === 'SIGNED'
          ? 'done'
          : fopStatus === 'BLOCKED'
          ? 'blocked'
          : 'review',
      icon: 'lock-closed-outline',
    });
  } else if (chain?.faf) {
    events.push({
      key: 'fop',
      title: 'Cierre operativo',
      detail: 'Se genera al aprobar el arqueo',
      state: 'pending',
      icon: 'lock-closed-outline',
    });
  }

  return events;
}

export function buildBento(
  businessId: string,
  dailySales: DailySaleSummary | null,
  upcomingPayrollTotal: number,
  staffCount: number,
): BentoItemData[] {
  const base = `/businesses/${businessId}`;
  const salesValue = dailySales
    ? formatCurrency(dailySales.totalRevenue)
    : '—';
  const marginPct = dailySales ? Math.round(dailySales.grossMarginPercent) : 0;
  const marginHint =
    marginPct >= 40 ? 'Sano' : marginPct >= 25 ? 'Medio' : 'Revisar';
  const marginBadge: VrittBentoBadgeTone =
    marginPct >= 40 ? 'forest' : marginPct >= 25 ? 'neutral' : 'amber';

  const topPayments = dailySales?.byPaymentMethod?.slice(0, 3) ?? [];
  const paymentBullets = topPayments.length
    ? topPayments.map((p) => ({
        label: p.paymentMethodName,
        value: formatCurrency(p.total),
      }))
    : [
        { label: 'Efectivo', value: '—' },
        { label: 'Tarjeta', value: '—' },
      ];

  return [
    {
      key: 'sales-hero',
      kind: 'headline',
      label: 'Caja del día',
      value: salesValue,
      sub: dailySales
        ? `${dailySales.saleCount} tickets · ticket prom. ${formatCurrency(dailySales.avgTicket)}`
        : 'Aún sin movimientos registrados',
      palette: 'paper',
      route: `${base}/sales/analytics`,
    },
    {
      key: 'margin',
      kind: 'metric',
      label: 'Margen bruto',
      value: `${marginPct}%`,
      sub: marginHint,
      badgeTone: marginBadge,
      icon: 'trending-up-outline',
      palette: 'ink',
      route: `${base}/sales/analytics`,
    },
    {
      key: 'payroll',
      kind: 'metric',
      label: 'Nómina próxima',
      value: formatCurrency(upcomingPayrollTotal),
      sub: `${staffCount} activos`,
      badgeTone: 'neutral',
      icon: 'cash-outline',
      palette: 'ink',
      route: `${base}/payroll`,
    },
    {
      key: 'payments',
      kind: 'list',
      label: 'Mix de pago hoy',
      bullets: paymentBullets,
      palette: 'paper',
      route: `${base}/sales`,
    },
  ];
}

export function buildNextMoves(
  businessId: string,
  chain: DailyChainStatus | null,
): NextMoveItemData[] {
  const base = `/businesses/${businessId}`;
  const dayOpen = chain?.fai?.status === 'AUTHORIZED' && !chain.fci;
  const dayClosed = chain?.fop?.status === 'SIGNED';

  if (!chain?.fai) {
    return [
      {
        key: 'open',
        label: 'Abrir el día',
        hint: 'Levanta el conteo FAI para habilitar ventas',
        icon: 'sunny-outline',
        skin: 'hero',
        route: `${base}/daily-chain/opening`,
      },
      {
        key: 'team',
        label: 'Turnos del equipo',
        hint: 'Entradas y salidas',
        icon: 'people-outline',
        skin: 'paper',
        route: `${base}/shifts`,
      },
      {
        key: 'inventory',
        label: 'Revisar inventario',
        hint: 'Productos e insumos',
        icon: 'cube-outline',
        skin: 'ink',
        route: `${base}/inventory`,
      },
      {
        key: 'suppliers',
        label: 'Proveedores y compras',
        hint: 'Órdenes y recepciones',
        icon: 'business-outline',
        skin: 'outline',
        route: `${base}/suppliers`,
      },
    ];
  }

  if (dayClosed) {
    return [
      {
        key: 'fop',
        label: 'Ver resumen del día',
        hint: 'FOP firmado · todo conciliado',
        icon: 'checkmark-done-circle-outline',
        skin: 'hero',
        route: `${base}/daily-chain/fop`,
      },
      {
        key: 'analytics',
        label: 'Analítica de ventas',
        hint: 'Márgenes y tendencias',
        icon: 'bar-chart-outline',
        skin: 'paper',
        route: `${base}/sales/analytics`,
      },
      {
        key: 'payroll',
        label: 'Nómina próxima',
        hint: 'Pagos programados',
        icon: 'cash-outline',
        skin: 'ink',
        route: `${base}/payroll`,
      },
      {
        key: 'team',
        label: 'Equipo',
        hint: 'Plantilla y roles',
        icon: 'people-outline',
        skin: 'outline',
        route: `${base}/staff`,
      },
    ];
  }

  if (dayOpen) {
    return [
      {
        key: 'sale',
        label: 'Registrar venta',
        hint: 'Punto de venta del día operativo',
        icon: 'add-circle-outline',
        skin: 'hero',
        route: `${base}/sales/create`,
      },
      {
        key: 'receipt',
        label: 'Recepción de mercancía',
        hint: 'Registrar llegada',
        icon: 'archive-outline',
        skin: 'paper',
        route: `${base}/receipts/create`,
      },
      {
        key: 'shifts',
        label: 'Asistencia',
        hint: 'Entradas y salidas',
        icon: 'time-outline',
        skin: 'ink',
        route: `${base}/shifts`,
      },
      {
        key: 'close',
        label: 'Cerrar día',
        hint: 'Iniciar el FCI',
        icon: 'moon-outline',
        skin: 'outline',
        route: `${base}/daily-chain/closing`,
      },
    ];
  }

  return [
    {
      key: 'chain',
      label: 'Continuar el cierre',
      hint: 'Revisa el siguiente paso de la cadena',
      icon: 'layers-outline',
      skin: 'hero',
      route: `${base}/daily-chain`,
    },
    {
      key: 'sales',
      label: 'Ventas del día',
      hint: 'Historial completo',
      icon: 'cart-outline',
      skin: 'paper',
      route: `${base}/sales`,
    },
    {
      key: 'team',
      label: 'Equipo',
      hint: 'Plantilla activa',
      icon: 'people-outline',
      skin: 'ink',
      route: `${base}/staff`,
    },
    {
      key: 'payroll',
      label: 'Nómina',
      hint: 'Pagos próximos',
      icon: 'cash-outline',
      skin: 'outline',
      route: `${base}/payroll`,
    },
  ];
}

export function buildOperationModules(businessId: string): ModuleItemData[] {
  const base = `/businesses/${businessId}`;
  return [
    {
      key: 'inventory',
      label: 'Inventario',
      hint: 'Materiales, productos y ubicaciones',
      icon: 'cube-outline',
      route: `${base}/inventory`,
    },
    {
      key: 'staff',
      label: 'Equipo',
      hint: 'Plantilla y roles',
      icon: 'people-outline',
      route: `${base}/staff`,
    },
    {
      key: 'suppliers',
      label: 'Proveedores y compras',
      hint: 'Órdenes, recepciones y facturas',
      icon: 'business-outline',
      route: `${base}/suppliers`,
    },
    {
      key: 'processes',
      label: 'Procesos',
      hint: 'Templates y ejecuciones',
      icon: 'git-network-outline',
      route: `${base}/processes`,
    },
  ];
}

export function buildConfigModules(businessId: string): ModuleItemData[] {
  const base = `/businesses/${businessId}`;
  return [
    {
      key: 'areas',
      label: 'Áreas',
      hint: 'Espacios físicos y funcionales',
      icon: 'map-outline',
      route: `${base}/areas`,
    },
    {
      key: 'payments',
      label: 'Métodos de pago',
      hint: 'Configura cómo recibes',
      icon: 'card-outline',
      route: `${base}/payment-methods`,
    },
    {
      key: 'settings',
      label: 'Detalles del negocio',
      hint: 'Zona horaria, corte operativo',
      icon: 'settings-outline',
      route: `${base}`,
    },
  ];
}
