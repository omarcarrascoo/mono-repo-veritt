import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { DailyChainModule } from '../daily-chain/daily-chain.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { ReceiptsRepository } from './receipts.repository';

@Module({
  imports: [NotificationsModule, DailyChainModule, InventoryModule],
  controllers: [ReceiptsController],
  providers: [ReceiptsService, ReceiptsRepository],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
