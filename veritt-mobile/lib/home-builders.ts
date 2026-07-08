import { Ionicons } from '@expo/vector-icons';

import { DailyChainStatus } from '@/types/daily-chain.types';
import { DailySaleSummary } from '@/types/sale.types';
import { formatCurrency } from '@/lib/staff-formatters';
import { permissions } from '@/lib/role-permissions';
import type { MembershipRole } from '@/types/business.types';
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
  role: MembershipRole | null,
): BentoItemData[] {
  const base = `/businesses/${businessId}`;
  const canFinance = permissions.canSeeFinance(role);
  const canPayroll = permissions.canSeePayroll(role);

  // OPERATOR: no ve dinero. Muestra un bento operativo centrado en actividad.
  if (!canFinance) {
    return [
      {
        key: 'chain-hero',
        kind: 'headline',
        label: 'Cadena del día',
        value: dailySales ? `${dailySales.saleCount} tickets` : 'Día en curso',
        sub: 'Abre la cadena operativa',
        palette: 'paper',
        route: `${base}/daily-chain`,
      },
      {
        key: 'shifts',
        kind: 'metric',
        label: 'Mi asistencia',
        value: 'Abrir',
        icon: 'time-outline',
        badgeTone: 'neutral',
        palette: 'ink',
        route: `${base}/shifts`,
      },
      {
        key: 'receipts',
        kind: 'metric',
        label: 'Recepción',
        value: 'Registrar',
        icon: 'archive-outline',
        badgeTone: 'neutral',
        palette: 'ink',
        route: `${base}/receipts/create`,
      },
      {
        key: 'sale-create',
        kind: 'cta',
        label: 'Registrar venta',
        sub: 'Abre el punto de venta',
        icon: 'add-circle-outline',
        palette: 'paper',
        route: `${base}/sales/create`,
      },
    ];
  }

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

  const items: BentoItemData[] = [
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
  ];

  if (canPayroll) {
    items.push({
      key: 'payroll',
      kind: 'metric',
      label: 'Nómina próxima',
      value: formatCurrency(upcomingPayrollTotal),
      sub: `${staffCount} activos`,
      badgeTone: 'neutral',
      icon: 'cash-outline',
      palette: 'ink',
      route: `${base}/payroll`,
    });
  } else {
    items.push({
      key: 'tickets',
      kind: 'metric',
      label: 'Tickets hoy',
      value: dailySales ? String(dailySales.saleCount) : '—',
      sub: dailySales
        ? `Prom. ${formatCurrency(dailySales.avgTicket)}`
        : 'Sin ventas',
      badgeTone: 'neutral',
      icon: 'receipt-outline',
      palette: 'ink',
      route: `${base}/sales`,
    });
  }

  items.push({
    key: 'payments',
    kind: 'list',
    label: 'Mix de pago hoy',
    bullets: paymentBullets,
    palette: 'paper',
    route: `${base}/sales`,
  });

  return items;
}

