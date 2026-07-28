import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethodsRepository } from './payment-methods.repository';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PermissionService } from '../common/services/permission.service';

@Injectable()
export class PaymentMethodsService {
  constructor(
    private readonly paymentMethodsRepository: PaymentMethodsRepository,
    private readonly permissions: PermissionService,
  ) {}

  private async ensureBusinessAccess(businessId: string, userId: string) {
    const membership = await this.paymentMethodsRepository.findMembership(businessId, userId);
    if (!membership) {
      throw new ForbiddenException('You do not belong to this business');
    }
    return membership;
  }

  private async ensureManagementAccess(businessId: string, userId: string) {
    const membership = await this.ensureBusinessAccess(businessId, userId);
    if (
      !(await this.permissions.can(businessId, membership.role, 'FINANCE_MANAGE'))
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return membership;
  }

  async findAll(businessId: string, userId: string) {
    await this.ensureBusinessAccess(businessId, userId);
    return this.paymentMethodsRepository.findAll(businessId);
  }

  async create(businessId: string, userId: string, dto: CreatePaymentMethodDto) {
    await this.ensureManagementAccess(businessId, userId);

    const existing = await this.paymentMethodsRepository.findByBusinessAndName(businessId, dto.name);
    if (existing) {
      throw new ConflictException('A payment method with this name already exists');
    }

    return this.paymentMethodsRepository.create(businessId, dto);
  }

  async update(businessId: string, paymentMethodId: string, userId: string, dto: UpdatePaymentMethodDto) {
    await this.ensureManagementAccess(businessId, userId);

    const method = await this.paymentMethodsRepository.findOne(paymentMethodId);
    if (!method || method.businessId !== businessId) {
      throw new NotFoundException('Payment method not found');
    }

    if (dto.name && dto.name !== method.name) {
      const existing = await this.paymentMethodsRepository.findByBusinessAndName(businessId, dto.name);
      if (existing) {
        throw new ConflictException('A payment method with this name already exists');
      }
    }

    return this.paymentMethodsRepository.update(paymentMethodId, dto);
  }
}
