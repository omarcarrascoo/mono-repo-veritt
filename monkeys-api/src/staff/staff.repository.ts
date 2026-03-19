import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMembership(businessId: string, userId: string) {
    return this.prisma.businessMembership.findFirst({
      where: { businessId, userId, status: 'ACTIVE' },
    });
  }

  create(businessId: string, dto: CreateStaffDto) {
    return this.prisma.$transaction(async (tx) => {
      const staff = await tx.staffProfile.create({
        data: {
          businessId,
          fullName: dto.fullName,
          operationalRole: dto.operationalRole,
          assignedAreasJson: dto.assignedAreasJson,
          shift: dto.shift,
          systemAccessLevel: dto.systemAccessLevel ?? 'NONE',
          username: dto.username,
          phoneNumber: dto.phoneNumber,
          email: dto.email,
        },
      });

      if (dto.compensation) {
        await tx.staffCompensation.create({
          data: {
            staffProfileId: staff.id,
            salaryAmount: dto.compensation.salaryAmount,
            salaryCurrency: dto.compensation.salaryCurrency ?? 'MXN',
            payrollFrequency: dto.compensation.payrollFrequency,
            weeklyPayDay: dto.compensation.weeklyPayDay,
            monthlyPayDay: dto.compensation.monthlyPayDay,
            semimonthlyFirstDay: dto.compensation.semimonthlyFirstDay,
            semimonthlySecondDay: dto.compensation.semimonthlySecondDay,
          },
        });
      }

      return tx.staffProfile.findUnique({
        where: { id: staff.id },
        include: { compensation: true },
      });
    });
  }

  listByBusiness(businessId: string) {
    return this.prisma.staffProfile.findMany({
      where: { businessId },
      include: {
        compensation: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  findById(businessId: string, staffId: string) {
    return this.prisma.staffProfile.findFirst({
      where: {
        id: staffId,
        businessId,
      },
      include: {
        compensation: true,
      },
    });
  }

  update(staffId: string, dto: UpdateStaffDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.staffProfile.update({
        where: { id: staffId },
        data: {
          fullName: dto.fullName,
          operationalRole: dto.operationalRole,
          assignedAreasJson: dto.assignedAreasJson,
          shift: dto.shift,
          systemAccessLevel: dto.systemAccessLevel,
          username: dto.username,
          phoneNumber: dto.phoneNumber,
          email: dto.email,
          status: dto.status,
        },
      });

      if (dto.compensation) {
        await tx.staffCompensation.upsert({
          where: { staffProfileId: staffId },
          create: {
            staffProfileId: staffId,
            salaryAmount: dto.compensation.salaryAmount,
            salaryCurrency: dto.compensation.salaryCurrency ?? 'MXN',
            payrollFrequency: dto.compensation.payrollFrequency,
            weeklyPayDay: dto.compensation.weeklyPayDay,
            monthlyPayDay: dto.compensation.monthlyPayDay,
            semimonthlyFirstDay: dto.compensation.semimonthlyFirstDay,
            semimonthlySecondDay: dto.compensation.semimonthlySecondDay,
          },
          update: {
            salaryAmount: dto.compensation.salaryAmount,
            salaryCurrency: dto.compensation.salaryCurrency ?? 'MXN',
            payrollFrequency: dto.compensation.payrollFrequency,
            weeklyPayDay: dto.compensation.weeklyPayDay,
            monthlyPayDay: dto.compensation.monthlyPayDay,
            semimonthlyFirstDay: dto.compensation.semimonthlyFirstDay,
            semimonthlySecondDay: dto.compensation.semimonthlySecondDay,
          },
        });
      }

      return tx.staffProfile.findUnique({
        where: { id: staffId },
        include: { compensation: true },
      });
    });
  }
}