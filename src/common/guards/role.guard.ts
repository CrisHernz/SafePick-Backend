import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "@prisma/client";

/**
 * @fileoverview Role-Based Access Control (RBAC) Guard
 * @module common/guards/role.guard
 * @security AUTHORIZATION - Control de acceso basado en roles de usuario
 *
 * @description
 * Guard que implementa control de acceso basado en roles (RBAC) para proteger
 * endpoints según el rol del usuario autenticado.
 *
 * ## Roles del Sistema:
 * - ADMIN: Acceso total al sistema, gestiona instituciones y gestores
 * - GESTOR: Administra su institución, crea guardias, asigna hijos
 * - GUARDIAN: Escanea QR y valida retiros de niños
 * - PARENT: Crea órdenes de retiro, genera credenciales para pickers
 * - PICKER: Usuario temporal que recoge niños (acceso limitado)
 *
 * ## Funcionamiento:
 * 1. Lee los roles requeridos del decorador @Roles()
 * 2. Verifica que el usuario esté autenticado (req.user existe)
 * 3. Compara el rol del usuario con los roles permitidos
 * 4. Lanza ForbiddenException si no tiene permisos
 *
 * ## Uso:
 * ```typescript
 * @UseGuards(JwtGuard, RoleGuard)
 * @Roles(UserRole.ADMIN, UserRole.GESTOR)
 * @Get('admin-only')
 * async adminMethod() { ... }
 * ```
 *
 * @see Roles - Decorador para especificar roles permitidos
 * @see JwtGuard - Debe usarse antes de RoleGuard para autenticar
 */
@Injectable()
export class RoleGuard implements CanActivate {
  /**
   * Constructor del guard de roles
   * @param {Reflector} reflector - Servicio de NestJS para leer metadatos de decoradores
   */
  constructor(private reflector: Reflector) {}

  /**
   * Determina si el usuario tiene permiso para acceder al recurso
   *
   * @param {ExecutionContext} context - Contexto de ejecución de NestJS
   * @returns {boolean} true si el acceso está permitido
   * @throws {ForbiddenException} Si el usuario no está autenticado o no tiene el rol requerido
   *
   * @security
   * - Valida que exista un usuario autenticado en la petición
   * - Compara roles de manera segura usando includes()
   * - No expone información sensible en mensajes de error
   */
  canActivate(context: ExecutionContext): boolean {
    // Lee los roles requeridos del handler (método) y del controller (clase)
    const requiredRoles =
      this.reflector.get<UserRole[]>("roles", context.getHandler()) ||
      this.reflector.get<UserRole[]>("roles", context.getClass());

    // Si no hay roles definidos, permite el acceso (ruta pública)
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Verificar autenticación
    if (!user) {
      throw new ForbiddenException("User not authenticated");
    }

    // Verificar autorización por rol
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `This action requires one of the following roles: ${requiredRoles.join(", ")}`,
      );
    }

    return true;
  }
}
