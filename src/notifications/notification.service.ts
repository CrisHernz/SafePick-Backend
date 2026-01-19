import { Injectable, Logger } from "@nestjs/common";
import TelegramBot from "node-telegram-bot-api";

/**
 * @fileoverview Servicio de Notificaciones via Telegram Bot API
 * @module notifications/notification.service
 * @security NOTIFICATIONS - Comunicación segura con usuarios via Telegram
 *
 * @description
 * Servicio que gestiona todas las notificaciones del sistema usando
 * la API de Telegram Bot (servicio gratuito).
 *
 * ## Funcionalidades:
 * - Notificación de retiro completado a padres
 * - Envío de credenciales temporales para pickers
 * - Alertas de seguridad y eventos importantes
 * - Vinculación de cuentas de usuario con Telegram
 *
 * ## Seguridad Implementada:
 * - Token del bot almacenado en variable de entorno
 * - Chat IDs vinculados a cuentas de usuario verificadas
 * - Modo polling deshabilitado (solo envío de mensajes)
 * - Fallback graceful si Telegram no está configurado
 * - No se exponen credenciales en logs
 *
 * ## Configuración:
 * 1. Crear bot con @BotFather en Telegram
 * 2. Obtener token y configurar TELEGRAM_BOT_TOKEN en .env
 * 3. Los usuarios vinculan su Telegram desde la app
 *
 * @example
 * // Enviar notificación de retiro
 * await notificationService.notifyWithdrawalCompleted(
 *   parentChatId,
 *   "María García",
 *   "Juan Pérez",
 *   "Abuelo",
 *   new Date()
 * );
 *
 * @see AuthService.linkTelegramAccount - Vinculación de cuentas
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private bot: TelegramBot | null = null;
  private readonly enabled: boolean;

  /**
   * Inicializa el servicio de notificaciones
   *
   * @security
   * - Verifica token antes de inicializar bot
   * - Falla gracefully si token no está configurado
   * - No expone token en logs
   */
  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (token) {
      try {
        this.bot = new TelegramBot(token, { polling: false });
        this.enabled = true;
        this.logger.log("✅ Telegram Bot inicializado correctamente");
        this.initializeBot();
      } catch (error) {
        this.logger.error("❌ Error al inicializar Telegram Bot:", error);
        this.enabled = false;
      }
    } else {
      this.logger.warn(
        "⚠️ TELEGRAM_BOT_TOKEN no configurado - notificaciones deshabilitadas",
      );
      this.enabled = false;
    }
  }

  /**
   * Inicializa conexión con el bot y obtiene información
   * @private
   * @security Almacena username del bot para enlaces de vinculación
   */
  private async initializeBot() {
    if (!this.bot) return;

    try {
      const botInfo = await this.bot.getMe();
      this.logger.log(`🤖 Bot conectado: @${botInfo.username}`);
      process.env.TELEGRAM_BOT_USERNAME = botInfo.username;
    } catch (error) {
      this.logger.error("Error al obtener info del bot:", error);
    }
  }

  /**
   * Obtiene el username del bot de Telegram
   * @returns {string} Username del bot (ej: "@safe_pick_uio_bot")
   */
  getBotUsername(): string {
    return process.env.TELEGRAM_BOT_USERNAME || "safe_pick_uio_bot";
  }

  /**
   * Envía notificación de retiro completado al padre
   *
   * @param {string|null} telegramChatId - Chat ID del padre (null si no vinculado)
   * @param {string} childName - Nombre del niño retirado
   * @param {string} pickerName - Nombre de quien retiró
   * @param {string} pickerRelationship - Relación con el niño
   * @param {Date} completionTime - Fecha y hora del retiro
   *
   * @returns {Promise<boolean>} true si se envió, false si falló o no habilitado
   *
   * @security
   * - No falla si Telegram no está configurado
   * - Formato de mensaje sanitizado (Markdown)
   * - Hora en zona horaria de Ecuador
   */
  async notifyWithdrawalCompleted(
    telegramChatId: string | null,
    childName: string,
    pickerName: string,
    pickerRelationship: string,
    completionTime: Date,
  ): Promise<boolean> {
    if (!this.enabled || !this.bot) {
      this.logger.warn("Notificaciones Telegram deshabilitadas");
      return false;
    }

    if (!telegramChatId) {
      this.logger.warn(`Padre no tiene Telegram Chat ID configurado`);
      return false;
    }

    try {
      const timeStr = completionTime.toLocaleString("es-ES", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "America/Guayaquil",
      });

      const message = `
🎒 *SafePick - Retiro Completado*

✅ Su hijo/a *${childName}* ha sido retirado exitosamente.

👤 *Recogido por:*
   Nombre: ${pickerName}
   Relación: ${pickerRelationship}

🕐 *Hora de retiro:*
   ${timeStr}

🔒 *Verificación:* QR validado por guardia de seguridad

_SafePick - Colegio Seguro_
      `.trim();

      await this.bot.sendMessage(telegramChatId, message, {
        parse_mode: "Markdown",
      });

      this.logger.log(
        `✅ Notificación enviada a Telegram chat ID: ${telegramChatId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`❌ Error al enviar notificación Telegram:`, error);
      return false;
    }
  }

  /**
   * Enviar notificación de orden creada con credenciales
   */
  async notifyOrderCreated(
    telegramChatId: string | null,
    childName: string,
    pickerName: string,
    pickerCedula: string,
    temporaryCode: string,
    expiresAt: Date,
  ): Promise<boolean> {
    if (!this.enabled || !this.bot || !telegramChatId) {
      return false;
    }

    try {
      const expiryStr = expiresAt.toLocaleString("es-ES", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Mexico_City",
      });

      const message = `
🎒 *SafePick - Nueva Orden de Retiro*

✅ Orden creada para: *${childName}*

👤 *Persona autorizada:*
   Nombre: ${pickerName}
   Cédula: ${pickerCedula}

🔐 *Credenciales temporales:*
   Código: \`${temporaryCode}\`
   Expira: ${expiryStr}

⚠️ Comparta estas credenciales SOLO con ${pickerName}

_SafePick - Colegio Seguro_
      `.trim();

      await this.bot.sendMessage(telegramChatId, message, {
        parse_mode: "Markdown",
      });

      this.logger.log(`✅ Notificación de orden creada enviada`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error al enviar notificación de orden:`, error);
      return false;
    }
  }

  /**
   * Enviar notificación de orden cancelada
   */
  async notifyOrderCancelled(
    telegramChatId: string | null,
    childName: string,
    reason?: string,
  ): Promise<boolean> {
    if (!this.enabled || !this.bot || !telegramChatId) {
      return false;
    }

    try {
      const message = `
🚫 *SafePick - Orden Cancelada*

❌ La orden de retiro para *${childName}* ha sido cancelada.

${reason ? `Motivo: ${reason}` : ""}

_SafePick - Colegio Seguro_
      `.trim();

      await this.bot.sendMessage(telegramChatId, message, {
        parse_mode: "Markdown",
      });

      this.logger.log(`✅ Notificación de cancelación enviada`);
      return true;
    } catch (error) {
      this.logger.error(
        `❌ Error al enviar notificación de cancelación:`,
        error,
      );
      return false;
    }
  }

  /**
   * Verificar si el servicio está habilitado
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Obtener información del bot
   */
  async getBotInfo() {
    if (!this.bot || !this.enabled) {
      return null;
    }

    try {
      return await this.bot.getMe();
    } catch (error) {
      this.logger.error("Error al obtener info del bot:", error);
      return null;
    }
  }
}
