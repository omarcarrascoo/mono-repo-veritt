import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessesRepository {
  constructor(private readonly prisma: PrismaService) {}

  createWithOwner(userId: string, dto: CreateBusinessDto) {
    return this.prisma.business.create({
      data: {
        ...dto,
        createdByUserId: userId,
        memberships: {
          create: { userId, role: 'OWNER', status: 'ACTIVE', joinedAt: new Date() },
        },
        onboarding: { create: {} },
      },
      include: { memberships: true, onboarding: true },
    });
  }

  findByUser(userId: string) {
    return this.prisma.business.findMany({
      where: { memberships: { some: { userId, status: 'ACTIVE' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findMembership(businessId: string, userId: string) {
    return this.prisma.businessMembership.findFirst({
      where: { businessId, userId, status: 'ACTIVE' },
    });
  }

  findOne(id: string) {
    return this.prisma.business.findUnique({
      where: { id },
      include: { onboarding: true },
    });
  }

  update(businessId: string, dto: UpdateBusinessDto) {
    return this.prisma.business.update({
      where: { id: businessId },
      data: dto,
    });
  }
}