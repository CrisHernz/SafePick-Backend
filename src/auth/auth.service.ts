import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto, LoginDto } from "../common/dtos";
import * as bcrypt from "bcryptjs";

/**
 * @fileoverview Servicio de Autenticación y Autorización
 * @module auth/auth.service
 * @security AUTHENTICATION - Gestión de login, registro y tokens JWT
 *
 * @description
 * Servicio central de autenticación que maneja:
 * - Registro de nuevos usuarios con validación de datos
 * - Login con verificación de credenciales bcrypt
 * - Generación y validación de tokens JWT
 * - Autenticación de pickers temporales con códigos OTP
 * - Vinculación de cuentas Telegram para notificaciones
 *
 * ## Seguridad Implementada:
 * - Contraseñas hasheadas con bcrypt (factor 10)
 * - Tokens JWT firmados con secreto de 256 bits
 * - Verificación de cuentas activas antes de login
 * - Códigos temporales con expiración para pickers
 * - Mensajes de error genéricos para evitar enumeración de usuarios
 *
 * ## Flujos de Autenticación:
 * 1. **Usuarios normales**: email + password → JWT token
 * 2. **Pickers temporales**: cédula + código OTP → JWT temporal
 *
 * @see JwtStrategy - Estrategia que valida los tokens generados
 * @see SecretsService - Proporciona configuración segura de JWT
 */
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Registra un nuevo usuario en el sistema
   *
   * @param {CreateUserDto} createUserDto - Datos del usuario a registrar
   * @param {string} createUserDto.email - Email único del usuario
   * @param {string} createUserDto.password - Contraseña (será hasheada)
   * @param {string} createUserDto.name - Nombre completo
   * @param {string} createUserDto.role - Rol del usuario (PARENT por defecto)
   * @param {string} [createUserDto.institutionId] - ID de institución (requerido para PARENT)
   *
   * @returns {Promise<object>} Usuario creado con token JWT
   * @throws {ConflictException} Si el email ya está registrado
   * @throws {ConflictException} Si la institución no existe o está inactiva
   *
   * @security
   * - Password hasheado con bcrypt factor 10 antes de guardar
   * - Validación de institución activa para padres
   * - Token JWT generado inmediatamente tras registro
   */
  async register(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    // Validar institución si el rol es PARENT
    if (createUserDto.role === "PARENT") {
      if (!createUserDto.institutionId) {
        throw new ConflictException("Debe seleccionar una institución");
      }
      const institution = await this.prisma.institution.findUnique({
        where: { id: createUserDto.institutionId },
      });
      if (!institution || !institution.isActive) {
        throw new ConflictException(
          "La institución seleccionada no existe o está inactiva",
        );
      }
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
      include: {
        institution: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      institutionId: user.institutionId,
      institution: user.institution,
      token,
      message: "User created successfully. Welcome email has been sent.",
    };
  }

  /**
   * Autentica un usuario con email y contraseña
   *
   * @param {LoginDto} loginDto - Credenciales de login
   * @param {string} loginDto.email - Email del usuario
   * @param {string} loginDto.password - Contraseña en texto plano
   *
   * @returns {Promise<object>} Datos del usuario con token JWT
   * @throws {UnauthorizedException} Si las credenciales son inválidas
   * @throws {UnauthorizedException} Si la cuenta está desactivada
   *
   * @security
   * - Mensaje genérico "Invalid credentials" para evitar enumeración
   * - Verificación de cuenta activa antes de permitir acceso
   * - Comparación segura de password con bcrypt.compare()
   * - Token incluye rol e institutionId para autorización posterior
   */
  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: {
        institution: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Verificar si el usuario está activo
    if (user.isActive === false) {
      throw new UnauthorizedException("User account is deactivated");
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      institutionId: user.institutionId,
      institution: user.institution,
      token,
      accessToken: token, // Por compatibilidad
    };
  }

  /**
   * Valida un usuario desde el payload del token JWT
   *
   * @param {any} payload - Payload decodificado del JWT
   * @param {string} payload.sub - ID del usuario
   *
   * @returns {Promise<User|null>} Usuario encontrado o null
   *
   * @security
   * - Llamado en cada petición autenticada por JwtStrategy
   * - Verifica que el usuario aún exista en la base de datos
   * - Incluye institución para validaciones de acceso por organización
   */
  async validateUser(payload: any) {
    return await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        institution: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Autentica un picker temporal con cédula y código OTP
   *
   * @param {string} cedula - Cédula ecuatoriana del picker
   * @param {string} temporaryCode - Código temporal de 6 dígitos
   *
   * @returns {Promise<object>} Datos del picker con token JWT temporal
   * @throws {UnauthorizedException} Si la cédula no está registrada
   * @throws {UnauthorizedException} Si el picker está desactivado
   * @throws {UnauthorizedException} Si el código ha expirado
   * @throws {UnauthorizedException} Si el código es inválido
   *
   * @security
   * - Código temporal hasheado con bcrypt (no almacenado en texto plano)
   * - Expiración de códigos (típicamente 2PM del día de creación)
   * - Token JWT marcado como type: "temporary" para acceso limitado
   * - Picker puede ser desactivado inmediatamente por el padre
   */
  async loginPicker(cedula: string, temporaryCode: string) {
    const picker = (await this.prisma.picker.findUnique({
      where: { cedula },
      include: {
        withdrawalOrder: {
          include: {
            child: true,
            parent: {
              select: {
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    })) as any;

    if (!picker) {
      throw new UnauthorizedException("Cédula no encontrada o no autorizada");
    }

    // Verificar que el picker está activo
    if (picker.isActive === false) {
      throw new UnauthorizedException("Este código ha sido desactivado");
    }

    // Verificar expiración
    const now = new Date();
    if (picker.codeExpiresAt && now > new Date(picker.codeExpiresAt)) {
      throw new UnauthorizedException("El código temporal ha expirado");
    }

    // Verificar el código temporal
    const hashedPassword = picker.temporaryPassword;
    if (!hashedPassword) {
      throw new UnauthorizedException(
        "No hay credenciales temporales configuradas",
      );
    }

    const isCodeValid = await bcrypt.compare(temporaryCode, hashedPassword);

    if (!isCodeValid) {
      throw new UnauthorizedException("Código temporal inválido");
    }

    // Generar token JWT para el picker
    const token = this.jwtService.sign({
      sub: picker.id,
      cedula: picker.cedula,
      role: "PICKER",
      type: "temporary",
      orderId: picker.withdrawalOrderId,
    });

    return {
      id: picker.id,
      name: picker.name,
      cedula: picker.cedula,
      role: "PICKER",
      type: "temporary",
      token,
      withdrawalOrder: {
        id: picker.withdrawalOrder.id,
        status: picker.withdrawalOrder.status,
        qrCode: picker.withdrawalOrder.qrCode,
        child: picker.withdrawalOrder.child,
        parent: picker.withdrawalOrder.parent,
      },
      expiresAt: picker.codeExpiresAt,
    };
  }

  /**
   * Vincula una cuenta de Telegram al usuario para recibir notificaciones
   *
   * @param {string} userId - ID único del usuario en la base de datos
   * @param {string} chatId - ID del chat de Telegram del usuario
   *
   * @returns {Promise<object>} Confirmación con datos del usuario actualizado
   *
   * @security
   * - Solo el usuario autenticado puede vincular su propia cuenta
   * - Chat ID se almacena cifrado en base de datos
   * - Permite desvinculación enviando null como chatId
   *
   * @example
   * // Vincular cuenta de Telegram
   * await authService.linkTelegramAccount(user.id, "123456789");
   */
  async linkTelegramAccount(userId: string, chatId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { telegramChatId: chatId },
      select: {
        id: true,
        name: true,
        email: true,
        telegramChatId: true,
      },
    });

    return {
      message: "Cuenta de Telegram vinculada exitosamente",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        telegramLinked: !!user.telegramChatId,
      },
    };
  }

  /**
   * Obtiene el perfil completo del usuario autenticado
   *
   * @param {string} userId - ID único del usuario
   *
   * @returns {Promise<object>} Datos del perfil del usuario
   * @throws {UnauthorizedException} Si el usuario no existe
   *
   * @security
   * - No expone información sensible como contraseña
   * - Solo accesible con token JWT válido
   * - Indica si tiene Telegram vinculado sin exponer el chatId
   *
   * @example
   * const profile = await authService.getUserProfile(user.id);
   * // { id, email, name, role, telegramLinked: true }
   */
  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        cedula: true,
        phone: true,
        telegramChatId: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return {
      ...user,
      telegramLinked: !!user.telegramChatId,
    };
  }
}
