import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

/**
 * @fileoverview Validadores Personalizados para Datos Ecuatorianos
 * @module common/validators/ecuador.validator
 * @security INPUT_VALIDATION - Validación específica de documentos ecuatorianos
 *
 * @description
 * Validadores personalizados de class-validator para datos específicos de Ecuador.
 * Implementan algoritmos oficiales de validación de documentos de identidad.
 *
 * ## Validadores Incluidos:
 * - IsCedulaEcuatoriana: Valida cédula con algoritmo módulo 10
 * - IsTelefonoEcuatoriano: Valida formatos telefónicos nacionales
 *
 * ## Seguridad Implementada:
 * - Validación de formato antes de procesamiento
 * - Algoritmo oficial del Registro Civil de Ecuador
 * - Prevención de inyección de caracteres especiales
 * - Solo permite dígitos numéricos
 *
 * @see CreateUserDto - Usa estos validadores para registro
 */

/**
 * Validador de cédula ecuatoriana con algoritmo módulo 10
 *
 * La cédula ecuatoriana consta de 10 dígitos:
 * - Dígitos 1-2: Código de provincia (01-24)
 * - Dígito 3: Tipo de documento (0-5 = persona natural)
 * - Dígitos 4-9: Número secuencial
 * - Dígito 10: Dígito verificador (algoritmo módulo 10)
 *
 * @security
 * - Valida formato estricto (solo 10 dígitos)
 * - Verifica código de provincia válido
 * - Aplica algoritmo del Registro Civil
 * - Opcional: retorna true si no se proporciona valor
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

/**
 * Decorador para aplicar validación de cédula ecuatoriana
 *
 * @param {ValidationOptions} [validationOptions] - Opciones de validación
 * @returns {PropertyDecorator} Decorador para aplicar al campo
 *
 * @example
 * class UserDto {
 *   @IsCedulaEcuatoriana({ message: 'Cédula inválida' })
 *   cedula: string;
 * }
 */
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
 *
 * Formatos aceptados:
 * - +593XXXXXXXXX: Formato internacional (código país + 9 dígitos)
 * - 09XXXXXXXX: Celular nacional (10 dígitos, empieza con 09)
 * - 0XXXXXXXX: Fijo nacional (9 dígitos, código de área 2-7)
 *
 * @security
 * - Valida formato estricto de teléfono
 * - Previene inyección de caracteres especiales
 * - Solo permite dígitos y símbolo +
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
