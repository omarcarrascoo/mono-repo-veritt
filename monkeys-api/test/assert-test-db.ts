/**
 * Guardarraíl compartido: aborta si una URL de conexión NO es la DB de test
 * local. Los e2e hacen TRUNCATE de todas las tablas — apuntar a otra base
 * (sobre todo producción) sería destructivo e irreversible.
 *
 * Doble defensa:
 *   1. Allowlist — debe ser exactamente el contenedor de docker-compose.test.yml
 *      (host local, puerto 5433, db veritt_test).
 *   2. Denylist — rechaza cualquier rastro de producción (supabase, pooler, el
 *      project-ref) aunque por error coincidiera con lo de arriba.
 */
const EXPECTED_HOST = /(localhost|127\.0\.0\.1):5433\b/;
const EXPECTED_DB = /\/veritt_test(\?|$)/;
const FORBIDDEN = /(supabase|pooler|jvjhsiyyduuixmowxyis|\.co)/i;

export function assertTestDbUrl(label: string, url: string | undefined): void {
  if (!url) {
    throw new Error(`[guardarraíl e2e] ${label} no está definida en .env.test.`);
  }
  if (FORBIDDEN.test(url)) {
    throw new Error(
      `[guardarraíl e2e] ${label} parece apuntar a PRODUCCIÓN. ` +
        `Los tests hacen TRUNCATE — abortando. Usa la DB local (localhost:5433/veritt_test).`,
    );
  }
  if (!EXPECTED_HOST.test(url) || !EXPECTED_DB.test(url)) {
    throw new Error(
      `[guardarraíl e2e] ${label} debe apuntar a la DB de test local ` +
        `(localhost:5433/veritt_test). Abortando por seguridad.`,
    );
  }
}
