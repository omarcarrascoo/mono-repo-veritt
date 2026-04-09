import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AreasRepository } from './areas.repository';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

@Injectable()
export class AreasService {
  constructor(private readonly areasRepository: AreasRepository) {}

  private async ensureBusinessAccess(businessId: string, userId: string) {
    const membership = await this.areasRepository.findMembership(businessId, userId);
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
    return this.areasRepository.findAll(businessId);
  }

  async findOne(businessId: string, areaId: string, userId: string) {
    await this.ensureBusinessAccess(businessId, userId);
    const area = await this.areasRepository.findOne(areaId);
    if (!area || area.businessId !== businessId) {
      throw new NotFoundException('Area not found');
    }
    return area;
  }

  async create(businessId: string, userId: string, dto: CreateAreaDto) {
    await this.ensureManagementAccess(businessId, userId);

    const existing = await this.areasRepository.findByBusinessAndName(businessId, dto.name);
    if (existing) {
      throw new ConflictException('An area with this name already exists');
    }

    if (dto.parentAreaId) {
      const parent = await this.areasRepository.findOne(dto.parentAreaId);
      if (!parent || parent.businessId !== businessId) {
        throw new BadRequestException('Parent area not found in this business');
      }
    }

    return this.areasRepository.create(businessId, dto);
  }

  async update(businessId: string, areaId: string, userId: string, dto: UpdateAreaDto) {
    await this.ensureManagementAccess(businessId, userId);

    const area = await this.areasRepository.findOne(areaId);
    if (!area || area.businessId !== businessId) {
      throw new NotFoundException('Area not found');
    }

    if (dto.parentAreaId) {
      if (dto.parentAreaId === areaId) {
        throw new BadRequestException('An area cannot be its own parent');
      }
      const parent = await this.areasRepository.findOne(dto.parentAreaId);
      if (!parent || parent.businessId !== businessId) {
        throw new BadRequestException('Parent area not found in this business');
      }
    }

    if (dto.name && dto.name !== area.name) {
      const existing = await this.areasRepository.findByBusinessAndName(businessId, dto.name);
      if (existing) {
        throw new ConflictException('An area with this name already exists');
      }
    }

    return this.areasRepository.update(areaId, dto);
  }

  async linkLocation(businessId: string, areaId: string, locationId: string, userId: string) {
    await this.ensureManagementAccess(businessId, userId);

    const area = await this.areasRepository.findOne(areaId);
    if (!area || area.businessId !== businessId) {
      throw new NotFoundException('Area not found');
    }

    const location = await this.areasRepository.findLocation(locationId);
    if (!location || location.businessId !== businessId) {
      throw new NotFoundException('Location not found in this business');
    }

    return this.areasRepository.linkLocation(locationId, areaId);
  }
}
