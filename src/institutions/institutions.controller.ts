import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { InstitutionsService } from "./institutions.service";
import { JwtGuard } from "../common/guards/jwt.guard";
import { RoleGuard } from "../common/guards/role.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CreateInstitutionDto, UpdateInstitutionDto } from "./dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ForbiddenException } from "@nestjs/common";
import { UserRole } from "@prisma/client";

@Controller("institutions")
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  // Búsqueda pública para autocompletado (sin autenticación)
  @Get("search")
  async search(@Query("q") query: string) {
    if (!query || query.length < 2) {
      return [];
    }
    return this.institutionsService.search(query);
  }

  // Lista pública de instituciones para registro
  @Get("public")
  async getPublicList() {
    return this.institutionsService.findAll();
  }

  // Rutas protegidas

  @Get()
  @UseGuards(JwtGuard, RoleGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  async findAll(@CurrentUser() user: any) {
    if (user.role === UserRole.GESTOR) {
      // Solo puede ver su propia institución
      if (!user.institutionId) return [];
      return [await this.institutionsService.findOne(user.institutionId)];
    }
    return this.institutionsService.findAllWithStats();
  }

  @Get(":id")
  @UseGuards(JwtGuard, RoleGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  async findOne(@Param("id") id: string, @CurrentUser() user: any) {
    if (user.role === UserRole.GESTOR && user.institutionId !== id) {
      throw new ForbiddenException("No puede acceder a otra institución");
    }
    return this.institutionsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtGuard, RoleGuard)
  @Roles("ADMIN")
  async create(@Body(ValidationPipe) createDto: CreateInstitutionDto) {
    return this.institutionsService.create(createDto);
  }

  @Put(":id")
  @UseGuards(JwtGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param("id") id: string,
    @Body(ValidationPipe) updateDto: UpdateInstitutionDto,
  ) {
    return this.institutionsService.update(id, updateDto);
  }

  @Delete(":id")
  @UseGuards(JwtGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async deactivate(@Param("id") id: string) {
    return this.institutionsService.deactivate(id);
  }

  @Put(":id/activate")
  @UseGuards(JwtGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  async activate(@Param("id") id: string) {
    return this.institutionsService.activate(id);
  }

  // Obtener usuarios de una institución

  @Get(":id/users")
  @UseGuards(JwtGuard, RoleGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  async getUsers(
    @Param("id") id: string,
    @Query("role") role: string,
    @CurrentUser() user: any,
  ) {
    if (user.role === UserRole.GESTOR && user.institutionId !== id) {
      throw new ForbiddenException("No puede acceder a otra institución");
    }
    return this.institutionsService.getInstitutionUsers(id, role);
  }

  // Obtener niños de una institución

  @Get(":id/children")
  @UseGuards(JwtGuard, RoleGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  async getChildren(@Param("id") id: string, @CurrentUser() user: any) {
    if (user.role === UserRole.GESTOR && user.institutionId !== id) {
      throw new ForbiddenException("No puede acceder a otra institución");
    }
    return this.institutionsService.getInstitutionChildren(id);
  }
}
