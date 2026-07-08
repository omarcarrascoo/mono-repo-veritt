import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';

type Tx = Prisma.TransactionClient | PrismaService;

@Injectable()
export class AmdRepository {
  constructor(private readonly prisma: PrismaService) {}

  get prismaClient() {
    return this.prisma;
  }

  async create(
    tx: Tx,
    data: {
      businessId: string;
      operationalDate: Date;
      fopId: string;
      contentJson: Prisma.InputJsonValue;
      contentHash: string;
      schemaVersion: number;
    },
  ) {
    return tx.dailyMasterArchive.create({ data });
  }

  async findByDate(businessId: string, operationalDate: Date) {
    return this.prisma.dailyMasterArchive.findFirst({
      where: { businessId, operationalDate },
    });
  }

  async findById(amdId: string) {
    return this.prisma.dailyMasterArchive.findUnique({
      where: { id: amdId },
    });
  }

  async listInRange(businessId: string, from: Date, to: Date) {
    return this.prisma.dailyMasterArchive.findMany({
      where: {
        businessId,
        operationalDate: { gte: from, lte: to },
      },
      select: {
        id: true,
        operationalDate: true,
        contentHash: true,
        status: true,
        generatedAt: true,
        schemaVersion: true,
      },
      orderBy: { operationalDate: 'desc' },
    });
  }

  async findMembership(businessId: string, userId: string) {
    return this.prisma.businessMembership.findFirst({
      where: { businessId, userId, status: 'ACTIVE' },
    });
  }
}
