import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProcessesRepository } from './processes.repository';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto } from './dto/update-process.dto';

@Injectable()
export class ProcessesService {
  constructor(private readonly processesRepository: ProcessesRepository) {}

  private async ensureBusinessAccess(businessId: string, userId: string) {
    const membership = await this.processesRepository.findMembership(businessId, userId);
    if (!membership) {
      throw new ForbiddenException('You do not belong to this business');
    }
    return membership;
  }

  private async ensureManagementAccess(businessId: string, userId: string) {
    const membership = await this.ensureBusinessAccess(businessId, userId);
    if (!['OWNER', 'ADMIN', 'VERITT_STAFF'].includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return membership;
  }

  async findAll(businessId: string, userId: string) {
    await this.ensureBusinessAccess(businessId, userId);
    return this.processesRepository.findAll(businessId);
  }

  async findOne(businessId: string, processId: string, userId: string) {
    await this.ensureBusinessAccess(businessId, userId);
    const process = await this.processesRepository.findOne(processId);
    if (!process || process.businessId !== businessId) {
      throw new NotFoundException('Process not found');
    }
    return process;
  }

  async create(businessId: string, userId: string, dto: CreateProcessDto) {
    await this.ensureManagementAccess(businessId, userId);

    const existing = await this.processesRepository.findByBusinessAndName(businessId, dto.name);
    if (existing) {
      throw new ConflictException('A process with this name already exists');
    }

    return this.processesRepository.create(businessId, dto);
  }

  async update(businessId: string, processId: string, userId: string, dto: UpdateProcessDto) {
    await this.ensureManagementAccess(businessId, userId);

    const process = await this.processesRepository.findOne(processId);
    if (!process || process.businessId !== businessId) {
      throw new NotFoundException('Process not found');
    }

    if (dto.name && dto.name !== process.name) {
      const existing = await this.processesRepository.findByBusinessAndName(businessId, dto.name);
      if (existing) {
        throw new ConflictException('A process with this name already exists');
      }
    }

    return this.processesRepository.update(processId, dto);
  }

  async startExecution(businessId: string, processId: string, userId: string, areaId?: string, notes?: string) {
    await this.ensureBusinessAccess(businessId, userId);

    const process = await this.processesRepository.findOne(processId);
    if (!process || process.businessId !== businessId) {
      throw new NotFoundException('Process not found');
    }
    if (process.status !== 'ACTIVE') {
      throw new BadRequestException('This process is not active');
    }

    return this.processesRepository.createExecution(businessId, processId, userId, areaId, notes);
  }

  async completeExecution(businessId: string, processId: string, executionId: string, userId: string, notes?: string) {
    await this.ensureBusinessAccess(businessId, userId);

    const execution = await this.processesRepository.findExecution(executionId);
    if (!execution || execution.businessId !== businessId || execution.processId !== processId) {
      throw new NotFoundException('Execution not found');
    }
    if (execution.status !== 'IN_PROGRESS') {
      throw new BadRequestException('This execution is not in progress');
    }

    return this.processesRepository.completeExecution(executionId, notes);
  }

  async findExecutions(businessId: string, userId: string, filters: { processId?: string; status?: string; from?: string; to?: string }) {
    await this.ensureBusinessAccess(businessId, userId);
    return this.processesRepository.findExecutions(businessId, {
      processId: filters.processId,
      status: filters.status,
      from: filters.from ? new Date(filters.from) : undefined,
      to: filters.to ? new Date(filters.to) : undefined,
    });
  }
}
