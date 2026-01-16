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
} from "../../common/validators/ecuador.validator";

export class CreateUserByAdminDto {
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
    }
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
