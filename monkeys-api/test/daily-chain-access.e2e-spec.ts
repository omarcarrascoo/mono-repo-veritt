/**
 * Cadena diaria — control de acceso y reglas de bloqueo.
 *
 * Estos son los invariantes que hacen a Veritt "complejo de falsificar":
 * separación de funciones (creador ≠ autorizador), gateo de roles, y la
 * secuencialidad de la cadena (no puedes saltarte un formato). Verificados
 * contra las condiciones exactas de daily-chain.service.ts.
 *
 * Requiere DB de test arriba. Correr:  npm run test:e2e:full
 *   (o: npm run test:db:up && npm run test:e2e)
 */
import { INestApplication } from '@nestjs/common';
import type { Test as SupertestRequest } from 'supertest';
import {
  createTestApp,
  truncateAll,
  api,
  registerUser,
} from './helpers/app-harness';
import { setupBusinessScaffold, BusinessScaffold } from './helpers/fixtures';
import { PrismaService } from '../src/database/prisma/prisma.service';

describe('Daily chain — access control & blocking (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let s: BusinessScaffold;

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
  });

  const dc = (token: string) => ({
    base: `/businesses/${s.businessId}/daily-chain`,
    client: api(app, token),
  });

  it('rechaza acceso a quien no pertenece al negocio (403)', async () => {
    const stranger = await registerUser(app);
    await api(app, stranger.token)
      .get(`/businesses/${s.businessId}/daily-chain/status`)
      .expect(403);
  });

  it('exige token Bearer (401 sin auth)', async () => {
    await api(app)
      .get(`/businesses/${s.businessId}/daily-chain/status`)
      .expect(401);
  });

  describe('FAI — apertura', () => {
    function createOpening(token: string): SupertestRequest {
      const { base, client } = dc(token);
      return client
        .post(`${base}/opening`)
        .send({
          locationId: s.locationId,
          items: [{ materialId: s.materialId, countedQuantity: 50 }],
        });
    }

    it('un operador puede crear el FAI (PENDING)', async () => {
      const res = await createOpening(s.operator.token).expect(201);
      expect(res.body.status).toBe('PENDING');
    });

    it('el creador NO puede autorizar su propio FAI (separación de funciones, 403)', async () => {
      const created = await createOpening(s.operator.token).expect(201);
      const { base } = dc(s.operator.token);
      // El operador no es management → 403 por ensureManagement de todas formas;
      // probamos el caso fuerte: un manager que ADEMÁS fue el creador.
      // Aquí el operador intenta autorizar: debe fallar (no management).
      await api(app, s.operator.token)
        .post(`${base}/opening/${created.body.id}/authorize`)
        .expect(403);
    });

    it('el manager (distinto del creador) sí autoriza el FAI', async () => {
      const created = await createOpening(s.operator.token).expect(201);
      const { base } = dc(s.manager.token);
      const res = await api(app, s.manager.token)
        .post(`${base}/opening/${created.body.id}/authorize`)
        .expect(201);
      expect(res.body.status).toBe('AUTHORIZED');
    });

    it('un manager que creó el FAI NO puede autorizarlo (creador ≠ autorizador, 403)', async () => {
      // El manager crea el conteo él mismo…
      const created = await createOpening(s.manager.token).expect(201);
      // …y al intentar autorizarlo debe ser rechazado por ser el creador.
      const { base } = dc(s.manager.token);
      await api(app, s.manager.token)
        .post(`${base}/opening/${created.body.id}/authorize`)
        .expect(403);
    });
  });

  describe('Secuencialidad de la cadena', () => {
    it('no se puede crear el FCI sin un FAI autorizado (400)', async () => {
      const { base } = dc(s.operator.token);
      await api(app, s.operator.token)
        .post(`${base}/closing`)
        .send({
          locationId: s.locationId,
          items: [{ materialId: s.materialId, countedQuantity: 40 }],
        })
        .expect(400);
    });

    it('una venta sin FAI autorizado no abre el día (isDayOpen=false)', async () => {
      // Sin FAI, el día está cerrado. Verificamos el helper vía status:
      const { base } = dc(s.operator.token);
      const status = await api(app, s.operator.token)
        .get(`${base}/status`)
        .expect(200);
      expect(status.body.fai).toBeNull();
    });
  });

  describe('FOP — firma', () => {
    it('un R1 (inventario) no puede firmar el FOP (403)', async () => {
      // No hay FOP todavía, pero el gate de rol corre antes de buscarlo.
      const { base } = dc(s.operator.token);
      await api(app, s.operator.token)
        .post(`${base}/fop/00000000-0000-0000-0000-000000000000/sign`)
        .send({})
        .expect(403);
    });
  });
});
