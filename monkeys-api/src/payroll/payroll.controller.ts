import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PayrollService } from './payroll.service';
import { UpdatePayrollPaymentDto } from './dto/update-payroll-payment.dto';

@Controller('businesses/:businessId/payroll')
@UseGuards(JwtAuthGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get('payments/upcoming')
  getUpcomingPayments(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.payrollService.getUpcomingPayments(businessId, user.id);
  }

  @Get('payments/history')
  getPaymentHistory(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.payrollService.getPaymentHistory(businessId, user.id);
  }

  @Patch('payments/:paymentId')
  updatePaymentStatus(
    @Param('businessId') businessId: string,
    @Param('paymentId') paymentId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdatePayrollPaymentDto,
  ) {
    return this.payrollService.updatePaymentStatus(businessId, paymentId, user.id, dto);
  }
}
