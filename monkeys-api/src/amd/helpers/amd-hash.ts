import { createHash } from 'crypto';
import { canonicalize } from './canonical-json';

/**
 * Calcula el hash SHA-256 del JSON canonico de `content`. Hex lowercase
 * (64 chars). Determinista: mismo content → mismo hash, siempre.
 *
 * Es la base del candado C6 (AMD vs Tiempo) en ARCHITECTURE_V3.
 */
export function computeAmdHash(content: unknown): string {
  const canonical = canonicalize(content);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Verifica que el hash almacenado coincida con el recalculado sobre el
 * content. Si no coincide, el AMD fue modificado despues de generarse.
 */
export function verifyAmdHash(
  content: unknown,
  expectedHash: string,
): { valid: boolean; computedHash: string } {
  const computedHash = computeAmdHash(content);
  return { valid: computedHash === expectedHash, computedHash };
}
