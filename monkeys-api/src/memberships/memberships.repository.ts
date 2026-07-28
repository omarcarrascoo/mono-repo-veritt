import { Injectable } from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';
import { UpdateMemberDto } from './dto/update-member.dto';

@Injectable()
export class MembershipsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findBusinessMembership(businessId: string, userId: string) {
    return this.prisma.businessMembership.findFirst({
      where: { businessId, userId, status: 'ACTIVE' },
    });
  }

  listMembers(businessId: string) {
    return this.prisma.businessMembership.findMany({
      where: { businessId },
      // No exponer el registro completo del usuario: `user: true` incluiría el
      // passwordHash. Seleccionamos sólo campos seguros para el cliente.
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  addMember(data: {
    businessId: string;
    userId: string;
    role: MembershipRole;
    invitedByUserId?: string;
  }) {
    return this.prisma.businessMembership.create({
      data: {
        businessId: data.businessId,
        userId: data.userId,
        role: data.role,
        status: 'ACTIVE',
        invitedByUserId: data.invitedByUserId,
        joinedAt: new Date(),
      },
    });
  }

  updateMember(memberId: string, dto: UpdateMemberDto) {
    return this.prisma.businessMembership.update({
      where: { id: memberId },
      data: dto,
    });
  }
}
