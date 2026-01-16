import { Module } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { ConfigModule } from "./config/config.module";
import { AuthModule } from "./auth/auth.module";
import { ChildrenModule } from "./children/children.module";
import { WithdrawalModule } from "./withdrawal/withdrawal.module";
import { NotificationModule } from "./notifications/notification.module";
import { InstitutionsModule } from "./institutions/institutions.module";
@Module({
  imports: [
    // ✅ Config module (provides SecretService)
    ConfigModule,

    // ✅ Rate limiting configuration
    ThrottlerModule.forRoot([
      {
        name: "short",
        ttl: 1000, // 1 second
        limit: 5, // 5 requests per second
      },
      {
        name: "medium",
        ttl: 60000, // 1 minute
        limit: 30, // 30 requests per minute
      },
      {
        name: "long",
        ttl: 900000, // 15 minutes
        limit: 100, // 100 requests per 15 minutes
      },
    ]),
    PrismaModule,
    AuthModule,
    ChildrenModule,
    WithdrawalModule,
    NotificationModule,
    InstitutionsModule,
  ],
  controllers: [AppController],
  providers: [
    // ✅ Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    AppService,
  ],
})
export class AppModule {}
