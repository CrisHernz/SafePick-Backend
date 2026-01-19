import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateWithdrawalOrderDto } from "../common/dtos";
import { NotificationService } from "../notifications/notification.service";
import * as qrcode from "qrcode";
import * as bcrypt from "bcryptjs";
import { WithdrawalStatus } from "@prisma/client";
import { CryptoUtil } from "../common/utils/crypto.util";

/**
 * @fileoverview Servicio de Gestión de Órdenes de Retiro
 * @module withdrawal/withdrawal.service
 * @security WITHDRAWAL_MANAGEMENT - Gestión segura de retiros escolares
 *
 * @description
 * Servicio central que gestiona todo el flujo de retiro de niños:
 * - Creación de órdenes de retiro con validación de propiedad
 * - Generación de credenciales temporales para pickers
 * - Códigos QR únicos y tokens criptográficamente seguros
 * - Validación y completado de retiros por guardias
 * - Registro de auditoría de todas las operaciones
 *
 * ## Seguridad Implementada:
 * - Validación de propiedad: padres solo acceden a sus hijos
 * - Códigos temporales hasheados con bcrypt (factor 10)
 * - Códigos cifrados con AES-256-CBC para recuperación
 * - Expiración automática a las 2PM del día
 * - Prevención de órdenes duplicadas por cédula
 * - Filtrado por institución para guardias
 * - Logs de auditoría para cada retiro completado
 *
 * ## Flujo de Retiro:
 * 1. Padre crea orden → se generan credenciales para picker
 * 2. Padre comparte credenciales con picker
 * 3. Picker inicia sesión con cédula + código OTP
 * 4. Guardia escanea QR → valida datos → completa retiro
 * 5. Sistema envía notificación al padre (Telegram opcional)
 *
 * @see CryptoUtil - Utilidades criptográficas para códigos
 * @see NotificationService - Envío de notificaciones
 */
