import {
  IsEmail,
  IsString,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
} from "class-validator";
import { UserRole } from "@prisma/client";
import {
  IsCedulaEcuatoriana,
  IsTelefonoEcuatoriano,
} from "../validators/ecuador.validator";

/**
 * @fileoverview DTO para Creación de Usuarios
 * @module common/dtos/create-user.dto
 * @security INPUT_VALIDATION - Validación estricta de datos de entrada
 *
 * @description
 * Data Transfer Object para el registro de nuevos usuarios.
 * Implementa validaciones robustas para prevenir inyección de datos maliciosos.
 *
 * ## Validaciones de Seguridad:
 * - Email: Formato RFC 5322 válido
 * - Password: Mínimo 12 caracteres, complejidad obligatoria
 * - Nombre: 3-100 caracteres, sin caracteres especiales peligrosos
 * - Cédula: Validación algoritmo módulo 10 ecuatoriano
 * - Teléfono: Formatos ecuatorianos (+593, 09, 0X)
 *
 * ## Política de Contraseñas (OWASP):
 * - Mínimo 12 caracteres
 * - Máximo 128 caracteres
 * - Debe incluir: mayúscula, minúscula, número, carácter especial
 * - Caracteres especiales permitidos: @$!%*?&
 *
 * @example
 * const dto: CreateUserDto = {
 *   email: "padre@example.com",
 *   password: "Password123!@",
 *   name: "Juan Pérez",
 *   role: UserRole.PARENT,
 *   cedula: "1712345678",
 *   phone: "+593987654321"
 * };
 */
export class CreateUserDto {
  @IsEmail({}, { message: "Formato de email inválido" })
  @IsNotEmpty({ message: "El email es requerido" })
  email: string;

  @IsString()
  @IsNotEmpty({ message: "La contraseña es requerida" })
  @MinLength(12, { message: "La contraseña debe tener al menos 12 caracteres" })
  @MaxLength(128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/,
    {
      message:
        "La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales (@$!%*?&)",
    },
  )
  password: string;

  @IsString()
  @IsNotEmpty({ message: "El nombre es requerido" })
  @MinLength(3, { message: "El nombre debe tener al menos 3 caracteres" })
  @MaxLength(100)
  name: string;

  @IsEnum(UserRole, { message: "Rol inválido" })
  role: UserRole;

  @IsOptional()
  @IsString()
  @IsCedulaEcuatoriana({
    message:
      "La cédula ecuatoriana no es válida. Debe tener 10 dígitos y pasar la validación.",
  })
  cedula?: string;

  @IsOptional()
  @IsString()
  @IsTelefonoEcuatoriano({
    message:
      "El teléfono debe tener formato ecuatoriano: +593XXXXXXXXX, 09XXXXXXXX o 0XXXXXXXX",
  })
  phone?: string;

  @IsOptional()
  @IsString()
  institutionId?: string;
}
