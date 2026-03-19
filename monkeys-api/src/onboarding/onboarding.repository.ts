import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';

@Injectable()
export class OnboardingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMembership(businessId: string, userId: string) {
    return this.prisma.businessMembership.findFirst({
      where: { businessId, userId, status: 'ACTIVE' },
    });
  }

  findByBusinessId(businessId: string) {
    return this.prisma.businessOnboarding.findUnique({ where: { businessId } });
  }

  update(businessId: string, dto: UpdateOnboardingDto) {
    return this.prisma.businessOnboarding.update({
      where: { businessId },
      data: dto,
    });
  }
}