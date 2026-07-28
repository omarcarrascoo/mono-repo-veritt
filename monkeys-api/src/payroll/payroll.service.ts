import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PayrollFrequency, PayrollPaymentStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import {
  addDays,
  compareDateKeys,
  dateKeyToDate,
  generateDueDateKeys,
  getTodayDateKey,
  maxDateKey,
  parseDateKey,
} from './utils/payroll-schedule.utils';
import { UpdatePayrollPaymentDto } from './dto/update-payroll-payment.dto';
import { PayrollRepository } from './payroll.repository';
import { PermissionService } from '../common/services/permission.service';

const UPCOMING_WINDOW_DAYS = 45;
const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

function getSyncWindowDays(frequency: PayrollFrequency): number {
  switch (frequency) {
    case 'DAILY':
      return 30;
    case 'WEEKLY':
      return 60;
    case 'BIWEEKLY':
      return 90;
    default:
      return 120;
  }
}

type StaffWithCompensationSnapshot = {
  id: string;
  businessId: string;
  status: string;
  compensation: {
    salaryAmount: unknown;
    salaryCurrency: string;
    payrollFrequency: PayrollFrequency;
    firstPaymentDate: Date;
    weeklyPayDay: number | null;
    monthlyPayDay: number | null;
    semimonthlyFirstDay: number | null;
    semimonthlySecondDay: number | null;
  } | null;
};

@Injectable()
export class PayrollService {
  private lastSyncMap = new Map<string, number>();

  constructor(
    private readonly payrollRepository: PayrollRepository,
    private readonly notificationsService: NotificationsService,
    private readonly permissions: PermissionService,
  ) {}

  private async maybeSyncBusinessSchedule(businessId: string) {
    const lastSync = this.lastSyncMap.get(businessId) ?? 0;
    if (Date.now() - lastSync < SYNC_COOLDOWN_MS) return;

    await this.syncBusinessSchedule(businessId);
    this.lastSyncMap.set(businessId, Date.now());
  }

  private async ensureBusinessAccess(businessId: string, userId: string) {
    const membership = await this.payrollRepository.findMembership(businessId, userId);

    if (!membership) {
      throw new ForbiddenException('You do not belong to this business');
    }

    return membership;
  }

  private async ensurePayrollManagementAccess(businessId: string, userId: string) {
    const membership = await this.ensureBusinessAccess(businessId, userId);

    if (!(await this.permissions.can(businessId, membership.role, 'STAFF_MANAGE'))) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return membership;
  }

