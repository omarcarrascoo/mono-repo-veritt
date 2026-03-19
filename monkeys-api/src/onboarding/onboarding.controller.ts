import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';

@Controller('businesses/:businessId/onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get()
  get(@Param('businessId') businessId: string, @CurrentUser() user: { id: string }) {
    return this.onboardingService.getByBusinessId(businessId, user.id);
  }

  @Patch()
  update(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateOnboardingDto,
  ) {
    return this.onboardingService.update(businessId, user.id, dto);
  }
}