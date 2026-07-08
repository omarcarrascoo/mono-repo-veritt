/**
 * Cadena diaria — rollback transaccional del AMD.
 *
 * Invariante (decisión 2 de INVENTORY_COSTING.md): "si no hay AMD no hay día
 * firmado". signFOP firma el FOP y genera el AMD en la MISMA transacción; si
 * el builder del AMD falla, el rollback revierte la firma — el FOP NO queda
 * firmado.
 *
 * Para probarlo, montamos un AppModule con AmdService.generateForFOP
 * sobreescrito para que lance. Luego conducimos la cadena hasta el FOP e
 * intentamos firmar: debe fallar (500) y el FOP debe seguir sin firmar.
 *
 * Requiere DB de test arriba. Correr:  npm run test:e2e:full
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma/prisma.service';
import { AmdService } from '../src/amd/amd.service';
import { api, truncateAll } from './helpers/app-harness';
import { setupBusinessScaffold, driveChainToFOP } from './helpers/fixtures';

describe('Daily chain — AMD rollback (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Override: el builder del AMD siempre falla → debe revertir la firma.
      .overrideProvider(AmdService)
      .useValue({
        generateForFOP: jest.fn().mockRejectedValue(
          new Error('Fallo simulado del builder del AMD'),
        ),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
  });

  it('si el AMD falla al firmar el FOP, la firma se revierte (FOP no queda SIGNED)', async () => {
    const s = await setupBusinessScaffold(app);
    const fopId = await driveChainToFOP(app, s);

    const base = `/businesses/${s.businessId}/daily-chain`;

    // Firmar dispara generateForFOP (mock que lanza) → la transacción revienta.
    // El error sale como 500 (no es una excepción HTTP de Nest).
    await api(app, s.owner.token)
      .post(`${base}/fop/${fopId}/sign`)
      .send({ discrepancyJustification: 'intento de cierre' })
      .expect(500);

    // El invariante: el FOP NO quedó firmado (rollback) y NO hay AMD.
    const fop = await api(app, s.owner.token).get(`${base}/fop`).expect(200);
    expect(fop.body.status).not.toBe('SIGNED');
    expect(fop.body.signedAt).toBeFalsy();

    // Tampoco se persistió ningún AMD para el día.
    const amdCount = await prisma.dailyMasterArchive.count({
      where: { businessId: s.businessId },
    });
    expect(amdCount).toBe(0);
  });
});
