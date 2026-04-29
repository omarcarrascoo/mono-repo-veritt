// ── Veritt Design Tokens ────────────────────────────────────────────────
// Fuente de verdad de color y superficies para Home y Businesses.
// Regla: el color comunica estado, no decora. Los bloques grandes son
// superficies neutras (paper/white/ink); el color vivo sólo vive en chips,
// barras, dots y rails que comunican etapa.

import type { ChainTone } from '@/lib/daily-chain-home';

// ── Utilidades ─────────────────────────────────────────────────────────

/** Convierte un hex `#RRGGBB` a rgba con el alpha indicado. */
export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Paleta base (sin semántica) ────────────────────────────────────────
// Colores "crudos" que los tokens semánticos componen.

export const palette = {
  // Negro tintado: se usa como ink principal. No es `#000` puro para dar
  // algo de atmósfera en pantallas OLED.
  ink: '#0B0E12',
  inkDeep: '#070A0D',
  inkTinted: '#10141B',

  // Gris "papel" UI — el fondo editorial de la app.
  paper: '#F2F2F2',
  white: '#FFFFFF',
  offWhite: '#E6E6E6',

  // Steel — únicos acentos neutros sobre ink (navbar pill, halo, borde).
  steel: '#6B7A8F',
  steelDeep: '#2A3544',

  // Estados — cada uno con base, deep, soft.
  forest: '#4A7C59',
  forestDeep: '#1F3A2B',
  sage: '#8FB09D',

  amber: '#C48A3A',
  amberDeep: '#5E3F14',
  amberInk: '#1A0F03',

  danger: '#C25450',
  dangerDeep: '#3D1312',
  dangerInk: '#2A0606',
} as const;

// ── Superficies ────────────────────────────────────────────────────────

export const surface = {
  /** Fondo editorial de la app (home, businesses). */
  paper: palette.paper,
  /** Cards elevadas sobre paper. */
  card: palette.white,
  /** Bloques oscuros (StageMega, navbar, next move hero). */
  ink: palette.ink,
  /** Fondo del navbar/bloque steel tintado. */
  inkTinted: palette.inkTinted,
  /** Stop más profundo para gradientes. */
  inkDeep: palette.inkDeep,
} as const;

// ── Tipografía sobre fondos ────────────────────────────────────────────

export const text = {
  onPaper: {
    primary: palette.ink,
    soft: withAlpha(palette.ink, 0.55),
    muted: withAlpha(palette.ink, 0.5),
    subtle: withAlpha(palette.ink, 0.42),
  },
  onInk: {
    primary: palette.paper,
    soft: 'rgba(245,242,234,0.66)',
    muted: 'rgba(245,242,234,0.5)',
    subtle: 'rgba(245,242,234,0.38)',
  },
} as const;

// ── Hairlines / divisores ──────────────────────────────────────────────

export const hairline = {
  onPaper: withAlpha(palette.ink, 0.1),
  onPaperSoft: withAlpha(palette.ink, 0.06),
  onPaperStrong: withAlpha(palette.ink, 0.22),
  onInk: 'rgba(245,242,234,0.1)',
  onInkSoft: 'rgba(245,242,234,0.06)',
  onInkStrong: 'rgba(245,242,234,0.22)',
} as const;

// ── Paleta de estado sobre fondo claro (cards paper) ───────────────────

export type StateColor = {
  /** Color puntual (dot, barra, rail). */
  accent: string;
  /** Fondo sutil del chip. */
  chipBg: string;
  /** Texto/ícono sobre el chip. */
  chipInk: string;
  /** Halo tenue de ambiente (esquinas). */
  halo: string;
};

export const stateOnPaper: Record<ChainTone, StateColor> = {
  start: {
    accent: palette.ink,
    chipBg: withAlpha(palette.ink, 0.06),
    chipInk: palette.ink,
    halo: withAlpha(palette.ink, 0.04),
  },
  progress: {
    accent: palette.forest,
    chipBg: withAlpha(palette.forest, 0.14),
    chipInk: palette.forestDeep,
    halo: withAlpha(palette.forest, 0.08),
  },
  review: {
    accent: palette.amber,
    chipBg: withAlpha(palette.amber, 0.16),
    chipInk: palette.amberDeep,
    halo: withAlpha(palette.amber, 0.08),
  },
  blocker: {
    accent: palette.danger,
    chipBg: withAlpha(palette.danger, 0.16),
    chipInk: palette.dangerDeep,
    halo: withAlpha(palette.danger, 0.08),
  },
  done: {
    accent: palette.forest,
    chipBg: withAlpha(palette.forest, 0.18),
    chipInk: palette.forestDeep,
    halo: withAlpha(palette.forest, 0.08),
  },
};

// ── Paleta de estado sobre fondo oscuro (stageMega, nextMove hero, navbar) ──

export const stateOnInk: Record<ChainTone, StateColor> = {
  start: {
    accent: palette.paper,
    chipBg: 'rgba(245,242,234,0.1)',
    chipInk: palette.paper,
    halo: 'rgba(245,242,234,0.05)',
  },
  progress: {
    accent: palette.sage,
    chipBg: withAlpha(palette.sage, 0.16),
    chipInk: palette.sage,
    halo: withAlpha(palette.sage, 0.12),
  },
  review: {
    accent: palette.amber,
    chipBg: withAlpha(palette.amber, 0.18),
    chipInk: palette.amber,
    halo: withAlpha(palette.amber, 0.12),
  },
  blocker: {
    accent: palette.danger,
    chipBg: withAlpha(palette.danger, 0.2),
    chipInk: palette.danger,
    halo: withAlpha(palette.danger, 0.14),
  },
  done: {
    accent: palette.sage,
    chipBg: withAlpha(palette.forest, 0.22),
    chipInk: palette.sage,
    halo: withAlpha(palette.forest, 0.18),
  },
};

