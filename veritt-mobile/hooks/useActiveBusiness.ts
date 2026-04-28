import { useMemo } from 'react';

import { useBusinessStore } from '@/store/business.store';
import type { Business } from '@/types/business.types';

/**
 * Devuelve el negocio activo sin suscribir al componente a todas las
 * actualizaciones del store. Solo se re-renderiza cuando cambia `businesses`
 * o `activeBusinessId`.
 */
export function useActiveBusiness(): Business | null {
  const businesses = useBusinessStore((s) => s.businesses);
  const activeBusinessId = useBusinessStore((s) => s.activeBusinessId);

  return useMemo(() => {
    if (businesses.length === 0) return null;
    if (!activeBusinessId) return businesses[0];
    return (
      businesses.find((b) => b.id === activeBusinessId) ?? businesses[0]
    );
  }, [businesses, activeBusinessId]);
}
