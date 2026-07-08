import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Controller('businesses/:businessId/suppliers')
@UseGuards(JwtAuthGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  findAll(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: { id: string },
    @Query('status') status?: string,
  ) {
    return this.suppliersService.findAll(businessId, user.id, status);
  }

  @Get(':supplierId')
  findOne(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.suppliersService.findOne(businessId, supplierId, user.id);
  }

  @Post()
  create(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSupplierDto,
  ) {
    return this.suppliersService.create(businessId, user.id, dto);
  }

  @Patch(':supplierId')
  update(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(businessId, supplierId, user.id, dto);
  }
}
