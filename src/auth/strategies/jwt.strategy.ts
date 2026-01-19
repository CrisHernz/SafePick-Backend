import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AuthService } from "../auth.service";
import { SecretsService } from "../../config/secrets.service";

/**
 * @fileoverview JWT Authentication Strategy
 * @module auth/strategies/jwt.strategy
 * @security AUTHENTICATION - Estrategia de validación de tokens JWT
 *
 * @description
 * Implementa la estrategia de autenticación JWT usando Passport.js.
 * Valida tokens JWT y extrae la información del usuario para cada petición autenticada.
 *
 * ## Flujo de Validación:
 * 1. JwtGuard intercepta la petición
 * 2. Extrae el token del header Authorization (Bearer scheme)
 * 3. Verifica la firma del token usando JWT_SECRET de SecretsService
 * 4. Valida que el token no haya expirado
 * 5. Ejecuta validate() para poblar req.user con datos del usuario
 *
 * ## Tipos de Usuarios Soportados:
 * - Usuarios normales: Se validan contra la base de datos
 * - Pickers temporales: Se validan desde el payload del token (type: "temporary")
 *
 * ## Seguridad Implementada:
 * - JWT_SECRET validado por SecretsService (mínimo 32 caracteres)
 * - Token extraído solo del header Authorization
 * - Expiración de tokens habilitada (ignoreExpiration: false)
 * - Validación de usuario en BD para cada petición
 *
 * @see JwtGuard - Guard que activa esta estrategia
 * @see SecretsService - Proporciona JWT_SECRET validado
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * Constructor de la estrategia JWT
   *
   * @param {AuthService} authService - Servicio de autenticación para validar usuarios
   * @param {SecretsService} secretsService - Servicio para obtener JWT_SECRET seguro
   *
   * @security
   * - JWT_SECRET se obtiene de SecretsService que valida:
   *   - Que exista la variable de entorno
   *   - Que tenga mínimo 32 caracteres
   *   - Que no sea un valor por defecto/placeholder
   */
  constructor(
    private authService: AuthService,
    private secretsService: SecretsService,
  ) {
    const secret = secretsService.getJwtSecret();
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret, // ✅ SECURE: Validated secret from SecretsService
    });
  }

  /**
   * Valida el payload del token JWT y retorna los datos del usuario
   *
   * @param {any} payload - Payload decodificado del token JWT
   * @param {string} payload.sub - ID del usuario o picker
   * @param {string} payload.email - Email del usuario (usuarios normales)
   * @param {string} payload.role - Rol del usuario
   * @param {string} [payload.type] - Tipo de token ("temporary" para pickers)
   * @param {string} [payload.cedula] - Cédula del picker (solo pickers)
   * @param {string} [payload.orderId] - ID de la orden (solo pickers)
   *
   * @returns {Promise<object>} Datos del usuario para req.user
   * @throws {Error} Si el usuario no existe en la base de datos
   *
   * @security
   * - Pickers temporales: Solo acceso a su orden específica
   * - Usuarios normales: Se validan contra BD en cada petición
   * - institutionId incluido para validación de acceso por institución
   */
  async validate(payload: any) {
    // Si es un picker temporal (tiene type: "temporary")
    if (payload.type === "temporary" && payload.role === "PICKER") {
      return {
        id: payload.sub,
        cedula: payload.cedula,
        role: payload.role,
        type: payload.type,
        orderId: payload.orderId,
      };
    }

    // Si es un usuario normal
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new Error("User not found");
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      institutionId: user.institutionId,
    };
  }
}