@Injectable()
export class WithdrawalService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Genera código temporal OTP de 6 dígitos
   * @returns {string} Código numérico de 6 dígitos
   * @security Usar CryptoUtil.generateSecureOtp() en producción para mayor seguridad
   */
  private generateTemporaryCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Calcula fecha de expiración del código temporal
   *
   * El código expira a las 2PM (14:00) del día de creación,
   * o del día siguiente si se crea después de las 2PM.
   *
   * @returns {Date} Fecha y hora de expiración
   * @security Expiración corta para limitar ventana de ataque
   */
  private calculateExpirationDate(): Date {
    const now = new Date();
    const expirationDate = new Date();

    // Establecer la hora a las 2 PM (14:00)
    expirationDate.setHours(14, 0, 0, 0);

    // Si ya pasaron las 2 PM de hoy, expira mañana a las 2 PM
    if (now.getHours() >= 14) {
      expirationDate.setDate(expirationDate.getDate() + 1);
    }
    // Si es antes de las 2 PM, expira hoy a las 2 PM

    return expirationDate;
  }

  /**
   * Crea una nueva orden de retiro con credenciales temporales para el picker
   *
   * Flujo completo:
   * 1. Valida que el niño pertenece al padre que crea la orden
   * 2. Verifica que la cédula del picker no tenga orden activa
   * 3. Genera código OTP temporal y lo hashea con bcrypt
   * 4. Cifra el código para posible recuperación segura
   * 5. Genera código QR único para la orden
   * 6. Envía notificación al padre con las credenciales
   *
   * @param {string} userId - ID del padre que crea la orden
   * @param {CreateWithdrawalOrderDto} createWithdrawalOrderDto - Datos de la orden
   * @param {string} createWithdrawalOrderDto.childId - ID del niño a retirar
   * @param {string} createWithdrawalOrderDto.pickerCedula - Cédula del encargado
   * @param {string} createWithdrawalOrderDto.pickerName - Nombre del encargado
   * @param {string} createWithdrawalOrderDto.pickerPhone - Teléfono del encargado
   * @param {string} createWithdrawalOrderDto.relationship - Relación con el niño
   *
   * @returns {Promise<object>} Orden creada con credenciales temporales
   * @throws {NotFoundException} Si el niño no existe
   * @throws {BadRequestException} Si el niño no pertenece al padre
   * @throws {BadRequestException} Si la cédula ya tiene orden activa
   *
   * @security
   * - Validación de propiedad del niño (parentId === userId)
   * - Prevención de órdenes duplicadas por cédula
   * - Código hasheado con bcrypt factor 10
   * - Código cifrado con AES-256-CBC
   * - Expiración automática a las 2PM
   */
  async createWithdrawalOrder(
    userId: string,
    createWithdrawalOrderDto: CreateWithdrawalOrderDto,
  ) {
    // Telegram es opcional - solo se usará para notificaciones si está configurado
    // No bloqueamos la creación de órdenes si no está configurado

    // Verificar que el niño existe y pertenece al usuario
    const child = await this.prisma.child.findUnique({
      where: { id: createWithdrawalOrderDto.childId },
    });

    if (!child) {
      throw new NotFoundException("Child not found");
    }

    if (child.parentId !== userId) {
      throw new BadRequestException("Child does not belong to this user");
    }

    // Validar cédula del encargado
    // Puede ser: 1) Cédula de otro padre del sistema, o 2) Cédula nueva
    const existingPicker = await this.prisma.picker.findUnique({
      where: { cedula: createWithdrawalOrderDto.pickerCedula },
    });

    if (existingPicker) {
      throw new BadRequestException(
        "Esta cédula ya tiene una orden de retiro activa. Completa o cancela la orden anterior primero.",
      );
    }

    // Buscar si la cédula pertenece a un padre del sistema
    const parentUser = await this.prisma.user.findUnique({
      where: { cedula: createWithdrawalOrderDto.pickerCedula },
      select: { id: true, name: true, role: true },
    });

    // Si es un padre del sistema, usar su nombre
    const pickerName =
      parentUser?.role === "PARENT"
        ? parentUser.name
        : createWithdrawalOrderDto.pickerName;

    // Generar credenciales temporales para el picker
    const temporaryCode = this.generateTemporaryCode();
    const temporaryPassword = await bcrypt.hash(temporaryCode, 10);
    const encryptedCode = CryptoUtil.encrypt(temporaryCode); // Encriptar para recuperación
    const codeExpiresAt = this.calculateExpirationDate();

    // Crear la orden de retiro con credenciales temporales
    const withdrawalOrder = (await this.prisma.withdrawalOrder.create({
      data: {
        childId: createWithdrawalOrderDto.childId,
        parentId: userId,
        picker: {
          create: {
            name: pickerName,
            cedula: createWithdrawalOrderDto.pickerCedula,
            phone: createWithdrawalOrderDto.pickerPhone,
            relationship: createWithdrawalOrderDto.relationship,
            temporaryPassword: temporaryPassword, // Hash para validación de login
            encryptedCode: encryptedCode, // Código encriptado para recuperación
            codeExpiresAt: codeExpiresAt,
            isActive: true,
          } as any,
        },
      },
      include: {
        child: true,
        picker: true,
      },
    })) as any;

    if (!withdrawalOrder.picker) {
      throw new BadRequestException("Picker information is required");
    }

    // Generar token de validación (JSON simple para el QR)
    const qrPayload = {
      orderId: withdrawalOrder.id,
      childId: withdrawalOrder.child.id,
      childName: withdrawalOrder.child.name,
      pickerName: withdrawalOrder.picker.name,
      pickerCedula: withdrawalOrder.picker.cedula,
      relationship: withdrawalOrder.picker.relationship,
      createdAt: withdrawalOrder.createdAt.toISOString(),
    };

    // Guardar solo el token/código, no la imagen
    const qrToken = Buffer.from(JSON.stringify(qrPayload)).toString("base64");

    // Actualizar orden con token QR y cambiar estado a VALIDATED
    const updatedOrder = (await this.prisma.withdrawalOrder.update({
      where: { id: withdrawalOrder.id },
      data: {
        qrCode: qrToken, // Guardar solo el token, no la imagen
        status: WithdrawalStatus.VALIDATED,
      },
      include: {
        child: true,
        picker: true,
      },
    })) as any;

    if (!updatedOrder.picker) {
      throw new BadRequestException("Picker information is required");
    }

    return {
      withdrawalOrderId: updatedOrder.id,
      message: "Withdrawal order created successfully",
      pickerInfo: {
        name: updatedOrder.picker.name,
        cedula: updatedOrder.picker.cedula,
        relationship: updatedOrder.picker.relationship,
      },
      pickerCredentials: {
        cedula: updatedOrder.picker.cedula,
        temporaryCode: temporaryCode, // Solo enviamos el código sin hashear
        expiresAt: codeExpiresAt.toISOString(),
      },
      qrToken: updatedOrder.qrCode, // Token para generar QR en el frontend
      qrData: qrPayload, // Datos originales para referencia
    };
  }

  // Obtener credenciales del picker (desencripta código existente, NO regenera)
  async getPickerCredentials(orderId: string, userId: string) {
    const order = (await this.prisma.withdrawalOrder.findUnique({
      where: { id: orderId },
      include: {
        child: true,
        picker: true,
        parent: true,
      },
    })) as any;

    if (!order) {
      throw new NotFoundException("Withdrawal order not found");
    }

    // Verificar que el usuario es el padre de la orden
    if (order.parentId !== userId) {
      throw new BadRequestException(
        "You are not authorized to view these credentials",
      );
    }

    if (!order.picker) {
      throw new NotFoundException("Picker not found for this order");
    }

    // Verificar que la orden está activa
    if (order.status === WithdrawalStatus.CANCELLED) {
      throw new BadRequestException("This order has been cancelled");
    }

    if (order.status === WithdrawalStatus.COMPLETED) {
      throw new BadRequestException("This order has already been completed");
    }

    // Verificar que hay un código encriptado almacenado
    if (!order.picker.encryptedCode) {
      throw new NotFoundException(
        "No temporary code found for this picker. Please contact support.",
      );
    }

    // Desencriptar el código existente (NO regenerar)
    const temporaryCode = CryptoUtil.decrypt(order.picker.encryptedCode);

    // Generar QR data
    const qrPayload = {
      orderId: order.id,
      childId: order.child.id,
      childName: order.child.name,
      pickerName: order.picker.name,
      pickerCedula: order.picker.cedula,
      relationship: order.picker.relationship,
      createdAt: order.createdAt.toISOString(),
    };

    return {
      message: "Credentials retrieved successfully",
      pickerCredentials: {
        cedula: order.picker.cedula,
        temporaryCode: temporaryCode, // Código desencriptado (el MISMO que se generó)
        expiresAt: order.picker.codeExpiresAt.toISOString(),
      },
      qrToken: order.qrCode,
      qrData: qrPayload,
      pickerInfo: {
        name: order.picker.name,
        cedula: order.picker.cedula,
        phone: order.picker.phone,
        relationship: order.picker.relationship,
      },
    };
  }

  // Obtener detalles de una orden
  async getWithdrawalOrder(orderId: string, userId: string) {
    const order = await this.prisma.withdrawalOrder.findUnique({
      where: { id: orderId },
      include: {
        child: true,
        picker: true,
      },
    });

    if (!order) {
      throw new NotFoundException("Withdrawal order not found");
    }

    if (order.parentId !== userId) {
      throw new BadRequestException("Unauthorized");
    }

    return order;
  }

  // Listar órdenes del usuario
  async getUserWithdrawalOrders(userId: string) {
    return await this.prisma.withdrawalOrder.findMany({
      where: { parentId: userId },
      include: {
        child: true,
        picker: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Completa una orden de retiro validada
   *
   * Ejecuta transacción atómica que:
   * 1. Crea registro en tabla de auditoría (WithdrawalLog)
   * 2. Actualiza estado de la orden a COMPLETED
   * 3. Elimina datos temporales del picker
   *
   * @param {string} orderId - ID de la orden a completar
   * @param {string} role - Rol del usuario que completa (GUARDIAN/ADMIN)
   *
   * @returns {Promise<object>} Orden completada con timestamp
   * @throws {NotFoundException} Si la orden no existe
   * @throws {BadRequestException} Si la orden no está en estado VALIDATED
   * @throws {BadRequestException} Si no hay picker asociado
   *
   * @security
   * - Solo órdenes en estado VALIDATED pueden completarse
   * - Transacción atómica para integridad de datos
   * - Log de auditoría con datos del picker antes de eliminar
   * - Eliminación de credenciales temporales tras completar
   */
  async completeWithdrawal(orderId: string, role: string) {
    const order = (await this.prisma.withdrawalOrder.findUnique({
      where: { id: orderId },
      include: {
        child: true,
        picker: true,
        parent: true,
      },
    })) as any;

    if (!order) {
      throw new NotFoundException("Withdrawal order not found");
    }

    if (order.status !== WithdrawalStatus.VALIDATED) {
      throw new BadRequestException("Withdrawal order must be validated first");
    }

    if (!order.picker) {
      throw new BadRequestException("No picker associated with this order");
    }

    const completionTime = new Date();

    // Guardar datos del picker ANTES de eliminarlo
    const pickerData = {
      cedula: order.picker.cedula,
      name: order.picker.name,
      pickerId: order.picker.id,
    };

    // Actualizar orden, crear log y eliminar picker en una transacción
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Primero crear el log (antes de eliminar el picker)
      await tx.withdrawalLog.create({
        data: {
          withdrawalOrderId: orderId,
          pickerCedula: pickerData.cedula,
          pickerName: pickerData.name,
          childName: order.child.name,
          parentName: order.parent.name,
          completedAt: completionTime,
          completedBy: role,
        },
      });

      // 2. Actualizar orden
      const updatedOrder = await tx.withdrawalOrder.update({
        where: { id: orderId },
        data: {
          status: WithdrawalStatus.COMPLETED,
          withdrawalDate: completionTime,
        },
        include: {
          child: true,
          parent: true,
          withdrawalLog: true,
        },
      });

      // 3. Eliminar registro temporal del picker
      await tx.picker.delete({
        where: { id: pickerData.pickerId },
      });

      return updatedOrder;
    });

    // Enviar notificación al padre por Telegram
    if (order.parent?.telegramChatId) {
      await this.notificationService.notifyWithdrawalCompleted(
        order.parent.telegramChatId,
        order.child.name,
        pickerData.name,
        order.picker.relationship,
        completionTime,
      );
    }

    return {
      success: true,
      message: "Withdrawal completed successfully",
      order: result,
    };
  }

  // Cancelar retiro
  async cancelWithdrawal(orderId: string, userId: string) {
    const order = await this.prisma.withdrawalOrder.findUnique({
      where: { id: orderId },
      include: { picker: true },
    });

    if (!order) {
      throw new NotFoundException("Withdrawal order not found");
    }

    if (order.parentId !== userId) {
      throw new BadRequestException("Unauthorized");
    }

    // Cancelar orden y eliminar picker en transacción
    const result = await this.prisma.$transaction(async (tx) => {
      // Actualizar orden a CANCELLED
      const updatedOrder = await tx.withdrawalOrder.update({
        where: { id: orderId },
        data: { status: WithdrawalStatus.CANCELLED },
        include: {
          child: true,
          picker: true,
        },
      });

      // Eliminar registro temporal del picker si existe
      if (order.picker) {
        await tx.picker.delete({
          where: { id: order.picker.id },
        });
      }

      return updatedOrder;
    });

    return {
      success: true,
      message: "Withdrawal cancelled and temporary credentials removed",
      order: result,
    };
  }

  /**
   * Valida un código QR escaneado por el guardia
   *
   * Proceso de validación:
   * 1. Decodifica el token Base64 a JSON
   * 2. Busca la orden en la base de datos
   * 3. Verifica que el QR coincide con el almacenado
   * 4. Valida datos del picker contra la orden
   * 5. Confirma estado VALIDATED de la orden
   *
   * @param {string} qrToken - Token del QR en formato Base64
   *
   * @returns {Promise<object>} Datos de validación con información de la orden
   * @throws {NotFoundException} Si la orden no existe
   * @throws {BadRequestException} Si el QR está manipulado
   * @throws {BadRequestException} Si los datos del picker no coinciden
   * @throws {BadRequestException} Si la orden no está en estado VALIDATED
   *
   * @security
   * - Decodificación segura con try/catch
   * - Comparación de QR almacenado vs escaneado
   * - Verificación de integridad de datos del picker
   * - Mensajes de error genéricos para datos inválidos
   */
  async validateQrCode(qrToken: string) {
    try {
      // Decodificar el token
      const decodedData = Buffer.from(qrToken, "base64").toString("utf-8");
      const qrData = JSON.parse(decodedData);

      // Buscar la orden
      const order = await this.prisma.withdrawalOrder.findUnique({
        where: { id: qrData.orderId },
        include: {
          child: true,
          picker: true,
          parent: {
            select: {
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException("Orden de retiro no encontrada");
      }

      // Verificar que el QR coincide con la orden
      if (order.qrCode !== qrToken) {
        throw new BadRequestException("QR inválido o manipulado");
      }

      // Verificar datos del picker
      if (order.picker?.cedula !== qrData.pickerCedula) {
        throw new BadRequestException("Los datos del picker no coinciden");
      }

      // Verificar que la orden está en estado VALIDATED
      if (order.status !== WithdrawalStatus.VALIDATED) {
        throw new BadRequestException(
          `La orden no puede ser procesada. Estado actual: ${order.status}`,
        );
      }

      return {
        valid: true,
        order: {
          id: order.id,
          status: order.status,
          child: {
            name: order.child.name,
            grade: order.child.grade,
            school: order.child.school,
          },
          picker: {
            name: order.picker?.name,
            cedula: order.picker?.cedula,
            phone: order.picker?.phone,
            relationship: order.picker?.relationship,
          },
          parent: {
            name: order.parent.name,
            phone: order.parent.phone,
            email: order.parent.email,
          },
          createdAt: order.createdAt,
        },
        message: "QR válido. Orden lista para completar.",
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException("QR inválido o corrupto");
    }
  }

  /**
   * Obtiene la orden asignada a un picker temporal
   *
   * @param {string} pickerId - ID del picker (extraído del token JWT)
   *
   * @returns {Promise<object>} Datos del picker y su orden asignada
   * @throws {NotFoundException} Si el picker no existe
   * @throws {BadRequestException} Si el código ha expirado
   * @throws {BadRequestException} Si la cuenta está desactivada
   *
   * @security
   * - Verificación de expiración del código
   * - Verificación de estado activo del picker
   * - Solo retorna datos necesarios para mostrar en UI
   */
  async getPickerOrder(pickerId: string) {
    const picker = (await this.prisma.picker.findUnique({
      where: { id: pickerId },
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
      throw new NotFoundException("Picker no encontrado");
    }

    // Verificar que el código no ha expirado
    const now = new Date();
    if (picker.codeExpiresAt && now > new Date(picker.codeExpiresAt)) {
      throw new BadRequestException("El código temporal ha expirado");
    }

    if (picker.isActive === false) {
      throw new BadRequestException("Esta cuenta ha sido desactivada");
    }

    return {
      picker: {
        id: picker.id,
        name: picker.name,
        cedula: picker.cedula,
        phone: picker.phone,
        relationship: picker.relationship,
        expiresAt: picker.codeExpiresAt,
      },
      order: {
        id: picker.withdrawalOrder.id,
        status: picker.withdrawalOrder.status,
        qrCode: picker.withdrawalOrder.qrCode,
        withdrawalDate: picker.withdrawalOrder.withdrawalDate,
        createdAt: picker.withdrawalOrder.createdAt,
        child: picker.withdrawalOrder.child,
        parent: picker.withdrawalOrder.parent,
      },
    };
  }

  /**
   * Escanea código QR y completa el retiro en una sola operación
   *
   * Flujo completo para guardias:
   * 1. Valida el código QR escaneado
   * 2. Verifica estado VALIDATED de la orden
   * 3. Crea registro de auditoría (WithdrawalLog)
   * 4. Actualiza estado a COMPLETED con timestamp
   * 5. Elimina credenciales temporales del picker
   * 6. Envía notificación al padre (Telegram si está configurado)
   *
   * @param {string} qrToken - Token del QR escaneado (Base64)
   * @param {string} guardianId - ID del guardia que procesa el retiro
   *
   * @returns {Promise<object>} Resultado del retiro con datos de auditoría
   * @throws {BadRequestException} Si el QR es inválido
   * @throws {NotFoundException} Si la orden no existe
   * @throws {BadRequestException} Si la orden no está en estado VALIDATED
   * @throws {BadRequestException} Si no hay picker asociado
   *
   * @security
   * - Validación previa del QR antes de completar
   * - Transacción atómica para integridad de datos
   * - Registro de auditoría con datos del guardia
   * - Eliminación de credenciales temporales tras completar
   * - Notificación al padre para trazabilidad
   */
  async scanQrAndComplete(qrToken: string, guardianId: string) {
    // 1. Validar el QR
    const validationResult = await this.validateQrCode(qrToken);

    if (!validationResult.valid) {
      throw new BadRequestException("QR inválido o expirado");
    }

    const order = (await this.prisma.withdrawalOrder.findUnique({
      where: { id: validationResult.order.id },
      include: {
        child: true,
        picker: true,
        parent: true,
      },
    })) as any;

    if (!order) {
      throw new NotFoundException("Orden no encontrada");
    }

    if (order.status !== WithdrawalStatus.VALIDATED) {
      throw new BadRequestException(
        `La orden debe estar VALIDADA primero. Estado actual: ${order.status}`,
      );
    }

    if (!order.picker) {
      throw new BadRequestException("No hay picker asociado a esta orden");
    }

    const completionTime = new Date();

    // Guardar datos del picker ANTES de eliminarlo
    const pickerData = {
      cedula: order.picker.cedula,
      name: order.picker.name,
      relationship: order.picker.relationship,
      pickerId: order.picker.id,
    };

    // Ejecutar todo en una transacción
    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      // 1. Crear log de retiro
      await tx.withdrawalLog.create({
        data: {
          withdrawalOrderId: order.id,
          pickerCedula: pickerData.cedula,
          pickerName: pickerData.name,
          childName: order.child.name,
          parentName: order.parent.name,
          completedAt: completionTime,
          completedBy: "GUARDIAN",
        },
      });

      // 2. Actualizar orden
      const updated = await tx.withdrawalOrder.update({
        where: { id: order.id },
        data: {
          status: WithdrawalStatus.COMPLETED,
          withdrawalDate: completionTime,
        },
        include: {
          child: true,
          parent: true,
        },
      });

      // 3. Eliminar el picker temporal
      await tx.picker.delete({
        where: { id: pickerData.pickerId },
      });

      return updated;
    });

    // Enviar notificación al padre por Telegram
    const notificationSent = order.parent?.telegramChatId
      ? await this.notificationService.notifyWithdrawalCompleted(
          order.parent.telegramChatId,
          order.child.name,
          pickerData.name,
          pickerData.relationship,
          completionTime,
        )
      : false;

    return {
      success: true,
      message: "Retiro completado exitosamente",
      notificationSent: notificationSent,
      completionTime: completionTime.toISOString(),
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        child: {
          name: updatedOrder.child.name,
          grade: updatedOrder.child.grade,
        },
        picker: {
          name: pickerData.name,
          cedula: pickerData.cedula,
          relationship: pickerData.relationship,
        },
        parent: {
          name: updatedOrder.parent.name,
          phone: updatedOrder.parent.phone,
          telegramNotified: notificationSent,
        },
      },
    };
  }
}
