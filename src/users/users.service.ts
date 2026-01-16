import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Obtener todos los usuarios (para admin)
  async findAll(filters?: {
    role?: string;
    institutionId?: string;
    isActive?: boolean;
  }) {
    const where: any = {};

    if (filters?.role) {
      where.role = filters.role;
    }
    if (filters?.institutionId) {
      where.institutionId = filters.institutionId;
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        cedula: true,
        phone: true,
        role: true,
        isActive: true,
        institutionId: true,
        createdAt: true,
        institution: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Obtener gestores (para admin)
  async findGestores() {
    return this.prisma.user.findMany({
      where: { role: UserRole.GESTOR },
      select: {
        id: true,
        name: true,
        email: true,
        cedula: true,
        phone: true,
        role: true,
        isActive: true,
        institutionId: true,
        createdAt: true,
        institution: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Obtener un usuario por ID
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        cedula: true,
        phone: true,
        role: true,
        isActive: true,
        institutionId: true,
        createdAt: true,
        institution: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            grade: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    return user;
  }

  // Crear un nuevo usuario (gestor crea guardias, admin crea gestores)
  async createUser(
    data: {
      email: string;
      password: string;
      name: string;
      role: UserRole;
      cedula?: string;
      phone?: string;
      institutionId?: string;
    },
    currentUser: { id: string; role: UserRole; institutionId?: string }
  ) {
    // Validar que el rol del creador permite crear el rol solicitado
    if (currentUser.role === UserRole.GESTOR) {
      if (data.role !== UserRole.GUARDIAN) {
        throw new ForbiddenException("Los gestores solo pueden crear guardias");
      }
      // Asignar la institución del gestor al guardia
      data.institutionId = currentUser.institutionId;
    } else if (currentUser.role === UserRole.ADMIN) {
      // Admin puede crear cualquier tipo de usuario
    } else {
      throw new ForbiddenException("No tiene permisos para crear usuarios");
    }

    // Verificar email único
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      throw new ConflictException("El email ya está registrado");
    }

    // Verificar cédula única si se proporciona
    if (data.cedula) {
      const existingCedula = await this.prisma.user.findUnique({
        where: { cedula: data.cedula },
      });
      if (existingCedula) {
        throw new ConflictException("La cédula ya está registrada");
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        cedula: true,
        phone: true,
        role: true,
        isActive: true,
        institutionId: true,
        createdAt: true,
        institution: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  // Actualizar usuario
  async updateUser(
    id: string,
    data: {
      name?: string;
      phone?: string;
      institutionId?: string;
    },
    currentUser: { id: string; role: UserRole; institutionId?: string }
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    // Validar permisos
    if (currentUser.role === UserRole.GESTOR) {
      // Gestor solo puede actualizar usuarios de su institución
      if (user.institutionId !== currentUser.institutionId) {
        throw new ForbiddenException(
          "No tiene permisos para modificar este usuario"
        );
      }
      // No puede cambiar la institución
      delete data.institutionId;
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        cedula: true,
        phone: true,
        role: true,
        isActive: true,
        institutionId: true,
        institution: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  // Activar/Desactivar usuario
  async toggleUserStatus(
    id: string,
    isActive: boolean,
    currentUser: { id: string; role: UserRole; institutionId?: string }
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    // Validar permisos
    if (currentUser.role === UserRole.GESTOR) {
      // Gestor solo puede desactivar guardias de su institución
      if (
        user.role !== UserRole.GUARDIAN ||
        user.institutionId !== currentUser.institutionId
      ) {
        throw new ForbiddenException(
          "No tiene permisos para modificar este usuario"
        );
      }
    } else if (currentUser.role === UserRole.ADMIN) {
      // Admin puede desactivar cualquier usuario excepto otros admins
      if (user.role === UserRole.ADMIN && user.id !== currentUser.id) {
        throw new ForbiddenException(
          "No puede desactivar a otros administradores"
        );
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });
  }

  // Asignar institución a usuario
  async assignInstitution(userId: string, institutionId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });

    if (!institution) {
      throw new NotFoundException("Institución no encontrada");
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { institutionId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        institution: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  // Obtener padres de una institución (para gestor)
  async getParentsByInstitution(institutionId: string) {
    return this.prisma.user.findMany({
      where: {
        role: UserRole.PARENT,
        institutionId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        cedula: true,
        phone: true,
        children: {
          select: {
            id: true,
            name: true,
            grade: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  // Obtener guardias de una institución (para gestor)
  async getGuardiansByInstitution(institutionId: string) {
    return this.prisma.user.findMany({
      where: {
        role: UserRole.GUARDIAN,
        institutionId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        cedula: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });
  }

  // Asignar hijo a padre (para gestor)
  async assignChildToParent(
    parentId: string,
    childData: { name: string; grade: string },
    institutionId: string
  ) {
    const parent = await this.prisma.user.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      throw new NotFoundException("Padre no encontrado");
    }

    if (parent.role !== UserRole.PARENT) {
      throw new ForbiddenException("El usuario no es un padre");
    }

    // Obtener la institución para el campo school
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });

    return this.prisma.child.create({
      data: {
        name: childData.name,
        grade: childData.grade,
        school: institution?.name || "Sin asignar",
        parentId,
        institutionId,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}
