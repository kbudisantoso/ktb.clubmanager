import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { SettingsModule } from './settings/settings.module';
import { AdminModule } from './admin/admin.module';
import { ClubsModule } from './clubs/clubs.module';
import { NumberRangesModule } from './number-ranges/number-ranges.module';
import { MembersModule } from './members/members.module';
import { MeModule } from './me/me.module';
import { CommonModule } from './common/common.module';
import { SessionAuthGuard } from './auth/guards/session-auth.guard.js';
import { SuperAdminGuard } from './common/guards/super-admin.guard.js';
import { ClubContextGuard } from './common/guards/club-context.guard.js';
import { TierGuard } from './common/guards/tier.guard.js';
import { PermissionGuard } from './common/guards/permission.guard.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    SettingsModule,
    AuthModule,
    AdminModule,
    MeModule,
    ClubsModule,
    NumberRangesModule,
    MembersModule,
    HealthModule,
  ],
  providers: [
    // Guards execute in registration order:
    // 1. SessionAuthGuard - Is user authenticated?
    // 2. SuperAdminGuard - Is user a Super Admin? (for @RequireSuperAdmin endpoints)
    // 3. ClubContextGuard - Does user have club access?
    // 4. TierGuard - Is feature enabled in club's tier?
    // 5. PermissionGuard - Does user's role have required permission?
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: SuperAdminGuard },
    { provide: APP_GUARD, useClass: ClubContextGuard },
    { provide: APP_GUARD, useClass: TierGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
