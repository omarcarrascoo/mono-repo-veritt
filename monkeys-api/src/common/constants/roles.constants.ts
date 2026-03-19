export const ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  SUPERVISOR: 'SUPERVISOR',
  OPERATOR: 'OPERATOR',
  VERITT_STAFF: 'VERITT_STAFF',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];