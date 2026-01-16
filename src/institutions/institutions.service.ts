import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class InstitutionsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  }) {
    const existing = await this.prisma.institution.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new ConflictException("Ya existe una institución con ese nombre");
    }

    return this.prisma.institution.create({
      data,
    });
  }

  async findAll() {
    return this.prisma.institution.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
  }

  async findAllWithStats() {
    const institutions = await this.prisma.institution.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            users: true,
            children: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return institutions.map((inst) => ({
      id: inst.id,
      name: inst.name,
      address: inst.address,
      phone: inst.phone,
      email: inst.email,
      isActive: inst.isActive,
      totalUsers: inst._count.users,
      totalChildren: inst._count.children,
      createdAt: inst.createdAt,
    }));
  }

  async findOne(id: string) {
    const institution = await this.prisma.institution.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            grade: true,
            parent: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!institution) {
      throw new NotFoundException("Institución no encontrada");
    }

    return institution;
  }

  async search(query: string) {
    return this.prisma.institution.findMany({
      where: {
        isActive: true,
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      take: 10,
      orderBy: { name: "asc" },
    });
  }

  async update(
    id: string,
    data: { name?: string; address?: string; phone?: string; email?: string }
  ) {
    const existing = await this.prisma.institution.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException("Institución no encontrada");
    }

    if (data.name && data.name !== existing.name) {
      const nameExists = await this.prisma.institution.findUnique({
        where: { name: data.name },
      });
      if (nameExists) {
        throw new ConflictException("Ya existe una institución con ese nombre");
      }
    }

    return this.prisma.institution.update({
      where: { id },
      data,
    });
  }

  async deactivate(id: string) {
    const existing = await this.prisma.institution.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException("Institución no encontrada");
    }

    return this.prisma.institution.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activate(id: string) {
    const existing = await this.prisma.institution.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException("Institución no encontrada");
    }

    return this.prisma.institution.update({
      where: { id },
      data: { isActive: true },
    });
  }

  // Obtener usuarios de una institución por rol
  async getInstitutionUsers(institutionId: string, role?: string) {
    const where: any = { institutionId };
    if (role) {
      where.role = role;
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
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });
  }

  // Obtener niños de una institución
  async getInstitutionChildren(institutionId: string) {
    return this.prisma.child.findMany({
      where: { institutionId },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }
}
