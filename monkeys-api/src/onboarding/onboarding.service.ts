import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OnboardingRepository } from './onboarding.repository';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(private readonly onboardingRepository: OnboardingRepository) {}

  async getByBusinessId(businessId: string, userId: string) {
    const membership = await this.onboardingRepository.findMembership(businessId, userId);
    if (!membership) throw new ForbiddenException('You do not belong to this business');

    const onboarding = await this.onboardingRepository.findByBusinessId(businessId);
    if (!onboarding) throw new NotFoundException('Onboarding not found');

    return onboarding;
  }

  async update(businessId: string, userId: string, dto: UpdateOnboardingDto) {
    const membership = await this.onboardingRepository.findMembership(businessId, userId);
    if (!membership || !['OWNER', 'ADMIN', 'VERITT_STAFF'].includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return this.onboardingRepository.update(businessId, dto);
  }
}