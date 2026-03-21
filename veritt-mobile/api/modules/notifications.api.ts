import { apiClient } from '@/api/client';
import { AppNotification, NotificationStatus, NotificationType } from '@/types/notification.types';

type NotificationQuery = {
  businessId?: string;
  status?: NotificationStatus;
  type?: NotificationType;
  limit?: number;
};

export const notificationsApi = {
  async list(query: NotificationQuery = {}): Promise<AppNotification[]> {
    const { data } = await apiClient.get<AppNotification[]>('/notifications', {
      params: query,
    });
    return data;
  },

  async markAsRead(notificationId: string): Promise<AppNotification> {
    const { data } = await apiClient.patch<AppNotification>(
      `/notifications/${notificationId}/read`
    );
    return data;
  },
};
