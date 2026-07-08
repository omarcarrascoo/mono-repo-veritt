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
import { SupplierInvoicesService } from './supplier-invoices.service';
import { CreateSupplierInvoiceDto } from './dto/create-supplier-invoice.dto';
import { UpdateSupplierInvoiceDto } from './dto/update-supplier-invoice.dto';
import { DisputeSupplierInvoiceDto } from './dto/dispute-supplier-invoice.dto';
import { DeleteSupplierInvoiceDto } from './dto/delete-supplier-invoice.dto';

@Controller('businesses/:businessId/supplier-invoices')
@UseGuards(JwtAuthGuard)
export class SupplierInvoicesController {
  constructor(private readonly invoicesService: SupplierInvoicesService) {}

  @Post()
  create(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSupplierInvoiceDto,
  ) {
    return this.invoicesService.create(businessId, user.id, dto);
  }

  @Get()
  findAll(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @CurrentUser() user: { id: string },
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
  ) {
    return this.invoicesService.findAll(businessId, user.id, { supplierId, status });
  }

  @Get('receipt-total/:receiptId')
  getReceiptTotal(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.invoicesService.getReceiptTotal(businessId, receiptId, user.id);
  }

  @Get(':invoiceId')
  findOne(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.invoicesService.findOne(businessId, invoiceId, user.id);
  }

  @Patch(':invoiceId')
  update(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateSupplierInvoiceDto,
  ) {
    return this.invoicesService.update(businessId, invoiceId, user.id, dto);
  }

  @Post(':invoiceId/verify')
  verify(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.invoicesService.verify(businessId, invoiceId, user.id);
  }

  @Post(':invoiceId/dispute')
  dispute(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: DisputeSupplierInvoiceDto,
  ) {
    return this.invoicesService.dispute(businessId, invoiceId, user.id, dto);
  }

  @Post(':invoiceId/delete')
  softDelete(
    @Param('businessId', ParseUUIDPipe) businessId: string,
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: DeleteSupplierInvoiceDto,
  ) {
    return this.invoicesService.softDelete(businessId, invoiceId, user.id, dto);
  }
}
