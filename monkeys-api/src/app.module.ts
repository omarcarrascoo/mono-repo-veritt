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
    PayrollModule,
    StaffModule,
  ],
})
export class AppModule {}
