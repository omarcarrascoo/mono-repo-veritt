import { MembershipRole } from '@/types/business.types';

// Fuente de verdad del cliente para qué ve cada rol (R1–R6).
// Refleja la matriz del backend (ROLES_R1_R6_MATRIX.md) para evitar llamadas
// que van a devolver 403.

// Gestión general (config operativa, ver staff, dashboards de management).
const MANAGEMENT_ROLES: MembershipRole[] = [
  'R4_MANAGER',
  'R5_ADMIN',
  'R6_OWNER',
  'VERITT_STAFF',
];

// Finanzas / administración (staff-gestión, config, proveedores, nómina).
const FINANCE_ROLES: MembershipRole[] = ['R5_ADMIN', 'R6_OWNER', 'VERITT_STAFF'];

// Inventario operativo (crear/editar material y producto, recibir, FTI).
const INVENTORY_ROLES: MembershipRole[] = [
  'R1_INVENTORY',
  'R5_ADMIN',
  'R6_OWNER',
  'VERITT_STAFF',
];

// Punto de venta (registrar ventas): R3 POS, R4 gerente, dueño.
const POS_ROLES: MembershipRole[] = [
  'R3_POS',
  'R4_MANAGER',
  'R6_OWNER',
  'VERITT_STAFF',
];

// Caja (candado C2): declarar el saldo inicial + arqueo. R2 + gerencia.
const CASH_ROLES: MembershipRole[] = [
  'R2_CASH',
  'R4_MANAGER',
  'R5_ADMIN',
  'R6_OWNER',
  'VERITT_STAFF',
];

// Autorizar/firmar la cadena diaria: de R4 hacia arriba.
const AUTHORIZATION_ROLES: MembershipRole[] = [
  'R4_MANAGER',
  'R5_ADMIN',
  'R6_OWNER',
  'VERITT_STAFF',
];

// Miembros del negocio (invitar, cambiar rol/estado): capability MEMBER_ADMIN.
// Sólo el dueño y staff interno de Veritt — refleja DEFAULT_ROLE_CAPABILITIES.
const MEMBER_ADMIN_ROLES: MembershipRole[] = ['R6_OWNER', 'VERITT_STAFF'];

function has(role: MembershipRole | null | undefined, list: MembershipRole[]) {
  return !!role && list.includes(role);
}

export const permissions = {
  // Dinero, márgenes, mix de pagos, analítica de ventas.
  canSeeFinance: (role: MembershipRole | null | undefined) =>
    has(role, MANAGEMENT_ROLES),

  // Roster, salarios, compensación histórica. (R5/R6)
  canManageStaff: (role: MembershipRole | null | undefined) =>
    has(role, FINANCE_ROLES),

  // Configuración: áreas, métodos de pago, onboarding, datos del negocio.
  canAccessConfig: (role: MembershipRole | null | undefined) =>
    has(role, FINANCE_ROLES),

  // Proveedores, órdenes de compra, facturas. (R5/R6)
  canManageSupply: (role: MembershipRole | null | undefined) =>
    has(role, FINANCE_ROLES),

  // Nómina próxima, historial de pagos. (R5/R6)
  canSeePayroll: (role: MembershipRole | null | undefined) =>
    has(role, FINANCE_ROLES),

  // Autorizar FAI/FCI, aprobar FID/FAF, firmar FOP, autorizar recepciones.
  canAuthorize: (role: MembershipRole | null | undefined) =>
    has(role, AUTHORIZATION_ROLES),

  // Vista del módulo de asistencia (turnos del equipo, historial).
  canSeeShifts: (role: MembershipRole | null | undefined) =>
    has(role, AUTHORIZATION_ROLES),

  // CRUD de insumos, productos y ubicaciones. R1 (almacenista) + finanzas.
  // (Ajustar stock a mano y precios queda sólo en finanzas; se valida en backend.)
  canManageInventory: (role: MembershipRole | null | undefined) =>
    has(role, INVENTORY_ROLES),

  // Recibir mercancía (candado C3). R1 ejecuta físicamente y el backend deja
  // su recepción en PENDING_REVIEW; R5/R6 reciben y el stock entra directo.
  // R2/R3 no reciben (matriz F1). Mismo conjunto que inventario operativo.
  canReceiveInventory: (role: MembershipRole | null | undefined) =>
    has(role, INVENTORY_ROLES),

  // POS: sólo R3, R4 o dueño registran ventas (R1/R2 no operan caja/POS).
  canCreateSale: (role: MembershipRole | null | undefined) =>
    has(role, POS_ROLES),

  // Caja: declarar el saldo inicial del día (candado C2). R2 + gerencia.
  canOperateCash: (role: MembershipRole | null | undefined) =>
    has(role, CASH_ROLES),

  // Miembros: invitar por correo y asignar/cambiar rol R1–R6. Sólo dueño.
  canManageMembers: (role: MembershipRole | null | undefined) =>
    has(role, MEMBER_ADMIN_ROLES),

  // Todos los miembros activos pueden marcar su propia asistencia.
  canClockSelf: (role: MembershipRole | null | undefined) => !!role,
};
