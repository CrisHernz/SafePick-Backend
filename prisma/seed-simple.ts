import { PrismaClient, UserRole, WithdrawalStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de la base de datos...");

  // Limpiar datos existentes
  await prisma.withdrawalOrder.deleteMany();
  await prisma.picker.deleteMany();
  await prisma.child.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Base de datos limpiada");

  // Hash de contraseñas
  const hashedPassword = await bcrypt.hash("Password123!", 10);

  // ========== USUARIOS ==========

  // 1. Admin
  const admin = await prisma.user.create({
    data: {
      email: "admin@safepick.com",
      password: hashedPassword,
      name: "Admin SafePick",
      role: UserRole.ADMIN,
      cedula: "1234567890",
      phone: "+34123456789",
    },
  });
  console.log("✅ Admin creado:", admin.email);

  // 2. Padres
  const parent1 = await prisma.user.create({
    data: {
      email: "giuliana.hernandez@gmail.com",
      password: hashedPassword,
      name: "Giuliana Hernández",
      role: UserRole.PARENT,
      cedula: "1721599361",
      phone: "+593988344069",
    },
  });

  const parent2 = await prisma.user.create({
    data: {
      email: "cristian.hernandez@gmail.com",
      password: hashedPassword,
      name: "Cristian Hernández",
      role: UserRole.PARENT,
      cedula: "1721138988",
      phone: "+593991935080",
    },
  });

  const parent3 = await prisma.user.create({
    data: {
      email: "ana.rodriguez@email.com",
      password: hashedPassword,
      name: "Ana Rodríguez Sánchez",
      role: UserRole.PARENT,
      cedula: "7778889990",
      phone: "+34777888999",
    },
  });

  console.log(
    "✅ Padres creados:",
    parent1.email,
    parent2.email,
    parent3.email
  );

  // 3. Guardias
  const guardian1 = await prisma.user.create({
    data: {
      email: "guardia1@colegio.com",
      password: hashedPassword,
      name: "Carlos Ramírez",
      role: UserRole.GUARDIAN,
      cedula: "1112223334",
      phone: "+34111222333",
    },
  });

  const guardian2 = await prisma.user.create({
    data: {
      email: "guardia2@colegio.com",
      password: hashedPassword,
      name: "Laura Fernández",
      role: UserRole.GUARDIAN,
      cedula: "4445556667",
      phone: "+34444555666",
    },
  });

  console.log("✅ Guardias creados:", guardian1.email, guardian2.email);

  // ========== NIÑOS ==========

  // Hijos de María García
  const child1 = await prisma.child.create({
    data: {
      name: "Micaela Hernández",
      grade: "3° Primaria",
      school: "Colegio San José",
      parentId: parent1.id,
    },
  });

  const child2 = await prisma.child.create({
    data: {
      name: " Kenny Guañuna",
      grade: "5° Primaria",
      school: "Colegio San José",
      parentId: parent1.id,
    },
  });
  
  // Hijos de Cristian Hernández
  const child3 = await prisma.child.create({
    data: {
      name: "Amelie Hernández",
      grade: "2° Primaria",
      school: "Colegio Santa María",
      parentId: parent2.id,
    },
  });

  // Hijos de Ana Rodríguez
  const child4 = await prisma.child.create({
    data: {
      name: "Diego Rodríguez",
      grade: "4° Primaria",
      school: "Colegio San José",
      parentId: parent3.id,
    },
  });

  const child5 = await prisma.child.create({
    data: {
      name: "Valentina Rodríguez",
      grade: "1° Primaria",
      school: "Colegio San José",
      parentId: parent3.id,
    },
  });

  console.log("✅ 5 niños creados");

  // ========== ÓRDENES DE RETIRO ==========

  // Orden 1: Pendiente - Sofía García
  const order1 = await prisma.withdrawalOrder.create({
    data: {
      childId: child1.id,
      parentId: parent1.id,
      status: WithdrawalStatus.PENDING,
      qrCode: "QR-SOFIA-001",
      withdrawalDate: new Date(),
    },
  });

  await prisma.picker.create({
    data: {
      name: "Roberto García",
      cedula: "3334445556",
      phone: "+34333444555",
      relationship: "padre",
      withdrawalOrderId: order1.id,
      isActive: true,
    },
  });

  // Orden 2: Validada - Lucas García
  const order2 = await prisma.withdrawalOrder.create({
    data: {
      childId: child2.id,
      parentId: parent1.id,
      status: WithdrawalStatus.VALIDATED,
      qrCode: "QR-LUCAS-002",
      withdrawalDate: new Date(),
    },
  });

  await prisma.picker.create({
    data: {
      name: "Carmen López",
      cedula: "6667778889",
      phone: "+34666777888",
      relationship: "abuela",
      withdrawalOrderId: order2.id,
      isActive: true,
    },
  });

  // Orden 3: Completada - Emma Pérez
  const order3 = await prisma.withdrawalOrder.create({
    data: {
      childId: child3.id,
      parentId: parent2.id,
      status: WithdrawalStatus.COMPLETED,
      qrCode: "QR-EMMA-003",
      withdrawalDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Ayer
    },
  });

  await prisma.picker.create({
    data: {
      name: "Juan Pérez Martínez",
      cedula: "5551234567",
      phone: "+34555123456",
      relationship: "padre",
      withdrawalOrderId: order3.id,
      isActive: false,
    },
  });

  // Orden 4: Pendiente - Diego Rodríguez
  const order4 = await prisma.withdrawalOrder.create({
    data: {
      childId: child4.id,
      parentId: parent3.id,
      status: WithdrawalStatus.PENDING,
      qrCode: "QR-DIEGO-004",
      withdrawalDate: new Date(),
    },
  });

  await prisma.picker.create({
    data: {
      name: "Miguel Rodríguez",
      cedula: "8889990001",
      phone: "+34888999000",
      relationship: "tío",
      withdrawalOrderId: order4.id,
      isActive: true,
    },
  });

  // Orden 5: Cancelada - Valentina Rodríguez
  const order5 = await prisma.withdrawalOrder.create({
    data: {
      childId: child5.id,
      parentId: parent3.id,
      status: WithdrawalStatus.CANCELLED,
      qrCode: "QR-VALENTINA-005",
      withdrawalDate: new Date(),
    },
  });

  await prisma.picker.create({
    data: {
      name: "Ana Rodríguez Sánchez",
      cedula: "7778889990",
      phone: "+34777888999",
      relationship: "madre",
      withdrawalOrderId: order5.id,
      isActive: false,
    },
  });

  console.log("✅ 5 órdenes de retiro creadas (con sus pickers)");

  console.log("\n🎉 Seed completado exitosamente!\n");
  console.log("📊 Resumen de datos creados:");
  console.log("   - 1 Admin");
  console.log("   - 3 Padres");
  console.log("   - 2 Guardias");
  console.log("   - 5 Niños");
  console.log("   - 5 Órdenes de retiro (con pickers)");
  console.log(
    "\n🔐 Credenciales de prueba (contraseña para todos: Password123!):"
  );
  console.log("   Admin:     admin@safepick.com");
  console.log("   Padre 1:   maria.garcia@email.com");
  console.log("   Padre 2:   juan.perez@email.com");
  console.log("   Padre 3:   ana.rodriguez@email.com");
  console.log("   Guardia 1: guardia1@colegio.com");
  console.log("   Guardia 2: guardia2@colegio.com");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