// ── Hero skin (StageMega): fondo negro tintado por estado + acentos ────

export type HeroSkin = {
  bg: string;
  bgGlow: string;
  glowSize: number;
  glowOffset: number;
  divider: string;
  bodyMuted: string;
  bodySoft: string;
  chipBg: string;
  chipInk: string;
  bigNumber: string;
  cta: string;
  ctaInk: string;
  detailBtn: string;
  detailBtnInk: string;
};

export const heroSkin: Record<ChainTone, HeroSkin> = {
  start: {
    bg: palette.ink,
    bgGlow: withAlpha(palette.steel, 0.16),
    glowSize: 320,
    glowOffset: -140,
    divider: 'rgba(245,242,234,0.08)',
    bodyMuted: text.onInk.soft,
    bodySoft: text.onInk.muted,
    chipBg: 'rgba(245,242,234,0.1)',
    chipInk: palette.paper,
    bigNumber: palette.paper,
    cta: palette.paper,
    ctaInk: palette.ink,
    detailBtn: 'rgba(245,242,234,0.06)',
    detailBtnInk: palette.paper,
  },
  progress: {
    bg: palette.ink,
    bgGlow: withAlpha(palette.steel, 0.18),
    glowSize: 340,
    glowOffset: -150,
    divider: withAlpha(palette.sage, 0.1),
    bodyMuted: text.onInk.soft,
    bodySoft: text.onInk.muted,
    chipBg: withAlpha(palette.sage, 0.14),
    chipInk: palette.sage,
    bigNumber: palette.sage,
    cta: palette.paper,
    ctaInk: palette.ink,
    detailBtn: withAlpha(palette.sage, 0.08),
    detailBtnInk: palette.sage,
  },
  review: {
    bg: '#100A03',
    bgGlow: withAlpha(palette.amber, 0.2),
    glowSize: 340,
    glowOffset: -150,
    divider: withAlpha(palette.amber, 0.14),
    bodyMuted: text.onInk.soft,
    bodySoft: text.onInk.muted,
    chipBg: withAlpha(palette.amber, 0.18),
    chipInk: palette.amber,
    bigNumber: palette.amber,
    cta: palette.amber,
    ctaInk: palette.amberInk,
    detailBtn: withAlpha(palette.amber, 0.1),
    detailBtnInk: palette.amber,
  },
  blocker: {
    bg: '#100404',
    bgGlow: withAlpha(palette.danger, 0.22),
    glowSize: 340,
    glowOffset: -150,
    divider: withAlpha(palette.danger, 0.14),
    bodyMuted: text.onInk.soft,
    bodySoft: text.onInk.muted,
    chipBg: withAlpha(palette.danger, 0.2),
    chipInk: palette.danger,
    bigNumber: palette.danger,
    cta: palette.danger,
    ctaInk: palette.dangerInk,
    detailBtn: withAlpha(palette.danger, 0.12),
    detailBtnInk: palette.danger,
  },
  done: {
    bg: '#06120C',
    bgGlow: withAlpha(palette.forest, 0.22),
    glowSize: 360,
    glowOffset: -160,
    divider: withAlpha(palette.forest, 0.16),
    bodyMuted: 'rgba(245,242,234,0.66)',
    bodySoft: 'rgba(245,242,234,0.46)',
    chipBg: withAlpha(palette.forest, 0.22),
    chipInk: palette.sage,
    bigNumber: palette.sage,
    cta: palette.forest,
    ctaInk: palette.paper,
    detailBtn: withAlpha(palette.forest, 0.14),
    detailBtnInk: palette.sage,
  },
};

// ── Navbar (pill flotante + botón chat) ────────────────────────────────

export type NavbarPillSkin = {
  bg: string;
  ink: string;
  dot: string;
};

export const navbar = {
  base: palette.ink,
  gradient: [palette.inkTinted, palette.ink, palette.inkDeep] as const,
  steelOverlay: [
    withAlpha(palette.steel, 0.28),
    withAlpha(palette.steel, 0),
  ] as const,
  forestOverlay: [
    withAlpha(palette.forest, 0.08),
    withAlpha(palette.forest, 0),
  ] as const,
  border: withAlpha(palette.steel, 0.22),
  pillBorder: 'rgba(245,242,234,0.12)',
  iconInactive: 'rgba(245,242,234,0.62)',
  chatGradient: [palette.paper, palette.paper, palette.offWhite] as const,
};

export const pillByTone: Record<ChainTone, NavbarPillSkin> = {
  start: { bg: palette.paper, ink: palette.ink, dot: palette.ink },
  progress: { bg: palette.paper, ink: palette.ink, dot: palette.sage },
  review: { bg: palette.amber, ink: palette.amberInk, dot: palette.amberInk },
  blocker: {
    bg: palette.danger,
    ink: palette.dangerInk,
    dot: palette.dangerInk,
  },
  done: { bg: palette.forest, ink: palette.paper, dot: palette.paper },
};

export const defaultPill: NavbarPillSkin = {
  bg: palette.paper,
  ink: palette.ink,
  dot: palette.ink,
};

export const aiDotByTone: Record<ChainTone, string> = {
  start: palette.forest,
  progress: palette.sage,
  review: palette.amber,
  blocker: palette.danger,
  done: palette.forest,
};

// ── Radii / Shadow ─────────────────────────────────────────────────────

export const radius = {
  sm: 6,
  md: 14,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 10,
  },
} as const;
