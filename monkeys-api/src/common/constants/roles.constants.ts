// Roles R1–R6 (V8.0). Fuente de verdad de la matriz: ROLES_R1_R6_MATRIX.md.
// Los checks del código deben referenciar los GRUPOS de abajo, no strings sueltos,
// para que cambiar un permiso sea editar un solo lugar.

export const ROLES = {
  R1_INVENTORY: 'R1_INVENTORY',
  R2_CASH: 'R2_CASH',
  R3_POS: 'R3_POS',
  R4_MANAGER: 'R4_MANAGER',
  R5_ADMIN: 'R5_ADMIN',
  R6_OWNER: 'R6_OWNER',
  VERITT_STAFF: 'VERITT_STAFF',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

const { R1_INVENTORY, R2_CASH, R3_POS, R4_MANAGER, R5_ADMIN, R6_OWNER, VERITT_STAFF } =
  ROLES;

// ── Grupos de permiso (derivados de la matriz §3) ──────────────────────

/** Bypass total: siempre pasan cualquier check. */
export const BYPASS_ROLES: string[] = [R6_OWNER, VERITT_STAFF];

/** Gestión general (config, staff-lectura, dashboards de management). */
export const MANAGEMENT_ROLES: string[] = [R4_MANAGER, R5_ADMIN, R6_OWNER, VERITT_STAFF];

/** Finanzas / administración (facturas, CxP, gastos, OCs, ajustar stock y precio). */
export const FINANCE_ROLES: string[] = [R5_ADMIN, R6_OWNER, VERITT_STAFF];

/** Inventario operativo (crear/editar material y producto, recibir, FTI). */
export const INVENTORY_ROLES: string[] = [R1_INVENTORY, R5_ADMIN, R6_OWNER, VERITT_STAFF];

/** Punto de venta (registrar ventas). */
export const POS_ROLES: string[] = [R3_POS, R4_MANAGER, R6_OWNER, VERITT_STAFF];

/** Caja: declarar saldo inicial (candado C2) y operar arqueo. */
export const CASH_ROLES: string[] = [R2_CASH, R4_MANAGER, R5_ADMIN, R6_OWNER, VERITT_STAFF];

/** Autorizar formatos de la cadena (FAI/FCI/FID) + arqueo FAF. */
export const CHAIN_AUTH_ROLES: string[] = [R4_MANAGER, R5_ADMIN, R6_OWNER, VERITT_STAFF];

/** Firmar el FOP: de R4 hacia arriba (decisión del dueño 2026-07-08). */
export const CHAIN_SIGN_ROLES: string[] = [R4_MANAGER, R5_ADMIN, R6_OWNER, VERITT_STAFF];

/** Gestión de miembros del negocio (invitar, cambiar roles). Solo dueño. */
export const MEMBER_ADMIN_ROLES: string[] = [R6_OWNER, VERITT_STAFF];
