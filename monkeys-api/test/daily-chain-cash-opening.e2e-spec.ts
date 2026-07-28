/**
 * Candado C2 — saldo inicial de caja.
 *
 * R2 (caja) declara el efectivo de apertura antes de la 1ª venta; el FAF parte
 * de ese saldo. Verifica el gate de capacidad (CASH_OPERATE), la regla "uno por
 * día", y que el saldo aparece en el status de la cadena.
 *
 * Requiere DB de test arriba. Correr:  npm run test:e2e:full
 */
import { INestApplication } from '@nestjs/common';
import {
  createTestApp,
  truncateAll,
  api,
  registerUser,
  RegisteredUser,
} from './helpers/app-harness';
import { setupBusinessScaffold, BusinessScaffold } from './helpers/fixtures';
import { PrismaService } from '../src/database/prisma/prisma.service';

describe('Daily chain — saldo inicial de caja / candado C2 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let s: BusinessScaffold;
  let cashier: RegisteredUser;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    prisma = ctx.prisma;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
    s = await setupBusinessScaffold(app);
    // Cajero R2_CASH — es quien declara el saldo inicial en V8.0.
    cashier = await registerUser(app);
    await api(app, s.owner.token)
      .post(`/businesses/${s.businessId}/members`)
      .send({ email: cashier.email, role: 'R2_CASH' })
      .expect(201);
  });

  const base = () => `/businesses/${s.businessId}/daily-chain`;

  it('R1 (inventario) no puede declarar el saldo inicial (403 — sin CASH_OPERATE)', async () => {
    await api(app, s.operator.token)
      .post(`${base()}/cash-opening`)
      .send({ openingBalance: 1000 })
      .expect(403);
  });

  it('R2 (caja) declara el saldo inicial y aparece en el status', async () => {
    const res = await api(app, cashier.token)
      .post(`${base()}/cash-opening`)
      .send({ openingBalance: 1500.5, notes: 'Fondo de apertura' })
      .expect(201);
    expect(Number(res.body.openingBalance)).toBe(1500.5);

    const status = await api(app, cashier.token).get(`${base()}/status`).expect(200);
    expect(status.body.cashOpening).toBeTruthy();
    expect(Number(status.body.cashOpening.openingBalance)).toBe(1500.5);
  });

  it('no se puede declarar dos veces el mismo día (400)', async () => {
    await api(app, cashier.token)
      .post(`${base()}/cash-opening`)
      .send({ openingBalance: 1000 })
      .expect(201);
    await api(app, cashier.token)
      .post(`${base()}/cash-opening`)
      .send({ openingBalance: 1200 })
      .expect(400);
  });

  it('exige token Bearer (401 sin auth)', async () => {
    await api(app)
      .post(`${base()}/cash-opening`)
      .send({ openingBalance: 1000 })
      .expect(401);
  });
});
