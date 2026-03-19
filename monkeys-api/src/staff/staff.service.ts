import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { StaffRepository } from './staff.repository';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
  constructor(private readonly staffRepository: StaffRepository) {}

  async create(businessId: string, userId: string, dto: CreateStaffDto) {
    const membership = await this.staffRepository.findMembership(businessId, userId);

    if (!membership || !['OWNER', 'ADMIN', 'VERITT_STAFF'].includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.staffRepository.create(businessId, dto);
  }

  async list(businessId: string, userId: string) {
    const membership = await this.staffRepository.findMembership(businessId, userId);

    if (!membership) {
      throw new ForbiddenException('You do not belong to this business');
    }

    return this.staffRepository.listByBusiness(businessId);
  }

  async getById(businessId: string, staffId: string, userId: string) {
    const membership = await this.staffRepository.findMembership(businessId, userId);

    if (!membership) {
      throw new ForbiddenException('You do not belong to this business');
    }

    const staff = await this.staffRepository.findById(businessId, staffId);

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    return staff;
  }

  async update(businessId: string, staffId: string, userId: string, dto: UpdateStaffDto) {
    const membership = await this.staffRepository.findMembership(businessId, userId);

    if (!membership || !['OWNER', 'ADMIN', 'VERITT_STAFF'].includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const staff = await this.staffRepository.findById(businessId, staffId);

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    return this.staffRepository.update(staffId, dto);
  }
}