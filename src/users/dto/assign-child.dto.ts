import { IsString, IsNotEmpty, MinLength, MaxLength } from "class-validator";

export class AssignChildDto {
  @IsString()
  @IsNotEmpty({ message: "El nombre del niño es requerido" })
  @MinLength(3, { message: "El nombre debe tener al menos 3 caracteres" })
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty({ message: "El grado es requerido" })
  @MaxLength(50)
  grade: string;
}
