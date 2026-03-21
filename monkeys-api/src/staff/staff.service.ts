import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StaffRepository } from './staff.repository';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { PayrollService } from '../payroll/payroll.service';
import { assertValidFirstPaymentDate, parseDateKey } from '../payroll/utils/payroll-schedule.utils';

@Injectable()
export class StaffService {
  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly payrollService: PayrollService,
  ) {}

  private validateCompensation(compensation?: CreateStaffDto['compensation']) {
    if (!compensation) {
      return;
    }

    if (!compensation.firstPaymentDate) {
      throw new BadRequestException('firstPaymentDate is required when compensation is provided');
    }

    const firstPaymentDate = parseDateKey(compensation.firstPaymentDate);
    assertValidFirstPaymentDate(compensation.payrollFrequency, firstPaymentDate);
  }

  async create(businessId: string, userId: string, dto: CreateStaffDto) {
    const membership = await this.staffRepository.findMembership(businessId, userId);

    if (!membership || !['OWNER', 'ADMIN', 'VERITT_STAFF'].includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    this.validateCompensation(dto.compensation);

    const staff = await this.staffRepository.create(businessId, dto);

    if (!staff) {
      throw new NotFoundException('Staff member not found after creation');
    }

    if (dto.compensation) {
      await this.payrollService.syncStaffSchedule(businessId, staff.id, userId, 'Staff compensation created');
    }

    return staff;
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

    this.validateCompensation(dto.compensation);

    const updatedStaff = await this.staffRepository.update(staffId, dto);

    if (dto.compensation || dto.status !== undefined) {
      await this.payrollService.syncStaffSchedule(businessId, staffId, userId, 'Staff compensation updated');
    }

    return updatedStaff;
  }

  async listCompensationHistory(businessId: string, staffId: string, userId: string) {
    const membership = await this.staffRepository.findMembership(businessId, userId);

    if (!membership) {
      throw new ForbiddenException('You do not belong to this business');
    }

    const staff = await this.staffRepository.findById(businessId, staffId);

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    return this.staffRepository.listCompensationHistory(businessId, staffId);
  }
}
