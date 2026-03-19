export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

export const normalizeSlug = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');