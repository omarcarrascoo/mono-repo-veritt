import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { deriveScheduleFields } from '../payroll/utils/payroll-schedule.utils';

function mapCompensationData(dto: NonNullable<CreateStaffDto['compensation']>) {
  const derivedSchedule = deriveScheduleFields({
    payrollFrequency: dto.payrollFrequency,
    firstPaymentDate: dto.firstPaymentDate!,
    weeklyPayDay: dto.weeklyPayDay,
    monthlyPayDay: dto.monthlyPayDay,
    semimonthlyFirstDay: dto.semimonthlyFirstDay,
    semimonthlySecondDay: dto.semimonthlySecondDay,
  });

  return {
    salaryAmount: dto.salaryAmount,
    salaryCurrency: dto.salaryCurrency ?? 'MXN',
    payrollFrequency: dto.payrollFrequency,
    firstPaymentDate: new Date(`${derivedSchedule.firstPaymentDate}T00:00:00.000Z`),
    weeklyPayDay: derivedSchedule.weeklyPayDay,
    monthlyPayDay: derivedSchedule.monthlyPayDay,
    semimonthlyFirstDay: derivedSchedule.semimonthlyFirstDay,
    semimonthlySecondDay: derivedSchedule.semimonthlySecondDay,
  };
}

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
            ...mapCompensationData(dto.compensation),
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
        const compensationData = mapCompensationData(dto.compensation);

        await tx.staffCompensation.upsert({
          where: { staffProfileId: staffId },
          create: {
            staffProfileId: staffId,
            ...compensationData,
          },
          update: compensationData,
        });
      }

      return tx.staffProfile.findUnique({
        where: { id: staffId },
        include: { compensation: true },
      });
    });
  }

  listCompensationHistory(businessId: string, staffId: string) {
    return this.prisma.staffCompensationHistory.findMany({
      where: {
        staffProfileId: staffId,
        staffProfile: {
          businessId,
        },
      },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    });
  }
}
