import { Module } from '@nestjs/common';
import { TimeTrackingController } from './time-tracking.controller';
import { TimeTrackingService } from './time-tracking.service';
import { TimeTrackingRepository } from './time-tracking.repository';

@Module({
  controllers: [TimeTrackingController],
  providers: [TimeTrackingService, TimeTrackingRepository],
  exports: [TimeTrackingService, TimeTrackingRepository],
})
export class TimeTrackingModule {}
