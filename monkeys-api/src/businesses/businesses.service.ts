import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BusinessesRepository } from './businesses.repository';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessesService {
  constructor(private readonly businessesRepository: BusinessesRepository) {}

  create(userId: string, dto: CreateBusinessDto) {
    return this.businessesRepository.createWithOwner(userId, dto);
  }

  findMine(userId: string) {
    return this.businessesRepository.findByUser(userId);
  }

  async findOne(businessId: string, userId: string) {
    const membership = await this.businessesRepository.findMembership(businessId, userId);
    if (!membership) throw new ForbiddenException('You do not belong to this business');

    const business = await this.businessesRepository.findOne(businessId);
    if (!business) throw new NotFoundException('Business not found');

    return business;
  }

  async update(businessId: string, userId: string, dto: UpdateBusinessDto) {
    const membership = await this.businessesRepository.findMembership(businessId, userId);
    if (!membership) throw new ForbiddenException('You do not belong to this business');
    if (!['OWNER', 'ADMIN'].includes(membership.role)) throw new ForbiddenException('Insufficient permissions');

    return this.businessesRepository.update(businessId, dto);
  }
}