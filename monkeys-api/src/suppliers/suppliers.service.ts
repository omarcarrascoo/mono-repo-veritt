import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SuppliersRepository } from './suppliers.repository';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly suppliersRepository: SuppliersRepository) {}

  private async ensureBusinessAccess(businessId: string, userId: string) {
    const membership = await this.suppliersRepository.findMembership(businessId, userId);
    if (!membership) {
      throw new ForbiddenException('You do not belong to this business');
    }
    return membership;
  }

  async findAll(businessId: string, userId: string, status?: string) {
    await this.ensureBusinessAccess(businessId, userId);
    return this.suppliersRepository.findAll(businessId, status);
  }

  async findOne(businessId: string, supplierId: string, userId: string) {
    await this.ensureBusinessAccess(businessId, userId);
    const supplier = await this.suppliersRepository.findOne(supplierId);
    if (!supplier || supplier.businessId !== businessId) {
      throw new NotFoundException('Supplier not found');
    }
    return supplier;
  }

  async create(businessId: string, userId: string, dto: CreateSupplierDto) {
    await this.ensureBusinessAccess(businessId, userId);
    return this.suppliersRepository.create(businessId, dto);
  }

  async update(businessId: string, supplierId: string, userId: string, dto: UpdateSupplierDto) {
    await this.ensureBusinessAccess(businessId, userId);
    const supplier = await this.suppliersRepository.findOne(supplierId);
    if (!supplier || supplier.businessId !== businessId) {
      throw new NotFoundException('Supplier not found');
    }
    return this.suppliersRepository.update(supplierId, dto);
  }
}
