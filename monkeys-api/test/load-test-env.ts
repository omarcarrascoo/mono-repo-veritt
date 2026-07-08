/**
 * setupFiles — corre en CADA worker de Jest antes del framework de test.
 * Carga `.env.test` para que PrismaService (que lee DATABASE_URL_SESSION) y el
 * resto del runtime apunten a la Postgres de pruebas, no a producción.
 */
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { assertTestDbUrl } from './assert-test-db';

const envPath = resolve(__dirname, '../.env.test');
const result = config({ path: envPath });

if (result.error) {
  throw new Error(
    `No se pudo cargar ${envPath}. Copia .env.test.example a .env.test antes de correr e2e.`,
  );
}

// Guardarraíl: aborta si la conexión del runtime no es la DB de test local.
assertTestDbUrl('DATABASE_URL_SESSION', process.env.DATABASE_URL_SESSION);
