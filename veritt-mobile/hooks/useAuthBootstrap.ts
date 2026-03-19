import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';

export function useAuthBootstrap(): void {
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);
}