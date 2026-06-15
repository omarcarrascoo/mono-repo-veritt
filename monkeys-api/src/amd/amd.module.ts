import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AmdController } from './amd.controller';
import { AmdService } from './amd.service';
import { AmdRepository } from './amd.repository';
import { AmdBuilderService } from './amd-builder.service';

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [AmdController],
  providers: [AmdService, AmdRepository, AmdBuilderService],
  exports: [AmdService],
})
export class AmdModule {}
