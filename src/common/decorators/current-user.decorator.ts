import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * @fileoverview Decorator para obtener el usuario actual autenticado
 * @module common/decorators/current-user.decorator
 * @security AUTHENTICATION - Acceso seguro a datos del usuario autenticado
 *
 * @description
 * Decorador de parámetro que extrae el usuario autenticado de la petición HTTP.
 * El usuario es poblado por JwtStrategy después de validar el token JWT.
 *
 * ## Datos Disponibles del Usuario:
 * - id: Identificador único del usuario
 * - email: Correo electrónico
 * - role: Rol del usuario (ADMIN, GESTOR, GUARDIAN, PARENT)
 * - name: Nombre completo
 * - institutionId: ID de la institución asociada (si aplica)
 *
 * ## Ejemplo de Uso:
 * ```typescript
 * @Get('profile')
 * @UseGuards(JwtGuard)
 * async getProfile(@CurrentUser() user: any) {
 *   return { userId: user.id, role: user.role };
 * }
 * ```
 *
 * ## Seguridad:
 * - Solo funciona en rutas protegidas con JwtGuard
 * - Los datos provienen del token JWT validado, no de la petición
 * - Evita que el cliente manipule su identidad
 *
 * @returns {any} Objeto con los datos del usuario autenticado
 *
 * @see JwtGuard - Guard que debe usarse para que el usuario esté disponible
 * @see JwtStrategy - Estrategia que popula req.user
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
