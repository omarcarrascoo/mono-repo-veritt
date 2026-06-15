import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BusinessesModule } from './businesses/businesses.module';
import { MembershipsModule } from './memberships/memberships.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { StaffModule } from './staff/staff.module';
import { PayrollModule } from './payroll/payroll.module';
import { NotificationsModule } from './notifications/notifications.module';
import { InventoryModule } from './inventory/inventory.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { ProcessesModule } from './processes/processes.module';
import { AreasModule } from './areas/areas.module';
import { TimeTrackingModule } from './time-tracking/time-tracking.module';
import { SalesModule } from './sales/sales.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { SupplierInvoicesModule } from './supplier-invoices/supplier-invoices.module';
import { DailyChainModule } from './daily-chain/daily-chain.module';
import { AmdModule } from './amd/amd.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    BusinessesModule,
    MembershipsModule,
    OnboardingModule,
    NotificationsModule,
    InventoryModule,
    PayrollModule,
    StaffModule,
    AreasModule,
    ProcessesModule,
    TimeTrackingModule,
    PaymentMethodsModule,
    SalesModule,
    SuppliersModule,
    PurchaseOrdersModule,
    ReceiptsModule,
    SupplierInvoicesModule,
    DailyChainModule,
    AmdModule,
  ],
})
export class AppModule {}
