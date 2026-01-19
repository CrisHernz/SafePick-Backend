import {
  IsString,
  IsNotEmpty,
  MaxLength,
  MinLength,
  Matches,
  IsIn,
} from "class-validator";

/**
 * @fileoverview DTO para Creación de Órdenes de Retiro
 * @module common/dtos/create-withdrawal-order.dto
 * @security INPUT_VALIDATION - Validación de datos de retiro escolar
 *
 * @description
 * Data Transfer Object para crear órdenes de retiro de niños.
 * Valida todos los datos del picker (persona autorizada a retirar).
 *
 * ## Validaciones de Seguridad:
 * - childId: Formato de ID válido (solo alfanumérico)
 * - pickerName: 3-100 caracteres (previene overflow)
 * - pickerCedula: Exactamente 10 dígitos numéricos (cédula ecuatoriana)
 * - pickerPhone: Formato telefónico internacional
 * - relationship: Lista cerrada de valores permitidos (previene inyección)
 *
 * ## Relaciones Permitidas:
 * padre, madre, abuelo, abuela, tío, tía, hermano, hermana, otro
 *
 * @example
 * const dto: CreateWithdrawalOrderDto = {
 *   childId: "clm1234567890",
 *   pickerName: "Juan Pérez",
 *   pickerCedula: "1712345678",
 *   pickerPhone: "+593987654321",
 *   relationship: "abuelo"
 * };
 */
export class CreateWithdrawalOrderDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]{10,}$/, { message: "Invalid child ID format" })
  childId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @MinLength(3)
  pickerName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10}$/, {
    message: "La cédula debe tener exactamente 10 dígitos numéricos",
  })
  pickerCedula: string;

  @IsString()
  @IsNotEmpty()
  @Matches(
    /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
    { message: "Invalid phone format" },
  )
  pickerPhone: string;

  @IsString()
  @IsNotEmpty()
  @IsIn([
    "padre",
    "madre",
    "abuelo",
    "abuela",
    "tío",
    "tía",
    "hermano",
    "hermana",
    "otro",
  ])
  relationship: string;
}
