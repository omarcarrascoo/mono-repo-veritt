import { Module } from '@nestjs/common';
import { SupplierInvoicesController } from './supplier-invoices.controller';
import { SupplierInvoicesService } from './supplier-invoices.service';
import { SupplierInvoicesRepository } from './supplier-invoices.repository';

@Module({
  controllers: [SupplierInvoicesController],
  providers: [SupplierInvoicesService, SupplierInvoicesRepository],
  exports: [SupplierInvoicesService],
})
export class SupplierInvoicesModule {}
