import { SetMetadata } from "@nestjs/common";
import { UserRole } from "@prisma/client";

/**
 * @fileoverview Decorator para definir roles requeridos en endpoints
 * @module common/decorators/roles.decorator
 * @security AUTHORIZATION - Define qué roles pueden acceder a cada endpoint
 *
 * @description
 * Decorador personalizado que permite especificar qué roles de usuario
 * tienen permiso para acceder a un controlador o método específico.
 *
 * ## Funcionamiento:
 * 1. Almacena los roles permitidos como metadatos del método/clase
 * 2. RoleGuard lee estos metadatos para validar el acceso
 * 3. Soporta múltiples roles (OR lógico)
 *
 * ## Roles Disponibles:
 * - UserRole.ADMIN - Administrador del sistema
 * - UserRole.GESTOR - Gestor de institución
 * - UserRole.GUARDIAN - Guardia de seguridad
 * - UserRole.PARENT - Padre de familia
 *
 * ## Ejemplos de Uso:
 * ```typescript
 * // Solo administradores
 * @Roles(UserRole.ADMIN)
 *
 * // Admin o Gestor
 * @Roles(UserRole.ADMIN, UserRole.GESTOR)
 *
 * // Cualquier rol autenticado (sin @Roles = acceso a todos los autenticados)
 * ```
 *
 * @param {...UserRole[]} roles - Lista de roles que tienen acceso
 * @returns {MethodDecorator & ClassDecorator} Decorador aplicable a métodos o clases
 *
 * @see RoleGuard - Guard que valida los roles definidos por este decorador
 */
export const Roles = (...roles: UserRole[]) => SetMetadata("roles", roles);
