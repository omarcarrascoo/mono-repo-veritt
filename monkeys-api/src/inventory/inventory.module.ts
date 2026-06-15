import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { LotCostingService } from './lot-costing.service';

@Module({
  imports: [NotificationsModule],
  controllers: [InventoryController],
  providers: [InventoryService, LotCostingService],
  exports: [InventoryService, LotCostingService],
})
export class InventoryModule {}
