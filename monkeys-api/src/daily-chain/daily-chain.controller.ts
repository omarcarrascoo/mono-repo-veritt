import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DailyChainService } from './daily-chain.service';
import { CreateOpeningDto } from './dto/create-opening.dto';
import { CreateClosingDto } from './dto/create-closing.dto';
import { ClassifyDeviationDto } from './dto/classify-deviation.dto';
import { CreateReconciliationDto } from './dto/create-reconciliation.dto';
import { CreateCashOpeningDto } from './dto/create-cash-opening.dto';

@Controller('businesses/:businessId/daily-chain')
@UseGuards(JwtAuthGuard)
export class DailyChainController {
  constructor(private readonly service: DailyChainService) {}

  // ── Chain Status ──

  @Get('status')
  getStatus(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Query('date') date?: string,
  ) {
    return this.service.getStatus(businessId, user.id, date);
  }

  // ── FAI (Opening) ──

  @Post('opening')
  createOpening(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateOpeningDto,
  ) {
    return this.service.createOpening(businessId, user.id, dto);
  }

  @Get('opening')
  getOpening(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Query('date') date?: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.service.getOpening(businessId, user.id, date, locationId);
  }

  @Post('opening/:openingId/authorize')
  authorizeOpening(
    @Param('businessId') businessId: string,
    @Param('openingId') openingId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.authorizeOpening(businessId, openingId, user.id);
  }

  @Post('opening/:openingId/reject')
  rejectOpening(
    @Param('businessId') businessId: string,
    @Param('openingId') openingId: string,
    @CurrentUser() user: { id: string },
    @Body('reason') reason: string,
  ) {
    return this.service.rejectOpening(businessId, openingId, user.id, reason);
  }

  // ── FCI (Closing) ──

  @Post('closing')
  createClosing(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateClosingDto,
  ) {
    return this.service.createClosing(businessId, user.id, dto);
  }

  @Get('closing')
  getClosing(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Query('date') date?: string,
  ) {
    return this.service.getClosing(businessId, user.id, date);
  }

  @Post('closing/:closingId/authorize')
  authorizeClosing(
    @Param('businessId') businessId: string,
    @Param('closingId') closingId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.authorizeClosing(businessId, closingId, user.id);
  }

  @Post('closing/:closingId/reject')
  rejectClosing(
    @Param('businessId') businessId: string,
    @Param('closingId') closingId: string,
    @CurrentUser() user: { id: string },
    @Body('reason') reason: string,
  ) {
    return this.service.rejectClosing(businessId, closingId, user.id, reason);
  }

  // ── FID (Deviations) ──

  @Get('deviations')
  getDeviations(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Query('date') date?: string,
  ) {
    return this.service.getDeviations(businessId, user.id, date);
  }

  @Patch('deviations/:reportId/classify')
  classifyDeviations(
    @Param('businessId') businessId: string,
    @Param('reportId') reportId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: ClassifyDeviationDto,
  ) {
    return this.service.classifyDeviations(businessId, reportId, user.id, dto);
  }

  @Post('deviations/:reportId/approve')
  approveDeviations(
    @Param('businessId') businessId: string,
    @Param('reportId') reportId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.approveDeviations(businessId, reportId, user.id);
  }

  // ── Saldo inicial de caja (C2) ──

  @Get('cash-opening')
  getCashOpening(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Query('date') date?: string,
  ) {
    return this.service.getCashOpening(businessId, user.id, date);
  }

  @Post('cash-opening')
  declareCashOpening(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCashOpeningDto,
  ) {
    return this.service.declareCashOpening(businessId, user.id, dto);
  }

  // ── FAF (Reconciliation) ──

  @Get('reconciliation')
  getReconciliation(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Query('date') date?: string,
  ) {
    return this.service.getReconciliation(businessId, user.id, date);
  }

  @Post('reconciliation')
  createReconciliation(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateReconciliationDto,
  ) {
    return this.service.createReconciliation(businessId, user.id, dto);
  }

  @Post('reconciliation/:reconciliationId/approve')
  approveReconciliation(
    @Param('businessId') businessId: string,
    @Param('reconciliationId') reconciliationId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.approveReconciliation(businessId, reconciliationId, user.id);
  }

  @Post('reconciliation/:reconciliationId/reject')
  rejectReconciliation(
    @Param('businessId') businessId: string,
    @Param('reconciliationId') reconciliationId: string,
    @CurrentUser() user: { id: string },
    @Body('reason') reason: string,
  ) {
    return this.service.rejectReconciliation(businessId, reconciliationId, user.id, reason);
  }

  // ── FOP ──

  @Get('fop')
  getFOP(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Query('date') date?: string,
  ) {
    return this.service.getFOP(businessId, user.id, date);
  }

  @Post('fop/:fopId/sign')
  signFOP(
    @Param('businessId') businessId: string,
    @Param('fopId') fopId: string,
    @CurrentUser() user: { id: string },
    @Body('discrepancyJustification') discrepancyJustification?: string,
  ) {
    return this.service.signFOP(businessId, fopId, user.id, { discrepancyJustification });
  }

  // ── History ──

  @Get('history')
  getHistory(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.service.getHistory(businessId, user.id, from, to);
  }
}
