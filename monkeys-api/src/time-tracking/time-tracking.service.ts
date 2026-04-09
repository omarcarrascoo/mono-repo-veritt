import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TimeTrackingRepository } from './time-tracking.repository';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';

@Injectable()
export class TimeTrackingService {
  constructor(private readonly timeTrackingRepository: TimeTrackingRepository) {}

  private async ensureBusinessAccess(businessId: string, userId: string) {
    const membership = await this.timeTrackingRepository.findMembership(businessId, userId);
    if (!membership) {
      throw new ForbiddenException('You do not belong to this business');
    }
    return membership;
  }

  async clockIn(businessId: string, userId: string, dto: ClockInDto) {
    await this.ensureBusinessAccess(businessId, userId);

    const staff = await this.timeTrackingRepository.findStaffProfile(dto.staffProfileId);
    if (!staff || staff.businessId !== businessId) {
      throw new NotFoundException('Staff member not found in this business');
    }

    const activeShift = await this.timeTrackingRepository.findActiveShift(businessId, dto.staffProfileId);
    if (activeShift) {
      throw new BadRequestException('This staff member already has an active shift');
    }

    return this.timeTrackingRepository.clockIn(businessId, dto);
  }

  async clockOut(businessId: string, shiftId: string, userId: string, dto: ClockOutDto) {
    await this.ensureBusinessAccess(businessId, userId);

    const shift = await this.timeTrackingRepository.findShift(shiftId);
    if (!shift || shift.businessId !== businessId) {
      throw new NotFoundException('Shift not found');
    }
    if (shift.status !== 'ACTIVE') {
      throw new BadRequestException('This shift is not active');
    }

    const openBreak = shift.breaks.find((b) => !b.endAt);
    if (openBreak) {
      throw new BadRequestException('Close the open break before clocking out');
    }

    const clockOutAt = new Date();
    const totalBreakMinutes = shift.breaks.reduce((sum, b) => sum + (b.minutes || 0), 0);
    const diffMs = clockOutAt.getTime() - shift.clockInAt.getTime();
    const totalMinutes = Math.max(0, Math.round(diffMs / 60000) - totalBreakMinutes);

    return this.timeTrackingRepository.clockOut(shiftId, {
      clockOutAt,
      clockOutLatitude: dto.latitude,
      clockOutLongitude: dto.longitude,
      totalMinutes,
      note: dto.note,
    });
  }

  async startBreak(businessId: string, shiftId: string, userId: string, type: string = 'REST') {
    await this.ensureBusinessAccess(businessId, userId);

    const shift = await this.timeTrackingRepository.findShift(shiftId);
    if (!shift || shift.businessId !== businessId) {
      throw new NotFoundException('Shift not found');
    }
    if (shift.status !== 'ACTIVE') {
      throw new BadRequestException('This shift is not active');
    }

    const openBreak = shift.breaks.find((b) => !b.endAt);
    if (openBreak) {
      throw new BadRequestException('There is already an open break on this shift');
    }

    return this.timeTrackingRepository.startBreak(shiftId, type);
  }

  async endBreak(businessId: string, shiftId: string, breakId: string, userId: string) {
    await this.ensureBusinessAccess(businessId, userId);

    const shift = await this.timeTrackingRepository.findShift(shiftId);
    if (!shift || shift.businessId !== businessId) {
      throw new NotFoundException('Shift not found');
    }

    const shiftBreak = await this.timeTrackingRepository.findBreak(breakId);
    if (!shiftBreak || shiftBreak.shiftLogId !== shiftId) {
      throw new NotFoundException('Break not found on this shift');
    }
    if (shiftBreak.endAt) {
      throw new BadRequestException('This break is already ended');
    }

    const diffMs = new Date().getTime() - shiftBreak.startAt.getTime();
    const minutes = Math.round(diffMs / 60000);

    return this.timeTrackingRepository.endBreak(breakId, minutes);
  }

  async findAll(businessId: string, userId: string, filters: { staffProfileId?: string; status?: string; from?: string; to?: string }) {
    await this.ensureBusinessAccess(businessId, userId);
    return this.timeTrackingRepository.findAll(businessId, {
      staffProfileId: filters.staffProfileId,
      status: filters.status,
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
    });
  }

  async findActive(businessId: string, userId: string) {
    await this.ensureBusinessAccess(businessId, userId);
    return this.timeTrackingRepository.findActiveShifts(businessId);
  }

  async findOne(businessId: string, shiftId: string, userId: string) {
    await this.ensureBusinessAccess(businessId, userId);
    const shift = await this.timeTrackingRepository.findShift(shiftId);
    if (!shift || shift.businessId !== businessId) {
      throw new NotFoundException('Shift not found');
    }
    return shift;
  }

  async getSummary(businessId: string, userId: string, from: string, to: string) {
    await this.ensureBusinessAccess(businessId, userId);
    return this.timeTrackingRepository.getShiftSummary(
      businessId,
      new Date(from),
      new Date(to),
    );
  }
}
