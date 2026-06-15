import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma/prisma.service';
import { AmdBuilderService } from './amd-builder.service';
import { AmdRepository } from './amd.repository';
import { computeAmdHash, verifyAmdHash } from './helpers/amd-hash';
import { AMD_SCHEMA_VERSION, AMDContentV1 } from './types/amd-content.types';
import {
  getOperationalDate,
  parseOperationalDate,
} from '../daily-chain/helpers/operational-date.helper';

type Tx = Prisma.TransactionClient | PrismaService;

@Injectable()
export class AmdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: AmdRepository,
    private readonly builder: AmdBuilderService,
  ) {}

  /**
   * Genera y persiste el AMD para un FOP recien firmado.
   * Llamado dentro de la transaccion de `signFOP` — si lanza, todo se
   * revierte (decision 2 INVENTORY_COSTING.md).
   */
  async generateForFOP(
    tx: Tx,
    fop: { id: string; businessId: string; operationalDate: Date },
  ) {
    // Si ya existe AMD para esa fecha, conflict — no regeneramos.
    const existing = await tx.dailyMasterArchive.findFirst({
      where: {
        businessId: fop.businessId,
        operationalDate: fop.operationalDate,
      },
    });
    if (existing) {
      throw new ConflictException(
        'Ya existe un AMD para esta fecha operativa',
      );
    }

    const content = await this.builder.build(fop.id, tx);
    const contentHash = computeAmdHash(content);

    return this.repo.create(tx, {
      businessId: fop.businessId,
      operationalDate: fop.operationalDate,
      fopId: fop.id,
      contentJson: content as unknown as Prisma.InputJsonValue,
      contentHash,
      schemaVersion: AMD_SCHEMA_VERSION,
    });
  }

  // ── Lectores ──

  async getByDate(businessId: string, userId: string, dateStr?: string) {
    await this.ensureAccess(businessId, userId);
    const opDate = dateStr
      ? parseOperationalDate(dateStr)
      : await this.getCurrentOperationalDate(businessId);
    if (!opDate) {
      throw new NotFoundException(
        'Negocio no encontrado o sin fecha operativa configurada',
      );
    }
    const amd = await this.repo.findByDate(businessId, opDate);
    if (!amd) throw new NotFoundException('AMD no generado para esta fecha');
    return amd;
  }

  async getById(businessId: string, amdId: string, userId: string) {
    await this.ensureAccess(businessId, userId);
    const amd = await this.repo.findById(amdId);
    if (!amd || amd.businessId !== businessId) {
      throw new NotFoundException('AMD no encontrado');
    }
    return amd;
  }

  async list(businessId: string, userId: string, from: string, to: string) {
    await this.ensureAccess(businessId, userId);
    const fromDate = parseOperationalDate(from);
    const toDate = parseOperationalDate(to);
    return this.repo.listInRange(businessId, fromDate, toDate);
  }

  /**
   * Verifica que el `contentJson` actual coincida con el `contentHash`
   * almacenado. Si difieren, el AMD fue modificado despues de generarse —
   * candado C6.
   */
  async verify(businessId: string, amdId: string, userId: string) {
    await this.ensureAccess(businessId, userId);
    const amd = await this.repo.findById(amdId);
    if (!amd || amd.businessId !== businessId) {
      throw new NotFoundException('AMD no encontrado');
    }
    const result = verifyAmdHash(amd.contentJson, amd.contentHash);

    // Si el verify difiere de lo que decia el status, lo actualizamos
    // para reflejar el estado real en futuras consultas.
    const expectedStatus = result.valid ? 'VERIFIED' : 'TAMPERED';
    if (amd.status !== expectedStatus) {
      await this.prisma.dailyMasterArchive.update({
        where: { id: amdId },
        data: { status: expectedStatus },
      });
    }

    return {
      amdId: amd.id,
      operationalDate: amd.operationalDate,
      storedHash: amd.contentHash,
      computedHash: result.computedHash,
      valid: result.valid,
      status: expectedStatus,
      verifiedAt: new Date().toISOString(),
    };
  }

  // ── Helpers privados ──

  private async ensureAccess(businessId: string, userId: string) {
    const membership = await this.repo.findMembership(businessId, userId);
    if (!membership) {
      throw new ForbiddenException('No perteneces a este negocio');
    }
    return membership;
  }

  private async getCurrentOperationalDate(
    businessId: string,
  ): Promise<Date | null> {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: {
        operationalDayCutoffHour: true,
        timezone: true,
      },
    });
    if (!business) return null;
    return getOperationalDate(
      business.operationalDayCutoffHour,
      business.timezone,
    );
  }

  /**
   * Helper para acceder al contentJson como AMDContentV1 typed. Siempre
   * usar esto en lugar de hacer cast manual del JSON.
   */
  static asContentV1(json: Prisma.JsonValue): AMDContentV1 {
    return json as unknown as AMDContentV1;
  }
}
