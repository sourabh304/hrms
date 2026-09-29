import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';
import configuration from './config/configuration.js';
import { buildTypeOrmOptions } from './database/database.config.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { AnnouncementsModule } from './modules/announcements/announcements.module.js';
import { AssetsModule } from './modules/assets/assets.module.js';
import { AttendanceModule } from './modules/attendance/attendance.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { EmployeesModule } from './modules/employees/employees.module.js';
import { EngagementModule } from './modules/engagement/engagement.module.js';
import { ExpensesModule } from './modules/expenses/expenses.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { HelpdeskModule } from './modules/helpdesk/helpdesk.module.js';
import { HolidaysModule } from './modules/holidays/holidays.module.js';
import { LearningModule } from './modules/learning/learning.module.js';
import { LeaveModule } from './modules/leave/leave.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { OffboardingModule } from './modules/offboarding/offboarding.module.js';
import { OnboardingModule } from './modules/onboarding/onboarding.module.js';
import { OrganizationModule } from './modules/organization/organization.module.js';
import { PayrollModule } from './modules/payroll/payroll.module.js';
import { PerformanceModule } from './modules/performance/performance.module.js';
import { RecruitmentModule } from './modules/recruitment/recruitment.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { WorkflowModule } from './modules/workflow/workflow.module.js';

@Module({
  imports: [
    // ── Platform ──
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], cache: true }),
    TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory: buildTypeOrmOptions }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),

    // ── Cross-cutting ──
    HealthModule,
    AuthModule,
    UsersModule,
    NotificationsModule,
    AuditModule,
    WorkflowModule,
    DocumentsModule,

    // ── Core HR ──
    OrganizationModule,
    EmployeesModule,
    HolidaysModule,

    // ── Time ──
    AttendanceModule,
    LeaveModule,

    // ── Pay ──
    PayrollModule,
    ExpensesModule,

    // ── Talent ──
    RecruitmentModule,
    OnboardingModule,
    OffboardingModule,
    PerformanceModule,
    LearningModule,

    // ── Operations & Experience ──
    AssetsModule,
    HelpdeskModule,
    AnnouncementsModule,
    EngagementModule,
    AnalyticsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
