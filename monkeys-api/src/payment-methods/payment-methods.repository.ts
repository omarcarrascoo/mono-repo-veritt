import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';

@Injectable()
export class PaymentMethodsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMembership(businessId: string, userId: string) {
    return this.prisma.businessMembership.findFirst({
      where: { businessId, userId, status: 'ACTIVE' },
    });
  }

  findAll(businessId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { businessId },
      orderBy: { createdAt: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.paymentMethod.findUnique({
      where: { id },
    });
  }

  findByBusinessAndName(businessId: string, name: string) {
    return this.prisma.paymentMethod.findUnique({
      where: { businessId_name: { businessId, name } },
    });
  }

  create(businessId: string, dto: CreatePaymentMethodDto) {
    return this.prisma.paymentMethod.create({
      data: {
        businessId,
        name: dto.name,
        type: dto.type as any,
        terminalReference: dto.terminalReference,
        bankReference: dto.bankReference,
      },
    });
  }

  update(id: string, dto: UpdatePaymentMethodDto) {
    return this.prisma.paymentMethod.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type as any,
        terminalReference: dto.terminalReference,
        bankReference: dto.bankReference,
        status: dto.status as any,
      },
    });
  }
}
