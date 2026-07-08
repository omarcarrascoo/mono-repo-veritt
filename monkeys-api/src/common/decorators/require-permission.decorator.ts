import { SetMetadata } from '@nestjs/common';
import { PermissionAction } from '@prisma/client';

export interface RequirePermissionOptions {
  /** Route param name that holds the areaId (e.g. 'areaId') */
  areaParam?: string;
  /** Route param name that holds the processId (e.g. 'processId') */
  processParam?: string;
}

export interface PermissionMetadata {
  action: PermissionAction;
  options?: RequirePermissionOptions;
}

export const PERMISSION_KEY = 'requiredPermission';

export const RequirePermission = (
  action: PermissionAction,
  options?: RequirePermissionOptions,
) => SetMetadata(PERMISSION_KEY, { action, options } as PermissionMetadata);
