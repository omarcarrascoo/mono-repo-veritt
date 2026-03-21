import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationStatus, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';
import { dateKeyToDate, parseDateKey } from '../payroll/utils/payroll-schedule.utils';
import { ListNotificationsDto } from './dto/list-notifications.dto';

type UpsertNotificationInput = {
  businessId: string;
  type: NotificationType;
  dedupeKey: string;
  title: string;
  body: string;
  resourceType?: string;
  resourceId?: string;
  scheduledFor?: string | Date;
  metadataJson?: Prisma.InputJsonValue;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertNotification(input: UpsertNotificationInput) {
    return this.prisma.notification.upsert({
      where: { dedupeKey: input.dedupeKey },
      create: {
        businessId: input.businessId,
        type: input.type,
        title: input.title,
        body: input.body,
        dedupeKey: input.dedupeKey,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        scheduledFor: input.scheduledFor ? dateKeyToDate(parseDateKey(input.scheduledFor)) : undefined,
        metadataJson: input.metadataJson,
      },
      update: {
        title: input.title,
        body: input.body,
        status: 'UNREAD',
        readAt: null,
        readByUserId: null,
        scheduledFor: input.scheduledFor ? dateKeyToDate(parseDateKey(input.scheduledFor)) : null,
        metadataJson: input.metadataJson,
      },
    });
  }

  async resolveNotifications(resourceType: string, resourceId: string, userId?: string) {
    return this.prisma.notification.updateMany({
      where: {
        resourceType,
        resourceId,
        status: 'UNREAD',
      },
      data: {
        status: 'READ',
        readAt: new Date(),
        readByUserId: userId ?? null,
      },
    });
  }

  async list(userId: string, query: ListNotificationsDto) {
    const limit = query.limit ?? 50;
    const where: Prisma.NotificationWhereInput = {
      business: {
        memberships: {
          some: {
            userId,
            status: 'ACTIVE',
          },
        },
      },
      businessId: query.businessId,
      status: query.status,
      type: query.type,
    };

    return this.prisma.notification.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { scheduledFor: 'asc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        business: {
          memberships: {
            some: {
              userId,
              status: 'ACTIVE',
            },
          },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
        readByUserId: userId,
      },
    });
  }

  async assertBusinessAccess(businessId: string, userId: string) {
    const membership = await this.prisma.businessMembership.findFirst({
      where: {
        businessId,
        userId,
        status: 'ACTIVE',
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not belong to this business');
    }

    return membership;
  }
}
