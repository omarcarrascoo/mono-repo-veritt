import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto } from './dto/update-process.dto';

@Injectable()
export class ProcessesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMembership(businessId: string, userId: string) {
    return this.prisma.businessMembership.findFirst({
      where: { businessId, userId, status: 'ACTIVE' },
    });
  }

  findAll(businessId: string) {
    return this.prisma.processTemplate.findMany({
      where: { businessId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.processTemplate.findUnique({
      where: { id },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
  }

  findByBusinessAndName(businessId: string, name: string) {
    return this.prisma.processTemplate.findUnique({
      where: { businessId_name: { businessId, name } },
    });
  }

  create(businessId: string, dto: CreateProcessDto) {
    return this.prisma.processTemplate.create({
      data: {
        businessId,
        name: dto.name,
        description: dto.description,
        isBlocking: dto.isBlocking ?? false,
        steps: {
          create: dto.steps.map((step) => ({
            name: step.name,
            description: step.description,
            stepOrder: step.stepOrder,
            requiredRole: step.requiredRole as any,
            assignedAreaId: step.assignedAreaId,
          })),
        },
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
  }

  update(id: string, dto: UpdateProcessDto) {
    return this.prisma.processTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        isBlocking: dto.isBlocking,
        status: dto.status as any,
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
  }

  createExecution(businessId: string, processId: string, userId: string, areaId?: string, notes?: string) {
    return this.prisma.processExecution.create({
      data: {
        businessId,
        processId,
        executedByUserId: userId,
        areaId,
        notesJson: notes ? { notes } : undefined,
        status: 'IN_PROGRESS',
      },
      include: { process: true, area: true },
    });
  }

  findExecution(executionId: string) {
    return this.prisma.processExecution.findUnique({
      where: { id: executionId },
      include: { process: true, area: true },
    });
  }

  completeExecution(executionId: string, notes?: string) {
    return this.prisma.processExecution.update({
      where: { id: executionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        ...(notes && { notesJson: { notes } }),
      },
      include: { process: true, area: true },
    });
  }

  findExecutions(businessId: string, filters: { processId?: string; status?: string; from?: Date; to?: Date }) {
    return this.prisma.processExecution.findMany({
      where: {
        businessId,
        ...(filters.processId && { processId: filters.processId }),
        ...(filters.status && { status: filters.status as any }),
        ...(filters.from && { startedAt: { gte: filters.from } }),
        ...(filters.to && { startedAt: { lte: filters.to } }),
      },
      include: { process: true, area: true },
      orderBy: { startedAt: 'desc' },
    });
  }
}
