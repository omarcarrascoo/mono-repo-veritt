import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AmdService } from './amd.service';

@Controller('businesses/:businessId/amd')
@UseGuards(JwtAuthGuard)
export class AmdController {
  constructor(private readonly amdService: AmdService) {}

  /** AMD del dia operativo (default = hoy). */
  @Get()
  getCurrent(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Query('date') date?: string,
  ) {
    return this.amdService.getByDate(businessId, user.id, date);
  }

  /** Lista de AMDs en un rango de fechas. */
  @Get('history')
  list(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.amdService.list(businessId, user.id, from, to);
  }

  /** AMD por id. */
  @Get(':amdId')
  getById(
    @Param('businessId') businessId: string,
    @Param('amdId') amdId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.amdService.getById(businessId, amdId, user.id);
  }

  /** Verificacion del hash contra el contentJson — candado C6. */
  @Get(':amdId/verify')
  verify(
    @Param('businessId') businessId: string,
    @Param('amdId') amdId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.amdService.verify(businessId, amdId, user.id);
  }
}
