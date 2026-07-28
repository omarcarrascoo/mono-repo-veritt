import type { Ionicons } from '@expo/vector-icons';

import type { Business, MembershipRole } from '@/types/business.types';
import type { DailySaleSummary } from '@/types/sale.types';
import { formatCurrency } from '@/lib/staff-formatters';
import { permissions } from '@/lib/role-permissions';

// ── Data items (planos, sin handlers) ──────────────────────────────────
// El consumer memoiza un onPress por `route` y mapea items → component props.

export type QuickModuleItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  highlight?: boolean;
};

export type DetailMetricItem = {
  key: string;
  label: string;
  value: string;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  variant: 'hero' | 'ink' | 'paper';
  route: string;
};

export type DetailFactItem = {
  key: string;
  label: string;
  value: string;
  hint?: string;
};

// ── buildQuickModules ──────────────────────────────────────────────────

export function buildQuickModules(
  businessId: string,
  role: MembershipRole | null,
): QuickModuleItem[] {
  const base = `/businesses/${businessId}`;
  const canFinance = permissions.canSeeFinance(role);
  const canStaff = permissions.canManageStaff(role);
  const canPayroll = permissions.canSeePayroll(role);
  const canSupply = permissions.canManageSupply(role);
  const canConfig = permissions.canAccessConfig(role);
  const canShifts = permissions.canSeeShifts(role);
  const canMembers = permissions.canManageMembers(role);

  const list: QuickModuleItem[] = [
    {
      key: 'sales',
      label: canFinance ? 'Ventas' : 'Vender',
      icon: canFinance ? 'cart-outline' : 'add-circle-outline',
      highlight: !canFinance,
      route: canFinance ? `${base}/sales` : `${base}/sales/create`,
    },
    {
      key: 'inventory',
      label: 'Inventario',
      icon: 'cube-outline',
      route: `${base}/inventory`,
    },
    {
      key: 'receipts',
      label: 'Recepciones',
      icon: 'archive-outline',
      route: `${base}/receipts`,
    },
  ];

  if (canShifts) {
    list.push({
      key: 'shifts',
      label: 'Asistencia',
      icon: 'time-outline',
      route: `${base}/shifts`,
    });
  }

  if (canStaff) {
    list.push({
      key: 'staff',
      label: 'Equipo',
      icon: 'people-outline',
      route: `${base}/staff`,
    });
  }

  if (canPayroll) {
    list.push({
      key: 'payroll',
      label: 'Nómina',
      icon: 'cash-outline',
      route: `${base}/payroll`,
    });
  }

  if (canSupply) {
    list.push(
      {
        key: 'suppliers',
        label: 'Proveedores',
        icon: 'business-outline',
        route: `${base}/suppliers`,
      },
      {
        key: 'pos',
        label: 'Órdenes',
        icon: 'document-text-outline',
        route: `${base}/purchase-orders`,
      },
      {
        key: 'supplier-invoices',
        label: 'Facturas',
        icon: 'receipt-outline',
        route: `${base}/supplier-invoices`,
      },
    );
  }

  if (canConfig) {
    list.push(
      {
        key: 'processes',
        label: 'Procesos',
        icon: 'git-network-outline',
        route: `${base}/processes`,
      },
      {
        key: 'areas',
        label: 'Áreas',
        icon: 'map-outline',
        route: `${base}/areas`,
      },
      {
        key: 'payment-methods',
        label: 'Pagos',
        icon: 'card-outline',
        route: `${base}/payment-methods`,
      },
    );
  }

  if (canMembers) {
    list.push({
      key: 'members',
      label: 'Miembros',
      icon: 'person-add-outline',
      route: `${base}/members`,
    });
  }

  list.push({
    key: 'chat',
    label: 'Chat IA',
    icon: 'sparkles-outline',
    route: `${base}/chat`,
  });

  return list;
}

// ── buildDetailMetrics ─────────────────────────────────────────────────

export function buildDetailMetrics(
  businessId: string,
  role: MembershipRole | null,
  data: {
    dailySales: DailySaleSummary | null;
    activeStaffCount: number;
    upcomingPayrollTotal: number;
    inventoryCount: number;
    inventoryProducts: number;
    inventoryMaterials: number;
  },
): DetailMetricItem[] {
  const base = `/businesses/${businessId}`;
  const canFinance = permissions.canSeeFinance(role);
  const canStaff = permissions.canManageStaff(role);
  const canPayroll = permissions.canSeePayroll(role);

  const out: DetailMetricItem[] = [];

  if (canFinance) {
    const { dailySales } = data;
    const value = dailySales ? formatCurrency(dailySales.totalRevenue) : '—';
    const hint = dailySales
      ? `${dailySales.saleCount} tickets · prom. ${formatCurrency(dailySales.avgTicket)}`
      : 'Aún sin movimientos';
    out.push({
      key: 'sales-hero',
      label: 'Caja del día',
      value,
      hint,
      icon: 'wallet-outline',
      variant: 'paper',
      route: `${base}/sales/analytics`,
    });
  }

  if (canStaff) {
    out.push({
      key: 'staff',
      label: 'Equipo',
      value: `${data.activeStaffCount}`,
      hint:
        data.activeStaffCount === 1 ? 'persona activa' : 'personas activas',
      icon: 'people-outline',
      variant: 'paper',
      route: `${base}/staff`,
    });
  }

  if (canPayroll) {
    out.push({
      key: 'payroll',
      label: 'Nómina',
      value: formatCurrency(data.upcomingPayrollTotal),
      hint: 'próxima',
      icon: 'cash-outline',
      variant: 'paper',
      route: `${base}/payroll`,
    });
  }

  out.push({
    key: 'inventory',
    label: 'Inventario',
    value: `${data.inventoryCount}`,
    hint: `${data.inventoryProducts} productos · ${data.inventoryMaterials} insumos`,
    icon: 'cube-outline',
    variant: 'paper',
    route: `${base}/inventory`,
  });

  return out;
}

// ── buildDetailFacts ───────────────────────────────────────────────────

export function buildDetailFacts(business: Business): DetailFactItem[] {
  const facts: DetailFactItem[] = [
    { key: 'timezone', label: 'Zona horaria', value: business.timezone },
    {
      key: 'cutoff',
      label: 'Corte operativo',
      value: `${String(business.operationalDayCutoffHour).padStart(2, '0')}:00 hrs`,
      hint: 'Hora de cierre del día',
    },
  ];
  if (business.createdAt) {
    facts.push({
      key: 'createdAt',
      label: 'Creado',
      value: new Date(business.createdAt).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    });
  }
  return facts;
}
