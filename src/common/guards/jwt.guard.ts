import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * @fileoverview JWT Authentication Guard
 * @module common/guards/jwt.guard
 * @security AUTHENTICATION - Protege rutas requiriendo token JWT válido
 *
 * @description
 * Guard de autenticación que extiende AuthGuard de Passport.js para validar
 * tokens JWT en cada petición a rutas protegidas.
 *
 * ## Funcionamiento de Seguridad:
 * 1. Intercepta todas las peticiones a rutas decoradas con @UseGuards(JwtGuard)
 * 2. Extrae el token JWT del header Authorization (Bearer token)
 * 3. Valida la firma del token usando JWT_SECRET
 * 4. Verifica que el token no haya expirado
 * 5. Ejecuta JwtStrategy.validate() para poblar req.user
 *
 * ## Uso:
 * ```typescript
 * @UseGuards(JwtGuard)
 * @Get('protected-route')
 * async protectedMethod() { ... }
 * ```
 *
 * @see JwtStrategy - Estrategia de validación del token
 * @see SecretsService - Servicio que proporciona JWT_SECRET validado
 */
@Injectable()
export class JwtGuard extends AuthGuard("jwt") {}
