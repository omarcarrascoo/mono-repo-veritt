import { Injectable } from '@nestjs/common';
import { PayrollFrequency, PayrollPaymentStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';

type UpsertScheduledPaymentInput = {
  businessId: string;
  staffProfileId: string;
  amount: number | string;
  currency: string;
  payrollFrequency: PayrollFrequency;
  dueDate: Date;
};

@Injectable()
export class PayrollRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMembership(businessId: string, userId: string) {
    return this.prisma.businessMembership.findFirst({
      where: { businessId, userId, status: 'ACTIVE' },
    });
  }

  findBusinessForSync(businessId: string) {
    return this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        timezone: true,
        staffProfiles: {
          where: {
            compensation: {
              isNot: null,
            },
          },
          include: {
            compensation: true,
          },
        },
      },
    });
  }

  findStaffForSync(businessId: string, staffId: string) {
    return this.prisma.staffProfile.findFirst({
      where: {
        id: staffId,
        businessId,
      },
      include: {
        compensation: true,
        business: {
          select: {
            id: true,
            timezone: true,
          },
        },
      },
    });
  }

  async normalizeOpenPaymentStatuses(businessId: string, todayDate: Date) {
    await this.prisma.payrollPayment.updateMany({
      where: {
        businessId,
        status: 'PENDING',
        dueDate: {
          lt: todayDate,
        },
      },
      data: {
        status: 'OVERDUE',
      },
    });

    await this.prisma.payrollPayment.updateMany({
      where: {
        businessId,
        status: 'OVERDUE',
        dueDate: {
          gte: todayDate,
        },
      },
      data: {
        status: 'PENDING',
      },
    });
  }

  listOpenFuturePaymentsByStaff(staffProfileId: string, fromDate: Date) {
    return this.prisma.payrollPayment.findMany({
      where: {
        staffProfileId,
        status: 'PENDING',
        dueDate: {
          gte: fromDate,
        },
      },
      select: {
        id: true,
      },
    });
  }

  cancelFuturePendingPayments(staffProfileId: string, fromDate: Date, reason?: string) {
    return this.prisma.payrollPayment.updateMany({
      where: {
        staffProfileId,
        status: 'PENDING',
        dueDate: {
          gte: fromDate,
        },
      },
      data: {
        status: 'CANCELED',
        paidAt: null,
        paidByUserId: null,
        notes: reason ?? null,
      },
    });
  }

  upsertScheduledPayment(input: UpsertScheduledPaymentInput) {
    return this.prisma.payrollPayment.upsert({
      where: {
        staffProfileId_dueDate: {
          staffProfileId: input.staffProfileId,
          dueDate: input.dueDate,
        },
      },
      create: {
        businessId: input.businessId,
        staffProfileId: input.staffProfileId,
        amount: input.amount,
        currency: input.currency,
        payrollFrequency: input.payrollFrequency,
        dueDate: input.dueDate,
      },
      update: {
        businessId: input.businessId,
        amount: input.amount,
        currency: input.currency,
        payrollFrequency: input.payrollFrequency,
        status: PayrollPaymentStatus.PENDING,
        paidAt: null,
        paidByUserId: null,
        notes: null,
      },
    });
  }

  async upsertScheduledPaymentsBatch(inputs: UpsertScheduledPaymentInput[]) {
    if (inputs.length === 0) return;

    const staffId = inputs[0].staffProfileId;
    const dates = inputs.map((i) => i.dueDate);
    const minDate = dates.reduce((min, d) => (d < min ? d : min), dates[0]);
    const maxDate = dates.reduce((max, d) => (d > max ? d : max), dates[0]);

    await this.prisma.$transaction(async (tx) => {
      await tx.payrollPayment.deleteMany({
        where: {
          staffProfileId: staffId,
          status: 'PENDING',
          dueDate: { gte: minDate, lte: maxDate },
        },
      });

      await tx.payrollPayment.createMany({
        data: inputs.map((i) => ({
          businessId: i.businessId,
          staffProfileId: i.staffProfileId,
          amount: i.amount,
          currency: i.currency,
          payrollFrequency: i.payrollFrequency,
          dueDate: i.dueDate,
          status: PayrollPaymentStatus.PENDING,
        })),
        skipDuplicates: true,
      });
    });
  }

  listUpcomingOpenPayments(businessId: string, endDate: Date) {
    return this.prisma.payrollPayment.findMany({
      where: {
        businessId,
        status: {
          in: ['PENDING', 'OVERDUE'],
        },
        dueDate: {
          lte: endDate,
        },
      },
      include: {
        staffProfile: {
          select: {
            id: true,
            fullName: true,
            operationalRole: true,
            status: true,
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  listPaymentsNeedingAttention(businessId: string, todayDate: Date) {
    return this.prisma.payrollPayment.findMany({
      where: {
        businessId,
        status: {
          in: ['PENDING', 'OVERDUE'],
        },
        dueDate: {
          lte: todayDate,
        },
      },
      include: {
        staffProfile: {
          select: {
            id: true,
            fullName: true,
            operationalRole: true,
          },
        },
      },
    });
  }

  listPaymentHistory(businessId: string, limit = 50) {
    return this.prisma.payrollPayment.findMany({
      where: {
        businessId,
        status: {
          in: ['PAID', 'SKIPPED', 'CANCELED'],
        },
      },
      include: {
        staffProfile: {
          select: {
            id: true,
            fullName: true,
            operationalRole: true,
            status: true,
          },
        },
      },
      orderBy: [{ dueDate: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
    });
  }

  findPaymentById(businessId: string, paymentId: string) {
    return this.prisma.payrollPayment.findFirst({
      where: {
        id: paymentId,
        businessId,
      },
      include: {
        staffProfile: {
          select: {
            id: true,
            fullName: true,
            operationalRole: true,
            status: true,
          },
        },
      },
    });
  }

  updatePayment(
    paymentId: string,
    data: {
      status: PayrollPaymentStatus;
      paidAt?: Date | null;
      paidByUserId?: string | null;
      notes?: string | null;
    },
  ) {
    return this.prisma.payrollPayment.update({
      where: { id: paymentId },
      data,
      include: {
        staffProfile: {
          select: {
            id: true,
            fullName: true,
            operationalRole: true,
            status: true,
          },
        },
      },
    });
  }

  findLatestCompensationHistory(staffProfileId: string) {
    return this.prisma.staffCompensationHistory.findFirst({
      where: { staffProfileId },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    });
  }

  createCompensationHistory(input: {
    staffProfileId: string;
    salaryAmount: number | string;
    salaryCurrency: string;
    payrollFrequency: PayrollFrequency;
    firstPaymentDate: Date;
    weeklyPayDay?: number | null;
    monthlyPayDay?: number | null;
    semimonthlyFirstDay?: number | null;
    semimonthlySecondDay?: number | null;
    createdByUserId?: string | null;
    changeReason?: string | null;
  }) {
    return this.prisma.staffCompensationHistory.create({
      data: input,
    });
  }
}