  private async ensureCompensationHistorySnapshot(
    staff: StaffWithCompensationSnapshot,
    actorUserId?: string,
    changeReason?: string,
  ) {
    if (!staff.compensation) {
      return;
    }

    const latestHistory = await this.payrollRepository.findLatestCompensationHistory(staff.id);
    const currentSnapshot = {
      salaryAmount: String(staff.compensation.salaryAmount),
      salaryCurrency: staff.compensation.salaryCurrency,
      payrollFrequency: staff.compensation.payrollFrequency,
      firstPaymentDate: parseDateKey(staff.compensation.firstPaymentDate),
      weeklyPayDay: staff.compensation.weeklyPayDay ?? null,
      monthlyPayDay: staff.compensation.monthlyPayDay ?? null,
      semimonthlyFirstDay: staff.compensation.semimonthlyFirstDay ?? null,
      semimonthlySecondDay: staff.compensation.semimonthlySecondDay ?? null,
    };

    const latestSnapshot = latestHistory
      ? {
          salaryAmount: String(latestHistory.salaryAmount),
          salaryCurrency: latestHistory.salaryCurrency,
          payrollFrequency: latestHistory.payrollFrequency,
          firstPaymentDate: parseDateKey(latestHistory.firstPaymentDate),
          weeklyPayDay: latestHistory.weeklyPayDay ?? null,
          monthlyPayDay: latestHistory.monthlyPayDay ?? null,
          semimonthlyFirstDay: latestHistory.semimonthlyFirstDay ?? null,
          semimonthlySecondDay: latestHistory.semimonthlySecondDay ?? null,
        }
      : null;

    if (
      latestSnapshot &&
      latestSnapshot.salaryAmount === currentSnapshot.salaryAmount &&
      latestSnapshot.salaryCurrency === currentSnapshot.salaryCurrency &&
      latestSnapshot.payrollFrequency === currentSnapshot.payrollFrequency &&
      latestSnapshot.firstPaymentDate === currentSnapshot.firstPaymentDate &&
      latestSnapshot.weeklyPayDay === currentSnapshot.weeklyPayDay &&
      latestSnapshot.monthlyPayDay === currentSnapshot.monthlyPayDay &&
      latestSnapshot.semimonthlyFirstDay === currentSnapshot.semimonthlyFirstDay &&
      latestSnapshot.semimonthlySecondDay === currentSnapshot.semimonthlySecondDay
    ) {
      return;
    }

    await this.payrollRepository.createCompensationHistory({
      staffProfileId: staff.id,
      salaryAmount: String(staff.compensation.salaryAmount),
      salaryCurrency: staff.compensation.salaryCurrency,
      payrollFrequency: staff.compensation.payrollFrequency,
      firstPaymentDate: dateKeyToDate(currentSnapshot.firstPaymentDate),
      weeklyPayDay: staff.compensation.weeklyPayDay,
      monthlyPayDay: staff.compensation.monthlyPayDay,
      semimonthlyFirstDay: staff.compensation.semimonthlyFirstDay,
      semimonthlySecondDay: staff.compensation.semimonthlySecondDay,
      createdByUserId: actorUserId ?? null,
      changeReason: changeReason ?? null,
    });
  }

  private async upsertFuturePaymentsForStaff(
    staff: StaffWithCompensationSnapshot,
    todayDateKey: string,
  ) {
    if (!staff.compensation) {
      return;
    }

    const windowDays = getSyncWindowDays(staff.compensation.payrollFrequency);
    const firstPaymentDate = parseDateKey(staff.compensation.firstPaymentDate);
    const rangeStart = maxDateKey(todayDateKey, firstPaymentDate);
    const rangeEnd = addDays(todayDateKey, windowDays);
    const dueDateKeys = generateDueDateKeys(
      {
        payrollFrequency: staff.compensation.payrollFrequency,
        firstPaymentDate: staff.compensation.firstPaymentDate,
        weeklyPayDay: staff.compensation.weeklyPayDay,
        monthlyPayDay: staff.compensation.monthlyPayDay,
        semimonthlyFirstDay: staff.compensation.semimonthlyFirstDay,
        semimonthlySecondDay: staff.compensation.semimonthlySecondDay,
      },
      rangeStart,
      rangeEnd,
    );

    const inputs = dueDateKeys.map((dueDateKey) => ({
      businessId: staff.businessId,
      staffProfileId: staff.id,
      amount: String(staff.compensation!.salaryAmount),
      currency: staff.compensation!.salaryCurrency,
      payrollFrequency: staff.compensation!.payrollFrequency,
      dueDate: dateKeyToDate(dueDateKey),
    }));

    await this.payrollRepository.upsertScheduledPaymentsBatch(inputs);
  }

