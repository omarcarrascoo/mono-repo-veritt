import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { BusinessesService } from './businesses.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Controller('businesses')
@UseGuards(JwtAuthGuard)
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateBusinessDto) {
    return this.businessesService.create(user.id, dto);
  }

  @Get()
  findMine(@CurrentUser() user: { id: string }) {
    return this.businessesService.findMine(user.id);
  }

  @Get(':businessId')
  findOne(@Param('businessId') businessId: string, @CurrentUser() user: { id: string }) {
    return this.businessesService.findOne(businessId, user.id);
  }

  @Patch(':businessId')
  update(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateBusinessDto,
  ) {
    return this.businessesService.update(businessId, user.id, dto);
  }
}