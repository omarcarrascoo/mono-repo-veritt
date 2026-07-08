import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMembership(businessId: string, userId: string) {
    return this.prisma.businessMembership.findFirst({
      where: { businessId, userId, status: 'ACTIVE' },
    });
  }

  findAll(businessId: string, status?: string) {
    return this.prisma.supplier.findMany({
      where: {
        businessId,
        ...(status && { status: status as any }),
      },
      orderBy: { name: 'asc' },
    });
  }

  findOne(supplierId: string) {
    return this.prisma.supplier.findUnique({
      where: { id: supplierId },
    });
  }

  create(businessId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: { businessId, ...dto },
    });
  }

  update(supplierId: string, dto: UpdateSupplierDto) {
    return this.prisma.supplier.update({
      where: { id: supplierId },
      data: dto,
    });
  }
}
