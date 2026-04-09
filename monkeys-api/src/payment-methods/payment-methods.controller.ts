import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@Controller('businesses/:businessId/payment-methods')
@UseGuards(JwtAuthGuard)
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Get()
  findAll(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.paymentMethodsService.findAll(businessId, user.id);
  }

  @Post()
  create(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePaymentMethodDto,
  ) {
    return this.paymentMethodsService.create(businessId, user.id, dto);
  }

  @Patch(':paymentMethodId')
  update(
    @Param('businessId') businessId: string,
    @Param('paymentMethodId') paymentMethodId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.paymentMethodsService.update(businessId, paymentMethodId, user.id, dto);
  }
}