  private async syncNotificationsForPayment(
    payment: {
      id: string;
      businessId: string;
      status: PayrollPaymentStatus;
      dueDate: Date;
      amount: unknown;
      currency: string;
      staffProfile: { fullName: string };
    },
    todayDateKey: string,
    actorUserId?: string,
  ) {
    const paymentResourceType = 'payroll_payment';
    const paymentResourceId = payment.id;
    const dueDateKey = parseDateKey(payment.dueDate);
    const dueNotificationKey = `payroll:${payment.id}:due`;
    const overdueNotificationKey = `payroll:${payment.id}:overdue`;
    const amountLabel = `${String(payment.amount)} ${payment.currency}`;

    if (payment.status === 'PAID' || payment.status === 'SKIPPED' || payment.status === 'CANCELED') {
      await this.notificationsService.resolveNotifications(paymentResourceType, paymentResourceId, actorUserId);
      return;
    }

    if (payment.status === 'OVERDUE' || compareDateKeys(dueDateKey, todayDateKey) < 0) {
      await this.notificationsService.resolveNotifications(paymentResourceType, paymentResourceId, actorUserId);
      await this.notificationsService.upsertNotification({
        businessId: payment.businessId,
        type: 'PAYROLL_OVERDUE',
        dedupeKey: overdueNotificationKey,
        title: `Pago vencido de ${payment.staffProfile.fullName}`,
        body: `Tienes pendiente el pago de ${amountLabel} programado para ${dueDateKey}.`,
        resourceType: paymentResourceType,
        resourceId: paymentResourceId,
        scheduledFor: dueDateKey,
        metadataJson: {
          paymentId: payment.id,
          dueDate: dueDateKey,
          category: 'payroll',
        },
      });
      return;
    }

    if (payment.status === 'PENDING' && dueDateKey === todayDateKey) {
      await this.notificationsService.resolveNotifications(paymentResourceType, paymentResourceId, actorUserId);
      await this.notificationsService.upsertNotification({
        businessId: payment.businessId,
        type: 'PAYROLL_DUE',
        dedupeKey: dueNotificationKey,
        title: `Pago programado hoy para ${payment.staffProfile.fullName}`,
        body: `Hoy toca pagar ${amountLabel} a ${payment.staffProfile.fullName}.`,
        resourceType: paymentResourceType,
        resourceId: paymentResourceId,
        scheduledFor: dueDateKey,
        metadataJson: {
          paymentId: payment.id,
          dueDate: dueDateKey,
          category: 'payroll',
        },
      });
      return;
    }

    await this.notificationsService.resolveNotifications(paymentResourceType, paymentResourceId, actorUserId);
  }

  private async syncBusinessNotifications(businessId: string, todayDateKey: string) {
    const payments = await this.payrollRepository.listPaymentsNeedingAttention(
      businessId,
      dateKeyToDate(todayDateKey),
    );

    await Promise.all(
      payments.map((payment) => this.syncNotificationsForPayment(payment, todayDateKey)),
    );
  }

  async syncBusinessSchedule(businessId: string) {
    const business = await this.payrollRepository.findBusinessForSync(businessId);

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const todayDateKey = getTodayDateKey(business.timezone);
    const todayDate = dateKeyToDate(todayDateKey);

    await this.payrollRepository.normalizeOpenPaymentStatuses(businessId, todayDate);

    for (const staff of business.staffProfiles) {
      await this.ensureCompensationHistorySnapshot(staff);

      if (staff.status !== 'ACTIVE') {
        const paymentsToResolve = await this.payrollRepository.listOpenFuturePaymentsByStaff(
          staff.id,
          todayDate,
        );

        await this.payrollRepository.cancelFuturePendingPayments(
          staff.id,
          todayDate,
          'Staff marked inactive',
        );

        for (const payment of paymentsToResolve) {
          await this.notificationsService.resolveNotifications('payroll_payment', payment.id);
        }

        continue;
      }

      await this.upsertFuturePaymentsForStaff(staff, todayDateKey);
    }

    await this.syncBusinessNotifications(businessId, todayDateKey);
  }

