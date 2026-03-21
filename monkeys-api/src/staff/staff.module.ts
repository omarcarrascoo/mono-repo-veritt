import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { StaffRepository } from './staff.repository';
import { PayrollModule } from '../payroll/payroll.module';

@Module({
  imports: [PayrollModule],
  controllers: [StaffController],
  providers: [StaffService, StaffRepository],
  exports: [StaffService],
})
export class StaffModule {}
