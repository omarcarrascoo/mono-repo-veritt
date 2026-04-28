import { ChainTone } from '@/lib/daily-chain-home';

export interface StageAccent {
  label: string;
  accent: string;
  accentInk: string;
  accentSoft: string;
  ctaBg: string;
  ctaInk: string;
}

export const STAGE_ACCENTS: Record<ChainTone, StageAccent> = {
  start: {
    label: 'Por iniciar',
    accent: '#0A0A0A',
    accentInk: '#F5F2EA',
    accentSoft: 'rgba(10,10,10,0.06)',
    ctaBg: '#0A0A0A',
    ctaInk: '#F5F2EA',
  },
  progress: {
    label: 'En curso',
    accent: '#2A3544',
    accentInk: '#F5F2EA',
    accentSoft: 'rgba(42,53,68,0.1)',
    ctaBg: '#2A3544',
    ctaInk: '#F5F2EA',
  },
  review: {
    label: 'En revisión',
    accent: '#5E3F14',
    accentInk: '#F5F2EA',
    accentSoft: 'rgba(196,138,58,0.12)',
    ctaBg: '#5E3F14',
    ctaInk: '#F5F2EA',
  },
  blocker: {
    label: 'Bloqueado',
    accent: '#3D1312',
    accentInk: '#F5F2EA',
    accentSoft: 'rgba(194,84,80,0.1)',
    ctaBg: '#3D1312',
    ctaInk: '#F5F2EA',
  },
  done: {
    label: 'Cerrado',
    accent: '#1F3A2B',
    accentInk: '#F5F2EA',
    accentSoft: 'rgba(74,124,89,0.12)',
    ctaBg: '#1F3A2B',
    ctaInk: '#F5F2EA',
  },
};

// Chip compacto sobre fondo negro (header)
export const STAGE_CHIPS_ON_DARK: Record<
  ChainTone,
  { bg: string; ink: string }
> = {
  start: { bg: 'rgba(245,242,234,0.08)', ink: '#F5F2EA' },
  progress: { bg: 'rgba(143,176,157,0.12)', ink: '#8FB09D' },
  review: { bg: 'rgba(196,138,58,0.14)', ink: '#C48A3A' },
  blocker: { bg: 'rgba(194,84,80,0.14)', ink: '#C25450' },
  done: { bg: 'rgba(74,124,89,0.14)', ink: '#8FB09D' },
};
