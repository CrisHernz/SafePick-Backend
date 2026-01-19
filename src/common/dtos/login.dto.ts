import { IsEmail, IsString, MinLength } from "class-validator";

/**
 * @fileoverview DTO para Autenticación de Usuarios
 * @module common/dtos/login.dto
 * @security INPUT_VALIDATION - Validación de credenciales de login
 *
 * @description
 * Data Transfer Object para el proceso de autenticación.
 * Valida formato básico antes de verificar credenciales.
 *
 * ## Validaciones:
 * - Email: Formato válido (previene inyección)
 * - Password: Mínimo 6 caracteres (filtro básico)
 *
 * ## Seguridad:
 * - No valida existencia de usuario (previene enumeración)
 * - Mensajes de error genéricos en backend
 * - Password NO se logea en ningún momento
 *
 * @example
 * const dto: LoginDto = {
 *   email: "usuario@example.com",
 *   password: "Password123!"
 * };
 */
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
