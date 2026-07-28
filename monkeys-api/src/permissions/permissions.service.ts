import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { PermissionService } from '../common/services/permission.service';
import type { Role } from '../common/constants/roles.constants';
import type { Capability } from '../common/constants/capabilities';

/**
 * Servicio de la API de configuración de permisos. Gatea que solo quien tiene
 * la capacidad MEMBER_ADMIN (R6/dueño por default) pueda leer/editar la matriz,
 * y delega la resolución al PermissionService.
 */
@Injectable()
export class PermissionsConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionService,
  ) {}

  private async ensureCanConfigure(businessId: string, userId: string) {
    const membership = await this.prisma.businessMembership.findFirst({
      where: { businessId, userId, status: 'ACTIVE' },
    });
    if (
      !membership ||
      !(await this.permissions.can(businessId, membership.role, 'MEMBER_ADMIN'))
    ) {
      throw new ForbiddenException(
        'Solo el dueño puede configurar los permisos del negocio',
      );
    }
  }

  async getMatrix(businessId: string, userId: string) {
    await this.ensureCanConfigure(businessId, userId);
    return this.permissions.getBusinessPermissionMatrix(businessId);
  }

  async setRole(
    businessId: string,
    userId: string,
    role: Role,
    capabilities: string[],
  ) {
    await this.ensureCanConfigure(businessId, userId);
    return this.permissions.setRoleCapabilities(
      businessId,
      role,
      capabilities as Capability[],
    );
  }

  async resetRole(businessId: string, userId: string, role: Role) {
    await this.ensureCanConfigure(businessId, userId);
    return this.permissions.resetRoleCapabilities(businessId, role);
  }
}
