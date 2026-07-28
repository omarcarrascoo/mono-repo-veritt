// Capabilities — la capa que hace los permisos configurables.
//
// En vez de preguntar "¿este rol está en MANAGEMENT_ROLES?", el código pregunta
// "¿este rol tiene la capacidad X?". El mapeo rol→capacidades vive aquí como
// DEFAULT (fuente de verdad si el negocio no configuró nada) y puede ser
// sobreescrito por negocio en la DB (ver PermissionService).
//
// Regla de oro: sin config del negocio → se usa este default → cero regresión.
// La matriz default es EQUIVALENTE a los grupos de roles.constants.ts.

import { ROLES, type Role } from './roles.constants';

export const CAPABILITIES = {
  // Inventario
  INVENTORY_WRITE: 'INVENTORY_WRITE', // crear/editar material y producto, recibir, FTI, transferir
  INVENTORY_ADJUST: 'INVENTORY_ADJUST', // ajustar stock a mano, precios, costos manuales
  // Ventas / POS
  POS_OPERATE: 'POS_OPERATE', // registrar ventas
  FINANCE_VIEW: 'FINANCE_VIEW', // ver dinero, márgenes, analítica de ventas
  // Caja
  CASH_OPERATE: 'CASH_OPERATE', // declarar saldo inicial de caja (candado C2), operar arqueo
  // Cadena diaria
  CHAIN_AUTHORIZE: 'CHAIN_AUTHORIZE', // autorizar FAI/FCI/FID, aprobar FAF
  CHAIN_SIGN: 'CHAIN_SIGN', // firmar el FOP
  // Administración / config
  FINANCE_MANAGE: 'FINANCE_MANAGE', // facturas, CxP, gastos, OCs, proveedores, config, nómina
  STAFF_MANAGE: 'STAFF_MANAGE', // roster, salarios, compensación
  CONFIG_MANAGE: 'CONFIG_MANAGE', // áreas, procesos, métodos de pago, onboarding, datos del negocio
  MEMBER_ADMIN: 'MEMBER_ADMIN', // invitar miembros, cambiar roles
} as const;

export type Capability = (typeof CAPABILITIES)[keyof typeof CAPABILITIES];

const {
  R1_INVENTORY,
  R2_CASH,
  R3_POS,
  R4_MANAGER,
  R5_ADMIN,
  R6_OWNER,
  VERITT_STAFF,
} = ROLES;

const C = CAPABILITIES;

// Matriz DEFAULT rol → capacidades. Derivada 1:1 de ROLES_R1_R6_MATRIX.md §3
// y de los grupos existentes en roles.constants.ts.
//
// R6_OWNER y VERITT_STAFF tienen bypass (todas las capacidades) — se resuelve
// en el PermissionService, no hace falta listarlas aquí. Se incluyen igual por
// claridad y para que la config por negocio pueda partir de algo explícito.
const ALL_CAPS: Capability[] = Object.values(C);

export const DEFAULT_ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  [R1_INVENTORY]: [C.INVENTORY_WRITE],
  [R2_CASH]: [
    // El cajero declara el saldo inicial de caja (candado C2) y opera el arqueo.
    C.CASH_OPERATE,
  ],
  [R3_POS]: [C.POS_OPERATE],
  [R4_MANAGER]: [
    C.POS_OPERATE,
    C.CASH_OPERATE,
    C.FINANCE_VIEW,
    C.CHAIN_AUTHORIZE,
    C.CHAIN_SIGN,
    C.CONFIG_MANAGE, // gestiona áreas/procesos operativos
  ],
  [R5_ADMIN]: [
    C.FINANCE_VIEW,
    C.FINANCE_MANAGE,
    C.STAFF_MANAGE,
    C.CONFIG_MANAGE,
    C.INVENTORY_WRITE,
    C.INVENTORY_ADJUST,
    C.CASH_OPERATE,
    C.CHAIN_AUTHORIZE,
    C.CHAIN_SIGN,
  ],
  [R6_OWNER]: ALL_CAPS,
  [VERITT_STAFF]: ALL_CAPS,
};
