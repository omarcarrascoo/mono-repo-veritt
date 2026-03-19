import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // 1. Instanciamos el Pool nativo de Node.js
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL 
    });
    
    // @ts-expect-error: Prisma 7 tiene un desajuste temporal con @types/pg.
    // Esta directiva es la buena práctica para evadir bugs de tipos de 3ros sin usar "any".
    const adapter = new PrismaPg(pool);
    
    // 2. Pasamos el adaptador OBLIGATORIO al constructor de PrismaClient
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}