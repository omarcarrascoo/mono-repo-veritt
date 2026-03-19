import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipsRepository } from './memberships.repository';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@Injectable()
export class MembershipsService {
  constructor(private readonly membershipsRepository: MembershipsRepository) {}

  async listMembers(businessId: string, userId: string) {
    const membership = await this.membershipsRepository.findBusinessMembership(businessId, userId);
    if (!membership) throw new ForbiddenException('You do not belong to this business');
    return this.membershipsRepository.listMembers(businessId);
  }

  async addMember(businessId: string, actorUserId: string, dto: AddMemberDto) {
    const actorMembership = await this.membershipsRepository.findBusinessMembership(businessId, actorUserId);
    if (!actorMembership || !['OWNER', 'ADMIN'].includes(actorMembership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const user = await this.membershipsRepository.findUserByEmail(dto.email);
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.membershipsRepository.findBusinessMembership(businessId, user.id);
    if (existing) throw new ConflictException('User already belongs to this business');

    return this.membershipsRepository.addMember({
      businessId,
      userId: user.id,
      role: dto.role,
      invitedByUserId: actorUserId,
    });
  }

  async updateMember(businessId: string, memberId: string, actorUserId: string, dto: UpdateMemberDto) {
    const actorMembership = await this.membershipsRepository.findBusinessMembership(businessId, actorUserId);
    if (!actorMembership || !['OWNER', 'ADMIN'].includes(actorMembership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return this.membershipsRepository.updateMember(memberId, dto);
  }
}