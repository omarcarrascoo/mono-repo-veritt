/**
 * globalSetup — corre UNA vez antes de toda la suite e2e.
 * Carga `.env.test` y aplica el schema a la DB de test desechable con
 * `prisma migrate deploy`. Así cada corrida parte de un schema limpio y real
 * (no mocks) para verificar números, FIFO y rollback transaccional de verdad.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { assertTestDbUrl } from './assert-test-db';

export default async function globalSetup(): Promise<void> {
  const envPath = resolve(__dirname, '../.env.test');
  const result = config({ path: envPath });
  if (result.error) {
    throw new Error(
      `No se pudo cargar ${envPath}. Copia .env.test.example a .env.test y levanta la DB con "npm run test:db:up".`,
    );
  }

  // Guardarraíl: aborta si migraríamos contra algo que no es la DB de test.
  // `prisma migrate deploy` lee DATABASE_URL (ver prisma.config.ts).
  assertTestDbUrl('DATABASE_URL', process.env.DATABASE_URL);

  // Aplica todas las migraciones al schema de test. Idempotente.
  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    stdio: 'inherit',
    env: process.env,
  });
}
