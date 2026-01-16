import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEmail,
  MinLength,
  MaxLength,
} from "class-validator";

export class CreateInstitutionDto {
  @IsString()
  @IsNotEmpty({ message: "El nombre es requerido" })
  @MinLength(3, { message: "El nombre debe tener al menos 3 caracteres" })
  @MaxLength(100, { message: "El nombre no puede exceder 100 caracteres" })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: "Email inválido" })
  email?: string;
}
