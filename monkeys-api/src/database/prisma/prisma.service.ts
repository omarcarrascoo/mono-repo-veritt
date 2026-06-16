import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // Guardamos el pool nativo para poder cerrarlo en onModuleDestroy.
  // $disconnect() no termina el Pool del adapter — sin esto el pool queda
  // abierto (impide el graceful shutdown del app y deja handles vivos en tests).
  private readonly pool: Pool;

  constructor() {
    // 1. Instanciamos el Pool nativo de Node.js.
    // La cadena de conexion DEBE venir del entorno — nunca hardcodear credenciales
    // (regla de seguridad, ver CLAUDE.md). Si falta, fallar ruidosamente al arrancar
    // en vez de caer silenciosamente a una DB equivocada (p.ej. produccion en tests).
    const connectionString = process.env.DATABASE_URL_SESSION;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL_SESSION no esta definida. Configurala en .env (dev) o .env.test (pruebas).',
      );
    }
    const pool = new Pool({ connectionString });

    // @ts-expect-error: Prisma 7 tiene un desajuste temporal con @types/pg.
    // Esta directiva es la buena práctica para evadir bugs de tipos de 3ros sin usar "any".
    const adapter = new PrismaPg(pool);

    // 2. Pasamos el adaptador OBLIGATORIO al constructor de PrismaClient
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    // Cierra el pool nativo de pg para liberar conexiones y permitir un
    // apagado limpio (y que Jest termine sin handles colgados).
    await this.pool.end();
  }
}