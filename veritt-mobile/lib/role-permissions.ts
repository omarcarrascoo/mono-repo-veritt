import { MembershipRole } from '@/types/business.types';

// Fuente de verdad del cliente para qué ve cada rol.
// Refleja la autorización real del backend (para evitar llamadas que van a devolver 403).

const FINANCE_ROLES: MembershipRole[] = ['OWNER', 'ADMIN', 'VERITT_STAFF'];
const STAFF_MANAGEMENT_ROLES: MembershipRole[] = ['OWNER', 'ADMIN', 'VERITT_STAFF'];
const CONFIG_ROLES: MembershipRole[] = ['OWNER', 'ADMIN', 'VERITT_STAFF'];
const SUPPLY_ROLES: MembershipRole[] = ['OWNER', 'ADMIN', 'VERITT_STAFF'];
const PAYROLL_MANAGER_ROLES: MembershipRole[] = [
  'OWNER',
  'ADMIN',
  'SUPERVISOR',
  'VERITT_STAFF',
];
const AUTHORIZATION_ROLES: MembershipRole[] = [
  'OWNER',
  'ADMIN',
  'SUPERVISOR',
  'VERITT_STAFF',
];

function has(role: MembershipRole | null | undefined, list: MembershipRole[]) {
  return !!role && list.includes(role);
}

export const permissions = {
  // Dinero, márgenes, mix de pagos, analítica de ventas.
  canSeeFinance: (role: MembershipRole | null | undefined) =>
    has(role, FINANCE_ROLES),

  // Roster, salarios, compensación histórica.
  canManageStaff: (role: MembershipRole | null | undefined) =>
    has(role, STAFF_MANAGEMENT_ROLES),

  // Configuración: áreas, métodos de pago, onboarding, datos del negocio.
  canAccessConfig: (role: MembershipRole | null | undefined) =>
    has(role, CONFIG_ROLES),

  // Proveedores, órdenes de compra, facturas.
  canManageSupply: (role: MembershipRole | null | undefined) =>
    has(role, SUPPLY_ROLES),

  // Nómina próxima, historial de pagos.
  canSeePayroll: (role: MembershipRole | null | undefined) =>
    has(role, PAYROLL_MANAGER_ROLES),

  // Autorizar FAI/FCI, aprobar FID/FAF, firmar FOP, autorizar recepciones.
  canAuthorize: (role: MembershipRole | null | undefined) =>
    has(role, AUTHORIZATION_ROLES),

  // Vista del módulo de asistencia (turnos del equipo, historial, hero stats).
  // OPERATOR no puede entrar — sólo supervisores/managers.
  canSeeShifts: (role: MembershipRole | null | undefined) =>
    has(role, AUTHORIZATION_ROLES),

  // OPERATOR-friendly: todos los miembros activos pueden registrar ventas y
  // marcar su propia asistencia.
  canCreateSale: (role: MembershipRole | null | undefined) => !!role,
  canClockSelf: (role: MembershipRole | null | undefined) => !!role,
};
