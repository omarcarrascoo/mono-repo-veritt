import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma/prisma.service';
import {
  PERMISSION_KEY,
  PermissionMetadata,
} from '../decorators/require-permission.decorator';
import { BYPASS_ROLES } from '../constants/roles.constants';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<PermissionMetadata>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @RequirePermission decorator → allow
    if (!meta) return true;

    const request = context.switchToHttp().getRequest();
    const membership = request.membership;

    if (!membership) {
      throw new ForbiddenException('Business membership context is required');
    }

    // OWNER and VERITT_STAFF always have full access
    if (BYPASS_ROLES.includes(membership.role)) return true;

    const businessId: string = request.params.businessId;
    const areaId: string | undefined = meta.options?.areaParam
      ? request.params[meta.options.areaParam]
      : undefined;
    const processId: string | undefined = meta.options?.processParam
      ? request.params[meta.options.processParam]
      : undefined;

    // Check for a matching permission record
    const permission = await this.prisma.rolePermission.findFirst({
      where: {
        businessId,
        role: membership.role,
        permission: meta.action,
        ...(areaId ? { areaId } : { areaId: null }),
        ...(processId ? { processId } : { processId: null }),
      },
    });

    // If no exact match, try a global permission (no area/process scope)
    if (!permission && (areaId || processId)) {
      const globalPermission = await this.prisma.rolePermission.findFirst({
        where: {
          businessId,
          role: membership.role,
          permission: meta.action,
          areaId: null,
          processId: null,
        },
      });
      if (globalPermission) return true;
    }

    if (!permission) {
      throw new ForbiddenException(
        `Insufficient permissions: ${meta.action} access required`,
      );
    }

    return true;
  }
}
