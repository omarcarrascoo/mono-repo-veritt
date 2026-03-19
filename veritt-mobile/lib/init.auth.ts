import { setApiUnauthorizedHandler } from '@/api/client';
import { useAuthStore } from '@/store/auth.store';

export function initAuthBindings() {
  setApiUnauthorizedHandler(async () => {
    await useAuthStore.getState().logout();
  });
}