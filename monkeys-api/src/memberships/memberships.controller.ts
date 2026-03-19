import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@Controller('businesses/:businessId/members')
@UseGuards(JwtAuthGuard)
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  list(@Param('businessId') businessId: string, @CurrentUser() user: { id: string }) {
    return this.membershipsService.listMembers(businessId, user.id);
  }

  @Post()
  add(@Param('businessId') businessId: string, @CurrentUser() user: { id: string }, @Body() dto: AddMemberDto) {
    return this.membershipsService.addMember(businessId, user.id, dto);
  }

  @Patch(':memberId')
  update(
    @Param('businessId') businessId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateMemberDto,
  ) {
    return this.membershipsService.updateMember(businessId, memberId, user.id, dto);
  }
}