import { DEFAULT_ROLE_CAPABILITIES, CAPABILITIES } from './capabilities';
import {
  ROLES,
  BYPASS_ROLES,
  MANAGEMENT_ROLES,
  FINANCE_ROLES,
  INVENTORY_ROLES,
  POS_ROLES,
  CASH_ROLES,
  CHAIN_AUTH_ROLES,
  CHAIN_SIGN_ROLES,
  MEMBER_ADMIN_ROLES,
  type Role,
} from './roles.constants';

// Verifica que la matriz DEFAULT de capabilities sea EQUIVALENTE a los grupos
// de roles originales. Si esto pasa, migrar los gates a can() no introdujo
// ninguna regresión de permisos (cero cambios de comportamiento por default).

// Resuelve "¿este rol tiene esta capacidad por default?" incluyendo el bypass
// (R6/VERITT_STAFF tienen todo), igual que hace PermissionService.
function defaultHas(role: Role, capability: string): boolean {
  if (BYPASS_ROLES.includes(role)) return true;
  return (DEFAULT_ROLE_CAPABILITIES[role] ?? []).includes(capability as never);
}

const ALL_ROLES = Object.values(ROLES) as Role[];

describe('DEFAULT_ROLE_CAPABILITIES ↔ grupos de roles (equivalencia)', () => {
  const cases: Array<[string, string[]]> = [
    [CAPABILITIES.INVENTORY_WRITE, INVENTORY_ROLES],
    [CAPABILITIES.INVENTORY_ADJUST, FINANCE_ROLES],
    [CAPABILITIES.POS_OPERATE, POS_ROLES],
    [CAPABILITIES.CASH_OPERATE, CASH_ROLES],
    [CAPABILITIES.FINANCE_VIEW, MANAGEMENT_ROLES],
    [CAPABILITIES.FINANCE_MANAGE, FINANCE_ROLES],
    [CAPABILITIES.STAFF_MANAGE, FINANCE_ROLES],
    [CAPABILITIES.CONFIG_MANAGE, MANAGEMENT_ROLES],
    [CAPABILITIES.CHAIN_AUTHORIZE, CHAIN_AUTH_ROLES],
    [CAPABILITIES.CHAIN_SIGN, CHAIN_SIGN_ROLES],
    [CAPABILITIES.MEMBER_ADMIN, MEMBER_ADMIN_ROLES],
  ];

  it.each(cases)(
    'capability %s coincide con su grupo para todos los roles',
    (capability, group) => {
      for (const role of ALL_ROLES) {
        expect(defaultHas(role, capability)).toBe(group.includes(role));
      }
    },
  );

  it('R6 y VERITT_STAFF tienen todas las capacidades', () => {
    for (const cap of Object.values(CAPABILITIES)) {
      expect(defaultHas(ROLES.R6_OWNER, cap)).toBe(true);
      expect(defaultHas(ROLES.VERITT_STAFF, cap)).toBe(true);
    }
  });
});
