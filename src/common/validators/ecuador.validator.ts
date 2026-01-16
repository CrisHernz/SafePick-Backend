import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

/**
 * Validador de cédula ecuatoriana
 * La cédula ecuatoriana tiene 10 dígitos y un algoritmo de verificación
 */
@ValidatorConstraint({ async: false })
export class IsCedulaEcuatorianaConstraint implements ValidatorConstraintInterface {
  validate(cedula: string): boolean {
    if (!cedula) return true; // Si es opcional y no se proporciona

    // Debe tener exactamente 10 dígitos
    if (!/^\d{10}$/.test(cedula)) {
      return false;
    }

    // Los primeros 2 dígitos corresponden a la provincia (01-24)
    const provincia = parseInt(cedula.substring(0, 2), 10);
    if (provincia < 1 || provincia > 24) {
      return false;
    }

    // El tercer dígito debe ser menor a 6 (personas naturales)
    const tercerDigito = parseInt(cedula.charAt(2), 10);
    if (tercerDigito >= 6) {
      return false;
    }

    // Algoritmo de validación del dígito verificador
    const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let suma = 0;

    for (let i = 0; i < 9; i++) {
      let valor = parseInt(cedula.charAt(i), 10) * coeficientes[i];
      if (valor >= 10) {
        valor -= 9;
      }
      suma += valor;
    }

    const digitoVerificador = parseInt(cedula.charAt(9), 10);
    const residuo = suma % 10;
    const resultado = residuo === 0 ? 0 : 10 - residuo;

    return resultado === digitoVerificador;
  }

  defaultMessage(): string {
    return "La cédula ecuatoriana no es válida. Debe tener 10 dígitos y pasar la validación del dígito verificador.";
  }
}

export function IsCedulaEcuatoriana(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCedulaEcuatorianaConstraint,
    });
  };
}

/**
 * Validador de teléfono ecuatoriano
 * Formatos aceptados:
 * - +593XXXXXXXXX (código país + 9 dígitos)
 * - 09XXXXXXXX (celular nacional)
 * - 0XXXXXXXXX (fijo nacional)
 */
@ValidatorConstraint({ async: false })
export class IsTelefonoEcuatorianoConstraint implements ValidatorConstraintInterface {
  validate(telefono: string): boolean {
    if (!telefono) return true; // Si es opcional y no se proporciona

    // Formato internacional: +593 seguido de 9 dígitos
    // El primer dígito después de +593 puede ser 9 (celular) o 2-7 (fijo por provincia)
    const formatoInternacional = /^\+593[2-79]\d{8}$/;

    // Formato nacional celular: 09 seguido de 8 dígitos
    const formatoNacionalCelular = /^09\d{8}$/;

    // Formato nacional fijo: 0 seguido de código de provincia (2-7) y 7 dígitos
    const formatoNacionalFijo = /^0[2-7]\d{7}$/;

    return (
      formatoInternacional.test(telefono) ||
      formatoNacionalCelular.test(telefono) ||
      formatoNacionalFijo.test(telefono)
    );
  }

  defaultMessage(): string {
    return "El teléfono debe tener formato ecuatoriano válido: +593XXXXXXXXX, 09XXXXXXXX o 0XXXXXXXX";
  }
}

export function IsTelefonoEcuatoriano(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTelefonoEcuatorianoConstraint,
    });
  };
}
