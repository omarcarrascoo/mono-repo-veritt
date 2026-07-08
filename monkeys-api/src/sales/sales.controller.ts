import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CancelSaleDto } from './dto/cancel-sale.dto';

@Controller('businesses/:businessId/sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSaleDto,
  ) {
    return this.salesService.create(businessId, user.id, dto);
  }

  @Get()
  findAll(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Query('status') status?: string,
    @Query('areaId') areaId?: string,
    @Query('operatorStaffId') operatorStaffId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.salesService.findAll(businessId, user.id, { status, areaId, operatorStaffId, from, to });
  }

  @Get('daily-summary')
  getDailySummary(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Query('date') date: string,
  ) {
    return this.salesService.getDailySummary(businessId, user.id, date);
  }

  @Get('period-summary')
  getPeriodSummary(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.salesService.getPeriodSummary(businessId, user.id, from, to);
  }

  @Get('product-revenue')
  getProductRevenue(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.salesService.getProductRevenue(businessId, user.id, from, to);
  }

  @Get('theoretical-consumption')
  getTheoreticalConsumption(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.salesService.getTheoreticalConsumption(businessId, user.id, from, to);
  }

  @Get(':saleId')
  findOne(
    @Param('businessId') businessId: string,
    @Param('saleId') saleId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.salesService.findOne(businessId, saleId, user.id);
  }

  @Post(':saleId/cancel')
  cancel(
    @Param('businessId') businessId: string,
    @Param('saleId') saleId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CancelSaleDto,
  ) {
    return this.salesService.cancel(businessId, saleId, user.id, dto.reason);
  }
}
