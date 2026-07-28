import { Global, Module } from '@nestjs/common';
import { PermissionService } from './services/permission.service';

// Global: el PermissionService se inyecta en cualquier servicio de dominio
// sin re-importar. Depende de PrismaService (PrismaModule ya es @Global).
@Global()
@Module({
  providers: [PermissionService],
  exports: [PermissionService],
})
export class CommonModule {}
