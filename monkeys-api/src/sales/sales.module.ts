import { Module } from '@nestjs/common';
import { DailyChainModule } from '../daily-chain/daily-chain.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SalesRepository } from './sales.repository';

@Module({
  imports: [DailyChainModule],
  controllers: [SalesController],
  providers: [SalesService, SalesRepository],
  exports: [SalesService, SalesRepository],
})
export class SalesModule {}
