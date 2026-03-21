export type NotificationStatus = 'UNREAD' | 'READ';
export type NotificationType = 'PAYROLL_DUE' | 'PAYROLL_OVERDUE';

export interface AppNotification {
  id: string;
  businessId: string;
  type: NotificationType;
  title: string;
  body: string;
  status: NotificationStatus;
  dedupeKey: string;
  resourceType?: string | null;
  resourceId?: string | null;
  scheduledFor?: string | null;
  readAt?: string | null;
  readByUserId?: string | null;
  metadataJson?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}
