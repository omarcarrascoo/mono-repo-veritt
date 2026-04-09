import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TimeTrackingService } from './time-tracking.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import { StartBreakDto } from './dto/start-break.dto';

@Controller('businesses/:businessId/shifts')
@UseGuards(JwtAuthGuard)
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Post('clock-in')
  clockIn(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: ClockInDto,
  ) {
    return this.timeTrackingService.clockIn(businessId, user.id, dto);
  }

  @Post(':shiftId/clock-out')
  clockOut(
    @Param('businessId') businessId: string,
    @Param('shiftId') shiftId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: ClockOutDto,
  ) {
    return this.timeTrackingService.clockOut(businessId, shiftId, user.id, dto);
  }

  @Post(':shiftId/breaks/start')
  startBreak(
    @Param('businessId') businessId: string,
    @Param('shiftId') shiftId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: StartBreakDto,
  ) {
    return this.timeTrackingService.startBreak(businessId, shiftId, user.id, dto.type);
  }

  @Post(':shiftId/breaks/:breakId/end')
  endBreak(
    @Param('businessId') businessId: string,
    @Param('shiftId') shiftId: string,
    @Param('breakId') breakId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.timeTrackingService.endBreak(businessId, shiftId, breakId, user.id);
  }

  @Get()
  findAll(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Query('staffProfileId') staffProfileId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.timeTrackingService.findAll(businessId, user.id, { staffProfileId, status, from, to });
  }

  @Get('active')
  findActive(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.timeTrackingService.findActive(businessId, user.id);
  }

  @Get('summary')
  getSummary(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.timeTrackingService.getSummary(businessId, user.id, from, to);
  }

  @Get(':shiftId')
  findOne(
    @Param('businessId') businessId: string,
    @Param('shiftId') shiftId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.timeTrackingService.findOne(businessId, shiftId, user.id);
  }
}
