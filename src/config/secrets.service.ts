import { Injectable } from "@nestjs/common";

/**
 * @fileoverview Servicio de Gestión de Secretos y Configuración Segura
 * @module config/secrets.service
 * @security CONFIGURATION - Validación y gestión segura de variables de entorno
 *
 * @description
 * Servicio centralizado para acceder y validar configuraciones sensibles del sistema.
 * Garantiza que todas las variables de entorno críticas estén correctamente configuradas
 * antes de que la aplicación las utilice.
 *
 * ## Responsabilidades de Seguridad:
 * 1. Validar que JWT_SECRET exista y sea suficientemente seguro
 * 2. Detectar uso de valores por defecto/placeholder en producción
 * 3. Configurar tiempos de expiración apropiados según el entorno
 * 4. Gestionar orígenes CORS permitidos
 *
 * ## Variables de Entorno Gestionadas:
 * - JWT_SECRET: Secreto para firmar tokens JWT (mínimo 32 caracteres)
 * - JWT_EXPIRATION: Tiempo de expiración de tokens
 * - ALLOWED_ORIGINS: Orígenes permitidos para CORS
 * - NODE_ENV: Entorno de ejecución
 *
 * @example
 * // Uso en otros servicios
 * const secret = secretsService.getJwtSecret();
 * const expiration = secretsService.getJwtExpiration();
 */
@Injectable()
export class SecretsService {
  /**
   * Obtiene y valida el secreto JWT
   *
   * @returns {string} JWT_SECRET validado
   * @throws {Error} Si JWT_SECRET no está configurado
   * @throws {Error} Si JWT_SECRET tiene menos de 32 caracteres
   * @throws {Error} Si JWT_SECRET usa un valor placeholder/por defecto
   *
   * @security
   * - Valida longitud mínima de 32 caracteres (256 bits)
   * - Detecta valores placeholder comunes que no deben usarse
   * - Falla rápido si la configuración es insegura
   *
   * @example
   * // Generar un JWT_SECRET seguro:
   * // node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   */
  getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error(
        "❌ JWT_SECRET not configured. Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }

    if (secret.length < 32) {
      throw new Error(
        "❌ JWT_SECRET must be at least 32 characters (64 hex digits)",
      );
    }

    if (
      secret.includes("your-super-secret") ||
      secret.includes("change-in-production") ||
      secret.includes("change-this")
    ) {
      throw new Error(
        "❌ JWT_SECRET is using default/placeholder value. CHANGE IT IMMEDIATELY!",
      );
    }

    return secret;
  }

  /**
   * Obtiene el tiempo de expiración del token JWT
   *
   * @returns {string} Tiempo de expiración en segundos
   *
   * @security
   * - Desarrollo: 24 horas (86400s) para facilitar pruebas
   * - Producción: 15 minutos (900s) para mayor seguridad
   * - Configurable via JWT_EXPIRATION
   */
  getJwtExpiration(): string {
    // En desarrollo 24 horas, en producción 15 minutos
    const defaultExpiration =
      this.getEnvironment() === "development" ? "86400" : "900";
    return process.env.JWT_EXPIRATION || defaultExpiration;
  }

  /**
   * Obtiene los orígenes permitidos para CORS
   *
   * @returns {string[]} Array de URLs permitidas para CORS
   *
   * @security
   * - Define qué dominios pueden hacer peticiones al API
   * - Por defecto solo localhost para desarrollo
   * - En producción debe configurarse ALLOWED_ORIGINS con dominios específicos
   */
  getAllowedOrigins(): string[] {
    const origins = process.env.ALLOWED_ORIGINS || "http://localhost:3001";
    return origins.split(",").map((o) => o.trim());
  }

  /**
   * Obtiene el entorno de ejecución actual
   *
   * @returns {"development" | "production" | "test"} Entorno actual
   */
  getEnvironment(): "development" | "production" | "test" {
    return (process.env.NODE_ENV || "development") as
      | "development"
      | "production"
      | "test";
  }

  /**
   * Verifica si la aplicación está en producción
   *
   * @returns {boolean} true si NODE_ENV es "production"
   *
   * @security
   * - Usado para habilitar/deshabilitar características según el entorno
   * - En producción se aplican políticas de seguridad más estrictas
   */
  isProduction(): boolean {
    return this.getEnvironment() === "production";
  }
}