  async syncStaffSchedule(businessId: string, staffId: string, actorUserId: string, changeReason?: string) {
    this.lastSyncMap.delete(businessId);
    const staff = await this.payrollRepository.findStaffForSync(businessId, staffId);

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    const todayDateKey = getTodayDateKey(staff.business.timezone);
    const todayDate = dateKeyToDate(todayDateKey);

    await this.payrollRepository.normalizeOpenPaymentStatuses(businessId, todayDate);

    if (!staff.compensation || staff.status !== 'ACTIVE') {
      const paymentsToResolve = await this.payrollRepository.listOpenFuturePaymentsByStaff(staff.id, todayDate);

      await this.payrollRepository.cancelFuturePendingPayments(
        staff.id,
        todayDate,
        staff.status === 'ACTIVE' ? 'Payroll schedule refreshed' : 'Staff marked inactive',
      );

      for (const payment of paymentsToResolve) {
        await this.notificationsService.resolveNotifications('payroll_payment', payment.id, actorUserId);
      }

      await this.syncBusinessNotifications(businessId, todayDateKey);
      return;
    }

    await this.ensureCompensationHistorySnapshot(staff, actorUserId, changeReason);

    const paymentsToResolve = await this.payrollRepository.listOpenFuturePaymentsByStaff(staff.id, todayDate);

    await this.payrollRepository.cancelFuturePendingPayments(
      staff.id,
      todayDate,
      'Payroll schedule refreshed',
    );

    for (const payment of paymentsToResolve) {
      await this.notificationsService.resolveNotifications('payroll_payment', payment.id, actorUserId);
    }

    await this.upsertFuturePaymentsForStaff(staff, todayDateKey);
    await this.syncBusinessNotifications(businessId, todayDateKey);
  }

  async getUpcomingPayments(businessId: string, userId: string) {
    await this.ensurePayrollManagementAccess(businessId, userId);
    await this.maybeSyncBusinessSchedule(businessId);

    const business = await this.payrollRepository.findBusinessForSync(businessId);

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const todayDateKey = getTodayDateKey(business.timezone);
    const upcomingEndDateKey = addDays(todayDateKey, UPCOMING_WINDOW_DAYS);
    const payments = await this.payrollRepository.listUpcomingOpenPayments(
      businessId,
      dateKeyToDate(upcomingEndDateKey),
    );

    return {
      todayDate: todayDateKey,
      upcomingWindowDays: UPCOMING_WINDOW_DAYS,
      overdue: payments.filter((payment) => payment.status === 'OVERDUE'),
      dueToday: payments.filter(
        (payment) =>
          payment.status === 'PENDING' && parseDateKey(payment.dueDate) === todayDateKey,
      ),
      upcoming: payments.filter(
        (payment) =>
          payment.status === 'PENDING' &&
          compareDateKeys(parseDateKey(payment.dueDate), todayDateKey) > 0,
      ),
    };
  }

  async getPaymentHistory(businessId: string, userId: string) {
    await this.ensurePayrollManagementAccess(businessId, userId);
    await this.maybeSyncBusinessSchedule(businessId);

    return {
      items: await this.payrollRepository.listPaymentHistory(businessId),
    };
  }

  async updatePaymentStatus(
    businessId: string,
    paymentId: string,
    userId: string,
    dto: UpdatePayrollPaymentDto,
  ) {
    await this.ensurePayrollManagementAccess(businessId, userId);
    await this.maybeSyncBusinessSchedule(businessId);

    const payment = await this.payrollRepository.findPaymentById(businessId, paymentId);

    if (!payment) {
      throw new NotFoundException('Payroll payment not found');
    }

    const business = await this.payrollRepository.findBusinessForSync(businessId);

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const todayDateKey = getTodayDateKey(business.timezone);
    const dueDateKey = parseDateKey(payment.dueDate);

    const nextStatus =
      dto.status === 'PENDING'
        ? compareDateKeys(dueDateKey, todayDateKey) < 0
          ? PayrollPaymentStatus.OVERDUE
          : PayrollPaymentStatus.PENDING
        : dto.status;

    const updatedPayment = await this.payrollRepository.updatePayment(paymentId, {
      status: nextStatus,
      paidAt: dto.status === 'PAID' ? new Date(dto.paidAt ?? new Date().toISOString()) : null,
      paidByUserId: dto.status === 'PAID' ? userId : null,
      notes: dto.notes ?? payment.notes ?? null,
    });

    await this.syncNotificationsForPayment(updatedPayment, todayDateKey, userId);

    return updatedPayment;
  }
}
