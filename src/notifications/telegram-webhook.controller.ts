import { Controller, Post, Body, Logger, HttpCode } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Webhook para recibir actualizaciones de Telegram Bot
 * Este endpoint captura automáticamente el chat ID cuando un usuario
 * inicia conversación con el bot
 */
@Controller("telegram")
export class TelegramWebhookController {
  private readonly logger = new Logger(TelegramWebhookController.name);

  constructor(private prisma: PrismaService) {}

  @Post("webhook")
  @HttpCode(200)
  async handleWebhook(@Body() update: any) {
    try {
      // Verificar si hay un mensaje
      if (!update.message) {
        return { ok: true };
      }

      const chatId = update.message.chat.id.toString();
      const text = update.message.text;
      const username = update.message.from.username;
      const firstName = update.message.from.first_name;

      this.logger.log(
        `📨 Mensaje de @${username || "unknown"} (${firstName}): ${text}`
      );

      // Si el mensaje es /start o contiene un código de vinculación
      if (text?.startsWith("/start")) {
        const parts = text.split(" ");

        // Si viene con código: /start USER_ID_12345
        if (parts.length > 1) {
          const userId = parts[1].replace("USER_ID_", "");

          try {
            await this.prisma.user.update({
              where: { id: userId },
              data: { telegramChatId: chatId },
            });

            this.logger.log(
              `✅ Usuario ${userId} vinculado con chat ID ${chatId}`
            );
          } catch (error) {
            this.logger.error(`❌ Error vinculando usuario:`, error);
          }
        }
      }

      return { ok: true };
    } catch (error) {
      this.logger.error("Error procesando webhook:", error);
      return { ok: true }; // Siempre responder 200 para evitar reintentos
    }
  }
}
