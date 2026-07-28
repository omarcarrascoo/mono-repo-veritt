import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { PermissionsConfigService } from './permissions.service';

// PermissionService y PrismaService son globales (CommonModule/PrismaModule).
@Module({
  controllers: [PermissionsController],
  providers: [PermissionsConfigService],
})
export class PermissionsModule {}
