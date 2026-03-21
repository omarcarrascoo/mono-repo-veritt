import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollRepository } from './payroll.repository';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [PayrollController],
  providers: [PayrollService, PayrollRepository],
  exports: [PayrollService],
})
export class PayrollModule {}
