import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto, LoginDto } from "../common/dtos";
import * as bcrypt from "bcryptjs";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

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

  // Login para pickers temporales con cédula y código
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

  // Vincular cuenta de Telegram con el usuario
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

  // Obtener perfil del usuario
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
