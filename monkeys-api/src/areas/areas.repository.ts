import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

@Injectable()
export class AreasRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMembership(businessId: string, userId: string) {
    return this.prisma.businessMembership.findFirst({
      where: { businessId, userId, status: 'ACTIVE' },
    });
  }

  findAll(businessId: string) {
    return this.prisma.area.findMany({
      where: { businessId },
      include: { childAreas: true, inventoryLocations: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.area.findUnique({
      where: { id },
      include: {
        childAreas: true,
        inventoryLocations: true,
        parentArea: true,
      },
    });
  }

  findByBusinessAndName(businessId: string, name: string) {
    return this.prisma.area.findUnique({
      where: { businessId_name: { businessId, name } },
    });
  }

  create(businessId: string, dto: CreateAreaDto) {
    return this.prisma.area.create({
      data: {
        businessId,
        name: dto.name,
        type: dto.type as any,
        description: dto.description,
        parentAreaId: dto.parentAreaId,
      },
      include: { childAreas: true, inventoryLocations: true },
    });
  }

  update(id: string, dto: UpdateAreaDto) {
    return this.prisma.area.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type as any,
        description: dto.description,
        parentAreaId: dto.parentAreaId,
        status: dto.status as any,
      },
      include: { childAreas: true, inventoryLocations: true },
    });
  }

  linkLocation(locationId: string, areaId: string) {
    return this.prisma.inventoryLocation.update({
      where: { id: locationId },
      data: { areaId },
    });
  }

  findLocation(locationId: string) {
    return this.prisma.inventoryLocation.findUnique({
      where: { id: locationId },
    });
  }
}
