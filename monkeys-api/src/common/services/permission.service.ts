import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import { ROLES, BYPASS_ROLES, type Role } from '../constants/roles.constants';
import {
  CAPABILITIES,
  DEFAULT_ROLE_CAPABILITIES,
  type Capability,
} from '../constants/capabilities';

/**
 * PermissionService — resuelve permisos configurables por negocio.
 *
 * Resolución de `can(businessId, role, capability)`:
 *   1. Roles de bypass (R6 dueño, VERITT_STAFF) → siempre true.
 *   2. Si el negocio tiene override para ese rol (filas en BusinessRoleCapability),
 *      esas filas DEFINEN sus capacidades (reemplazan el default).
 *   3. Si no hay override para ese rol → se usa DEFAULT_ROLE_CAPABILITIES.
 *
 * Regla de oro: sin config del negocio → default → comportamiento idéntico al
 * de hoy (cero regresión). R6 podrá editar el override desde la app.
 */
@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async can(
    businessId: string,
    role: Role | string | null | undefined,
    capability: Capability,
  ): Promise<boolean> {
    if (!role) return false;
    if (BYPASS_ROLES.includes(role)) return true;

    const caps = await this.getEffectiveCapabilities(businessId, role);
    return caps.has(capability);
  }

  /**
   * Capacidades efectivas de un rol en un negocio: override si existe, si no
   * el default. Devuelve un Set para lookups O(1).
   */
  async getEffectiveCapabilities(
    businessId: string,
    role: Role | string,
  ): Promise<Set<Capability>> {
    if (BYPASS_ROLES.includes(role)) {
      return new Set(Object.values(DEFAULT_ROLE_CAPABILITIES).flat());
    }

    const overrides = await this.prisma.businessRoleCapability.findMany({
      where: { businessId, role: role as Role },
    });

    if (overrides.length === 0) {
      // Sin config del negocio → default en código.
      return new Set(DEFAULT_ROLE_CAPABILITIES[role as Role] ?? []);
    }

    // El negocio configuró este rol: sus filas definen las capacidades.
    // allowed=true la concede; allowed=false la revoca explícitamente.
    const set = new Set<Capability>();
    for (const row of overrides) {
      if (row.allowed) set.add(row.capability as Capability);
    }
    return set;
  }

  // ── Config por negocio (para R6) ──

  /**
   * Matriz efectiva de permisos del negocio: por cada rol (excepto bypass),
   * qué capacidades tiene hoy y si vienen del default o de override.
   * Alimenta la pantalla de configuración de R6.
   */
  async getBusinessPermissionMatrix(businessId: string) {
    const configurableRoles = (Object.values(ROLES) as Role[]).filter(
      (r) => !BYPASS_ROLES.includes(r),
    );
    const allCaps = Object.values(CAPABILITIES) as Capability[];

    const overrideRows = await this.prisma.businessRoleCapability.findMany({
      where: { businessId },
    });
    const configuredRoles = new Set(overrideRows.map((r) => r.role));

    const roles = await Promise.all(
      configurableRoles.map(async (role) => {
        const effective = await this.getEffectiveCapabilities(businessId, role);
        return {
          role,
          isCustomized: configuredRoles.has(role),
          capabilities: allCaps.map((capability) => ({
            capability,
            allowed: effective.has(capability),
            default: (DEFAULT_ROLE_CAPABILITIES[role] ?? []).includes(capability),
          })),
        };
      }),
    );

    return { businessId, allCapabilities: allCaps, roles };
  }

  /**
   * Configura las capacidades de un rol en un negocio (override completo).
   * Reemplaza la config previa de ese rol: las capacidades enviadas quedan
   * como allowed=true; el resto queda implícitamente sin conceder.
   * Roles de bypass no son configurables.
   */
  async setRoleCapabilities(
    businessId: string,
    role: Role,
    capabilities: Capability[],
  ) {
    if (BYPASS_ROLES.includes(role)) {
      throw new Error('Los roles de bypass no son configurables');
    }
    const valid = new Set(Object.values(CAPABILITIES) as string[]);
    const clean = [...new Set(capabilities)].filter((c) => valid.has(c));

    await this.prisma.$transaction(async (tx) => {
      await tx.businessRoleCapability.deleteMany({ where: { businessId, role } });
      if (clean.length > 0) {
        await tx.businessRoleCapability.createMany({
          data: clean.map((capability) => ({
            businessId,
            role,
            capability,
            allowed: true,
          })),
        });
      }
    });

    return this.getBusinessPermissionMatrix(businessId);
  }

  /** Restaura el default de un rol (borra el override del negocio). */
  async resetRoleCapabilities(businessId: string, role: Role) {
    await this.prisma.businessRoleCapability.deleteMany({
      where: { businessId, role },
    });
    return this.getBusinessPermissionMatrix(businessId);
  }
}
