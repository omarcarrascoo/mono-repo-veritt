import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { ClockInDto } from './dto/clock-in.dto';

@Injectable()
export class TimeTrackingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMembership(businessId: string, userId: string) {
    return this.prisma.businessMembership.findFirst({
      where: { businessId, userId, status: 'ACTIVE' },
    });
  }

  findStaffProfile(staffProfileId: string) {
    return this.prisma.staffProfile.findUnique({
      where: { id: staffProfileId },
    });
  }

  findStaffProfileByUser(businessId: string, userId: string) {
    return this.prisma.staffProfile.findFirst({
      where: { businessId, userId, status: 'ACTIVE' },
    });
  }

  findActiveShift(businessId: string, staffProfileId: string) {
    return this.prisma.shiftLog.findFirst({
      where: { businessId, staffProfileId, status: 'ACTIVE' },
      include: { breaks: true },
    });
  }

  findShift(shiftId: string) {
    return this.prisma.shiftLog.findUnique({
      where: { id: shiftId },
      include: { breaks: true, staffProfile: true },
    });
  }

  findAll(businessId: string, filters: { staffProfileId?: string; status?: string; from?: Date; to?: Date }) {
    return this.prisma.shiftLog.findMany({
      where: {
        businessId,
        ...(filters.staffProfileId && { staffProfileId: filters.staffProfileId }),
        ...(filters.status && { status: filters.status as any }),
        ...(filters.from && { clockInAt: { gte: filters.from } }),
        ...(filters.to && { clockInAt: { lte: filters.to } }),
      },
      include: { breaks: true, staffProfile: true, area: true },
      orderBy: { clockInAt: 'desc' },
    });
  }

  findActiveShifts(businessId: string) {
    return this.prisma.shiftLog.findMany({
      where: { businessId, status: 'ACTIVE' },
      include: { breaks: true, staffProfile: true, area: true },
      orderBy: { clockInAt: 'desc' },
    });
  }

  clockIn(businessId: string, dto: ClockInDto) {
    return this.prisma.shiftLog.create({
      data: {
        businessId,
        staffProfileId: dto.staffProfileId,
        areaId: dto.areaId,
        clockInLatitude: dto.latitude,
        clockInLongitude: dto.longitude,
      },
      include: { breaks: true, staffProfile: true, area: true },
    });
  }

  clockOut(shiftId: string, data: { clockOutAt: Date; clockOutLatitude?: number; clockOutLongitude?: number; totalMinutes: number; note?: string }) {
    return this.prisma.shiftLog.update({
      where: { id: shiftId },
      data: {
        clockOutAt: data.clockOutAt,
        clockOutLatitude: data.clockOutLatitude,
        clockOutLongitude: data.clockOutLongitude,
        totalMinutes: data.totalMinutes,
        status: 'COMPLETED',
        note: data.note,
      },
      include: { breaks: true, staffProfile: true, area: true },
    });
  }

  startBreak(shiftLogId: string, type: string) {
    return this.prisma.shiftBreak.create({
      data: {
        shiftLogId,
        type: type as any,
      },
    });
  }

  endBreak(breakId: string, minutes: number) {
    return this.prisma.shiftBreak.update({
      where: { id: breakId },
      data: {
        endAt: new Date(),
        minutes,
      },
    });
  }

  findBreak(breakId: string) {
    return this.prisma.shiftBreak.findUnique({
      where: { id: breakId },
    });
  }

  getShiftSummary(businessId: string, from: Date, to: Date) {
    return this.prisma.shiftLog.groupBy({
      by: ['staffProfileId'],
      where: {
        businessId,
        status: 'COMPLETED',
        clockInAt: { gte: from, lte: to },
      },
      _sum: { totalMinutes: true },
      _count: { id: true },
    });
  }
}
