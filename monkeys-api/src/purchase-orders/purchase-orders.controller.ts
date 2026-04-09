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
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

@Controller('businesses/:businessId/purchase-orders')
@UseGuards(JwtAuthGuard)
export class PurchaseOrdersController {
  constructor(private readonly poService: PurchaseOrdersService) {}

  @Post()
  create(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.poService.create(businessId, user.id, dto);
  }

  @Get()
  findAll(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: { id: string },
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.poService.findAll(businessId, user.id, { status, supplierId });
  }

  @Get(':poId')
  findOne(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('poId', ParseUUIDPipe) poId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.poService.findOne(businessId, poId, user.id);
  }

  @Patch(':poId')
  update(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('poId', ParseUUIDPipe) poId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.poService.update(businessId, poId, user.id, dto);
  }

  @Post(':poId/send')
  send(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('poId', ParseUUIDPipe) poId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.poService.send(businessId, poId, user.id);
  }

  @Post(':poId/cancel')
  cancel(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('poId', ParseUUIDPipe) poId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.poService.cancel(businessId, poId, user.id);
  }
}
