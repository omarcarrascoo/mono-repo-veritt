import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Controller('businesses/:businessId/staff')
@UseGuards(JwtAuthGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  create(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateStaffDto,
  ) {
    return this.staffService.create(businessId, user.id, dto);
  }

  @Get()
  list(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.staffService.list(businessId, user.id);
  }

  @Get(':staffId')
  getById(
    @Param('businessId') businessId: string,
    @Param('staffId') staffId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.staffService.getById(businessId, staffId, user.id);
  }

  @Patch(':staffId')
  update(
    @Param('businessId') businessId: string,
    @Param('staffId') staffId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staffService.update(businessId, staffId, user.id, dto);
  }
}