import { Module } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { TelegramWebhookController } from "./telegram-webhook.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [TelegramWebhookController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