export function buildNextMoves(
  businessId: string,
  chain: DailyChainStatus | null,
  role: MembershipRole | null,
): NextMoveItemData[] {
  const base = `/businesses/${businessId}`;
  const dayOpen = chain?.fai?.status === 'AUTHORIZED' && !chain.fci;
  const dayClosed = chain?.fop?.status === 'SIGNED';

  const canFinance = permissions.canSeeFinance(role);
  const canPayroll = permissions.canSeePayroll(role);
  const canStaff = permissions.canManageStaff(role);
  const canSupply = permissions.canManageSupply(role);

  const candidates: Array<NextMoveItemData | null> = [];

  if (!chain?.fai) {
    candidates.push(
      {
        key: 'open',
        label: 'Abrir el día',
        hint: 'Levanta el conteo FAI para habilitar ventas',
        icon: 'sunny-outline',
        skin: 'hero',
        route: `${base}/daily-chain/opening`,
      },
      {
        key: 'shifts',
        label: 'Asistencia',
        hint: 'Marca entrada y salida',
        icon: 'time-outline',
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
      canSupply
        ? {
            key: 'suppliers',
            label: 'Proveedores y compras',
            hint: 'Órdenes y recepciones',
            icon: 'business-outline',
            skin: 'outline',
            route: `${base}/suppliers`,
          }
        : {
            key: 'receipt-draft',
            label: 'Recepción pendiente',
            hint: 'Registra borrador para autorizar',
            icon: 'archive-outline',
            skin: 'outline',
            route: `${base}/receipts/create`,
          },
    );
  } else if (dayClosed) {
    candidates.push(
      {
        key: 'fop',
        label: 'Ver resumen del día',
        hint: 'FOP firmado · todo conciliado',
        icon: 'checkmark-done-circle-outline',
        skin: 'hero',
        route: `${base}/daily-chain/fop`,
      },
      canFinance
        ? {
            key: 'analytics',
            label: 'Analítica de ventas',
            hint: 'Márgenes y tendencias',
            icon: 'bar-chart-outline',
            skin: 'paper',
            route: `${base}/sales/analytics`,
          }
        : {
            key: 'shifts-mine',
            label: 'Mi asistencia',
            hint: 'Tu historial de turnos',
            icon: 'time-outline',
            skin: 'paper',
            route: `${base}/shifts`,
          },
      canPayroll
        ? {
            key: 'payroll',
            label: 'Nómina próxima',
            hint: 'Pagos programados',
            icon: 'cash-outline',
            skin: 'ink',
            route: `${base}/payroll`,
          }
        : null,
      canStaff
        ? {
            key: 'team',
            label: 'Equipo',
            hint: 'Plantilla y roles',
            icon: 'people-outline',
            skin: 'outline',
            route: `${base}/staff`,
          }
        : null,
    );
  } else if (dayOpen) {
    candidates.push(
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
        hint: canSupply ? 'Registrar llegada' : 'Crea un borrador para autorizar',
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
    );
  } else {
    candidates.push(
      {
        key: 'chain',
        label: 'Continuar el cierre',
        hint: 'Revisa el siguiente paso de la cadena',
        icon: 'layers-outline',
        skin: 'hero',
        route: `${base}/daily-chain`,
      },
      canFinance
        ? {
            key: 'sales',
            label: 'Ventas del día',
            hint: 'Historial completo',
            icon: 'cart-outline',
            skin: 'paper',
            route: `${base}/sales`,
          }
        : {
            key: 'shifts-mine',
            label: 'Mi asistencia',
            hint: 'Tu historial de turnos',
            icon: 'time-outline',
            skin: 'paper',
            route: `${base}/shifts`,
          },
      canStaff
        ? {
            key: 'team',
            label: 'Equipo',
            hint: 'Plantilla activa',
            icon: 'people-outline',
            skin: 'ink',
            route: `${base}/staff`,
          }
        : null,
      canPayroll
        ? {
            key: 'payroll',
            label: 'Nómina',
            hint: 'Pagos próximos',
            icon: 'cash-outline',
            skin: 'outline',
            route: `${base}/payroll`,
          }
        : null,
    );
  }

  return candidates.filter((x): x is NextMoveItemData => x !== null);
}

export function buildOperationModules(
  businessId: string,
  role: MembershipRole | null,
): ModuleItemData[] {
  const base = `/businesses/${businessId}`;
  const canStaff = permissions.canManageStaff(role);
  const canSupply = permissions.canManageSupply(role);
  const canConfig = permissions.canAccessConfig(role);

  const items: ModuleItemData[] = [
    {
      key: 'inventory',
      label: 'Inventario',
      hint: 'Materiales, productos y ubicaciones',
      icon: 'cube-outline',
      route: `${base}/inventory`,
    },
  ];

  if (canStaff) {
    items.push({
      key: 'staff',
      label: 'Equipo',
      hint: 'Plantilla y roles',
      icon: 'people-outline',
      route: `${base}/staff`,
    });
  }

  if (canSupply) {
    items.push({
      key: 'suppliers',
      label: 'Proveedores y compras',
      hint: 'Órdenes, recepciones y facturas',
      icon: 'business-outline',
      route: `${base}/suppliers`,
    });
  }

  if (canConfig) {
    items.push({
      key: 'processes',
      label: 'Procesos',
      hint: 'Templates y ejecuciones',
      icon: 'git-network-outline',
      route: `${base}/processes`,
    });
  }

  return items;
}

export function buildConfigModules(
  businessId: string,
  role: MembershipRole | null,
): ModuleItemData[] {
  if (!permissions.canAccessConfig(role)) return [];

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
