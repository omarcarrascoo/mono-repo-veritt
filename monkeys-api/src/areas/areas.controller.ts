import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AreasService } from './areas.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { LinkLocationDto } from './dto/link-location.dto';

@Controller('businesses/:businessId/areas')
@UseGuards(JwtAuthGuard)
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Get()
  findAll(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.areasService.findAll(businessId, user.id);
  }

  @Get(':areaId')
  findOne(
    @Param('businessId') businessId: string,
    @Param('areaId') areaId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.areasService.findOne(businessId, areaId, user.id);
  }

  @Post()
  create(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateAreaDto,
  ) {
    return this.areasService.create(businessId, user.id, dto);
  }

  @Patch(':areaId')
  update(
    @Param('businessId') businessId: string,
    @Param('areaId') areaId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateAreaDto,
  ) {
    return this.areasService.update(businessId, areaId, user.id, dto);
  }

  @Post(':areaId/link-location')
  linkLocation(
    @Param('businessId') businessId: string,
    @Param('areaId') areaId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: LinkLocationDto,
  ) {
    return this.areasService.linkLocation(businessId, areaId, dto.locationId, user.id);
  }
}
