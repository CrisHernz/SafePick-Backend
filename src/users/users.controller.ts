import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ValidationPipe,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtGuard } from "../common/guards/jwt.guard";
import { RoleGuard } from "../common/guards/role.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CreateUserByAdminDto, AssignChildDto } from "./dto/index";
import { UserRole } from "@prisma/client";

@Controller("users")
@UseGuards(JwtGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Obtener todos los usuarios (admin)
  @Get()
  @UseGuards(RoleGuard)
  @Roles(UserRole.ADMIN)
  async findAll(
    @Query("role") role?: string,
    @Query("institutionId") institutionId?: string,
    @Query("isActive") isActive?: string
  ) {
    return this.usersService.findAll({
      role,
      institutionId,
      isActive:
        isActive === "true" ? true : isActive === "false" ? false : undefined,
    });
  }

  // Obtener todos los gestores (admin)
  @Get("gestores")
  @UseGuards(RoleGuard)
  @Roles(UserRole.ADMIN)
  async findGestores() {
    return this.usersService.findGestores();
  }

  // Obtener guardias de mi institución (gestor)
  @Get("my-institution/guardians")
  @UseGuards(RoleGuard)
  @Roles(UserRole.GESTOR)
  async getMyInstitutionGuardians(@CurrentUser() user: any) {
    if (!user.institutionId) {
      return [];
    }
    return this.usersService.getGuardiansByInstitution(user.institutionId);
  }

  // Obtener padres de mi institución (gestor)
  @Get("my-institution/parents")
  @UseGuards(RoleGuard)
  @Roles(UserRole.GESTOR)
  async getMyInstitutionParents(@CurrentUser() user: any) {
    if (!user.institutionId) {
      return [];
    }
    return this.usersService.getParentsByInstitution(user.institutionId);
  }

  // Obtener un usuario por ID
  @Get(":id")
  @UseGuards(RoleGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  async findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  // Crear usuario (admin crea gestores, gestor crea guardias)
  @Post()
  @UseGuards(RoleGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  async createUser(
    @Body(ValidationPipe) createDto: CreateUserByAdminDto,
    @CurrentUser() currentUser: any
  ) {
    return this.usersService.createUser(createDto, currentUser);
  }

  // Actualizar usuario
  @Put(":id")
  @UseGuards(RoleGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  async updateUser(
    @Param("id") id: string,
    @Body() data: { name?: string; phone?: string; institutionId?: string },
    @CurrentUser() currentUser: any
  ) {
    return this.usersService.updateUser(id, data, currentUser);
  }

  // Activar usuario
  @Patch(":id/activate")
  @UseGuards(RoleGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  async activateUser(@Param("id") id: string, @CurrentUser() currentUser: any) {
    return this.usersService.toggleUserStatus(id, true, currentUser);
  }

  // Desactivar usuario
  @Patch(":id/deactivate")
  @UseGuards(RoleGuard)
  @Roles(UserRole.ADMIN, UserRole.GESTOR)
  async deactivateUser(
    @Param("id") id: string,
    @CurrentUser() currentUser: any
  ) {
    return this.usersService.toggleUserStatus(id, false, currentUser);
  }

  // Asignar institución a usuario (admin)
  @Patch(":id/assign-institution")
  @UseGuards(RoleGuard)
  @Roles(UserRole.ADMIN)
  async assignInstitution(
    @Param("id") id: string,
    @Body("institutionId") institutionId: string
  ) {
    return this.usersService.assignInstitution(id, institutionId);
  }

  // Asignar hijo a padre (gestor)
  @Post("parents/:parentId/children")
  @UseGuards(RoleGuard)
  @Roles(UserRole.GESTOR)
  async assignChildToParent(
    @Param("parentId") parentId: string,
    @Body(ValidationPipe) childData: AssignChildDto,
    @CurrentUser() currentUser: any
  ) {
    return this.usersService.assignChildToParent(
      parentId,
      childData,
      currentUser.institutionId
    );
  }
}
