import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma/prisma.module';
import { DailyChainController } from './daily-chain.controller';
import { DailyChainService } from './daily-chain.service';
import { DailyChainRepository } from './daily-chain.repository';

@Module({
  imports: [PrismaModule],
  controllers: [DailyChainController],
  providers: [DailyChainService, DailyChainRepository],
  exports: [DailyChainService],
})
export class DailyChainModule {}
