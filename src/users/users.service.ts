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
    currentUser: { id: string; role: UserRole; institutionId?: string },
  ) {
    // Validar que el rol del creador permite crear el rol solicitado
    if (currentUser.role === UserRole.GESTOR) {
      if (data.role !== UserRole.GUARDIAN) {
        throw new ForbiddenException("Los gestores solo pueden crear guardias");
      }
      // Asignar la institución del gestor al guardia
      data.institutionId = currentUser.institutionId;
    } else if (currentUser.role === UserRole.ADMIN) {
      // Admin solo puede crear GESTORES (los guardias los crea el gestor)
      if (data.role !== UserRole.GESTOR) {
        throw new ForbiddenException(
          "Los administradores solo pueden crear gestores. Los guardias deben ser creados por el gestor de cada institución.",
        );
      }
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
    currentUser: { id: string; role: UserRole; institutionId?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    // Validar permisos según el rol del usuario actual
    if (currentUser.role === UserRole.GESTOR) {
      // Gestor solo puede actualizar guardias de su institución
      if (
        user.role !== UserRole.GUARDIAN ||
        user.institutionId !== currentUser.institutionId
      ) {
        throw new ForbiddenException(
          "Solo puede modificar guardias de su institución",
        );
      }
      // Gestor no puede cambiar la institución del guardia
      delete data.institutionId;
    } else if (currentUser.role === UserRole.ADMIN) {
      // Admin solo puede actualizar gestores
      if (user.role !== UserRole.GESTOR) {
        throw new ForbiddenException("Solo puede modificar gestores");
      }
    } else {
      throw new ForbiddenException("No tiene permisos para esta acción");
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
    currentUser: { id: string; role: UserRole; institutionId?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    // Validar permisos según el rol del usuario actual
    if (currentUser.role === UserRole.GESTOR) {
      // Gestor solo puede activar/desactivar guardias de su institución
      if (
        user.role !== UserRole.GUARDIAN ||
        user.institutionId !== currentUser.institutionId
      ) {
        throw new ForbiddenException(
          "Solo puede modificar guardias de su institución",
        );
      }
    } else if (currentUser.role === UserRole.ADMIN) {
      // Admin solo puede activar/desactivar gestores (no otros admins, no guardias directamente)
      if (user.role === UserRole.ADMIN) {
        throw new ForbiddenException(
          "No puede modificar a otros administradores",
        );
      }
      if (user.role === UserRole.GUARDIAN) {
        throw new ForbiddenException(
          "Los guardias deben ser gestionados por el gestor de su institución",
        );
      }
      if (user.role !== UserRole.GESTOR) {
        throw new ForbiddenException(
          "Solo puede modificar cuentas de gestores",
        );
      }
    } else {
      throw new ForbiddenException("No tiene permisos para esta acción");
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

  // Asignar institución a gestor (solo admin puede usar esto)
  async assignInstitution(userId: string, institutionId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    // Solo se puede asignar institución a gestores
    if (user.role !== UserRole.GESTOR) {
      throw new ForbiddenException(
        "Solo se puede asignar institución a gestores",
      );
    }

    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
    });

    if (!institution) {
      throw new NotFoundException("Institución no encontrada");
    }

    if (!institution.isActive) {
      throw new ForbiddenException("La institución está inactiva");
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
    gestorInstitutionId: string,
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

    // Validar que el padre pertenezca a la misma institución que el gestor
    if (parent.institutionId !== gestorInstitutionId) {
      throw new ForbiddenException("El padre no pertenece a su institución");
    }

    // Obtener la institución para el campo school
    const institution = await this.prisma.institution.findUnique({
      where: { id: parent.institutionId },
    });

    return this.prisma.child.create({
      data: {
        name: childData.name,
        grade: childData.grade,
        school: institution?.name || "Sin asignar",
        parentId,
        institutionId: parent.institutionId,
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
