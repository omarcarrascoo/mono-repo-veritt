/**
 * Harness e2e compartido.
 *
 * - `createTestApp()` arranca el AppModule REPLICANDO main.ts (prefijo api/v1
 *   + ValidationPipe whitelist/transform/forbidNonWhitelisted), para que los
 *   tests vean exactamente el mismo comportamiento que producción.
 * - `truncateAll()` deja la DB limpia entre suites sin recrear el schema.
 * - `registerUser()` / `login()` devuelven un token Bearer real.
 * - `api()` arma un cliente supertest con el token inyectado y el prefijo puesto.
 *
 * Requiere la DB de test arriba (`npm run test:db:up`) — ver README de testing.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma/prisma.service';

export const API_PREFIX = '/api/v1';

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
}

export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.init();

  const prisma = app.get(PrismaService);
  return { app, prisma };
}

/**
 * Trunca todas las tablas del schema public (excepto _prisma_migrations) y
 * reinicia identidades. CASCADE resuelve las FKs. Rápido entre suites.
 */
export async function truncateAll(prisma: PrismaService): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public'
       AND tablename <> '_prisma_migrations'`,
  );
  if (rows.length === 0) return;
  const list = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`,
  );
}

/** Cliente supertest con prefijo y (opcional) Bearer token ya inyectado. */
export function api(app: INestApplication, token?: string) {
  const server = app.getHttpServer();
  const withAuth = (req: request.Test) =>
    token ? req.set('Authorization', `Bearer ${token}`) : req;
  return {
    get: (path: string) => withAuth(request(server).get(`${API_PREFIX}${path}`)),
    post: (path: string) =>
      withAuth(request(server).post(`${API_PREFIX}${path}`)),
    patch: (path: string) =>
      withAuth(request(server).patch(`${API_PREFIX}${path}`)),
    delete: (path: string) =>
      withAuth(request(server).delete(`${API_PREFIX}${path}`)),
  };
}

export interface RegisteredUser {
  id: string;
  email: string;
  token: string;
}

let userSeq = 0;

/** Registra un usuario nuevo y devuelve su id + token. Email único por llamada. */
export async function registerUser(
  app: INestApplication,
  overrides?: { email?: string; password?: string; fullName?: string },
): Promise<RegisteredUser> {
  const email = overrides?.email ?? `user${Date.now()}-${userSeq++}@test.veritt`;
  const password = overrides?.password ?? 'secret123';
  const fullName = overrides?.fullName ?? 'Test User';

  const res = await api(app)
    .post('/auth/register')
    .send({ email, password, fullName })
    .expect(201);

  return { id: res.body.user.id, email, token: res.body.accessToken };
}
