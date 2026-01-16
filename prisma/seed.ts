import { PrismaClient, UserRole, WithdrawalStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { CryptoUtil } from "../src/common/utils/crypto.util";

const prisma = new PrismaClient();

// Función para calcular fecha de expiración (2 PM del mismo día o siguiente día)
function calculateExpirationDate(): Date {
  const now = new Date();
  const expirationDate = new Date();

  // Establecer la hora a las 2 PM (14:00)
  expirationDate.setHours(14, 0, 0, 0);

  // Si ya pasaron las 2 PM de hoy, expira mañana a las 2 PM
  if (now.getHours() >= 14) {
    expirationDate.setDate(expirationDate.getDate() + 1);
  }

  return expirationDate;
}

// Generar código temporal de 6 dígitos
function generateTemporaryCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function main() {
  console.log("🌱 Iniciando seed de la base de datos...");

  // Limpiar datos existentes
  await prisma.withdrawalLog.deleteMany();
  await prisma.picker.deleteMany();
  await prisma.withdrawalOrder.deleteMany();
  await prisma.child.deleteMany();
  await prisma.user.deleteMany();
  await prisma.institution.deleteMany();

  console.log("🧹 Base de datos limpiada");

  // Hash de contraseñas
  const hashedPassword = await bcrypt.hash("Password123!", 10);

  // ========== INSTITUCIONES ==========
  console.log("\n📚 Creando instituciones...");

  const colegioSanJose = await prisma.institution.create({
    data: {
      name: "Unidad Educativa San José La Salle",
      address: "Av. América N34-183 y Rumipamba, Quito",
      phone: "+593022444123",
      email: "contacto@sanjose.edu.ec",
    },
  });

  const colegioSantaMaria = await prisma.institution.create({
    data: {
      name: "Colegio Santa María Eufrasia",
      address: "Calle Guayaquil N5-23, Cuenca",
      phone: "+593072841567",
      email: "info@santamariaeufrasia.edu.ec",
    },
  });

  const escuelaLibertad = await prisma.institution.create({
    data: {
      name: "Escuela Fiscal Libertad",
      address: "Av. 9 de Octubre y Machala, Guayaquil",
      phone: "+593042567890",
      email: "admin@escuelalibertad.edu.ec",
    },
  });

  const institutoTecnologico = await prisma.institution.create({
    data: {
      name: "Instituto Tecnológico Superior Simón Bolívar",
      address: "Km 30.5 Vía Perimetral, Guayaquil",
      phone: "+593042269525",
      email: "contacto@itssb.edu.ec",
    },
  });

  console.log("✅ 4 instituciones creadas");

  // ========== ADMIN ==========
  console.log("\n👑 Creando administrador...");

  const admin = await prisma.user.create({
    data: {
      email: "admin@safepick.com",
      password: hashedPassword,
      name: "Administrador SafePick",
      role: UserRole.ADMIN,
      cedula: "1710034065", // Cédula válida de Pichincha
      phone: "+593991234567",
      isActive: true,
    },
  });
  console.log("✅ Admin creado:", admin.email);

  // ========== GESTORES ==========
  console.log("\n📋 Creando gestores...");

  const gestorSanJose = await prisma.user.create({
    data: {
      email: "gestor.sanjose@safepick.com",
      password: hashedPassword,
      name: "Carlos Mendoza Espinoza",
      role: UserRole.GESTOR,
      cedula: "1720408765", // Cédula válida Pichincha
      phone: "+593992345678",
      institutionId: colegioSanJose.id,
      isActive: true,
    },
  });

  const gestorSantaMaria = await prisma.user.create({
    data: {
      email: "gestor.santamaria@safepick.com",
      password: hashedPassword,
      name: "Laura Torres Villacís",
      role: UserRole.GESTOR,
      cedula: "0104567893", // Cédula válida Azuay
      phone: "+593983456789",
      institutionId: colegioSantaMaria.id,
      isActive: true,
    },
  });

  const gestorLibertad = await prisma.user.create({
    data: {
      email: "gestor.libertad@safepick.com",
      password: hashedPassword,
      name: "Miguel Ángel Ruiz Cedeño",
      role: UserRole.GESTOR,
      cedula: "0920457831", // Cédula válida Guayas
      phone: "+593994567890",
      institutionId: escuelaLibertad.id,
      isActive: true,
    },
  });

  // Gestor inactivo para pruebas
  const gestorInactivo = await prisma.user.create({
    data: {
      email: "gestor.inactivo@safepick.com",
      password: hashedPassword,
      name: "Pedro García Moreno",
      role: UserRole.GESTOR,
      cedula: "0930567842", // Cédula válida Guayas
      phone: "+593995678901",
      institutionId: institutoTecnologico.id,
      isActive: false,
    },
  });

  console.log("✅ 4 gestores creados (1 inactivo)");

  // ========== GUARDIAS ==========
  console.log("\n🛡️ Creando guardias...");

  const guardian1SanJose = await prisma.user.create({
    data: {
      email: "guardia1@sanjose.edu.ec",
      password: hashedPassword,
      name: "Roberto Hernández Pacheco",
      role: UserRole.GUARDIAN,
      cedula: "1730512947", // Cédula válida Pichincha
      phone: "+593996789012",
      institutionId: colegioSanJose.id,
      isActive: true,
    },
  });

  const guardian2SanJose = await prisma.user.create({
    data: {
      email: "guardia2@sanjose.edu.ec",
      password: hashedPassword,
      name: "Ana María López Andrade",
      role: UserRole.GUARDIAN,
      cedula: "1740623958", // Cédula válida Pichincha
      phone: "+593997890123",
      institutionId: colegioSanJose.id,
      isActive: true,
    },
  });

  const guardian1SantaMaria = await prisma.user.create({
    data: {
      email: "guardia1@santamariaeufrasia.edu.ec",
      password: hashedPassword,
      name: "Fernando Castro Ávila",
      role: UserRole.GUARDIAN,
      cedula: "0105678904", // Cédula válida Azuay
      phone: "+593988901234",
      institutionId: colegioSantaMaria.id,
      isActive: true,
    },
  });

  const guardian1Libertad = await prisma.user.create({
    data: {
      email: "guardia1@escuelalibertad.edu.ec",
      password: hashedPassword,
      name: "Marta Sánchez Delgado",
      role: UserRole.GUARDIAN,
      cedula: "0940678953", // Cédula válida Guayas
      phone: "+593989012345",
      institutionId: escuelaLibertad.id,
      isActive: true,
    },
  });

  // Guardia inactivo
  const guardiaInactivo = await prisma.user.create({
    data: {
      email: "guardia.inactivo@sanjose.edu.ec",
      password: hashedPassword,
      name: "José Martínez Guerrero",
      role: UserRole.GUARDIAN,
      cedula: "1750734069", // Cédula válida Pichincha
      phone: "+593990123456",
      institutionId: colegioSanJose.id,
      isActive: false,
    },
  });

  console.log("✅ 5 guardias creados (1 inactivo)");

  // ========== PADRES ==========
  console.log("\n👨‍👩‍👧‍👦 Creando padres...");

  // Padres del Colegio San José
  const parent1 = await prisma.user.create({
    data: {
      email: "maria.garcia@gmail.com",
      password: hashedPassword,
      name: "María García López",
      role: UserRole.PARENT,
      cedula: "1760845170", // Cédula válida Pichincha
      phone: "+593991234567",
      institutionId: colegioSanJose.id,
      isActive: true,
    },
  });

  const parent2 = await prisma.user.create({
    data: {
      email: "juan.perez@hotmail.com",
      password: hashedPassword,
      name: "Juan Pérez Martínez",
      role: UserRole.PARENT,
      cedula: "1770956281", // Cédula válida Pichincha
      phone: "+593992345678",
      institutionId: colegioSanJose.id,
      isActive: true,
    },
  });

  // Padres del Colegio Santa María
  const parent3 = await prisma.user.create({
    data: {
      email: "ana.rodriguez@outlook.com",
      password: hashedPassword,
      name: "Ana Rodríguez Sánchez",
      role: UserRole.PARENT,
      cedula: "0106789015", // Cédula válida Azuay
      phone: "+593983456789",
      institutionId: colegioSantaMaria.id,
      isActive: true,
    },
  });

  // Padres de Escuela Libertad
  const parent4 = await prisma.user.create({
    data: {
      email: "pedro.jimenez@yahoo.com",
      password: hashedPassword,
      name: "Pedro Jiménez Flores",
      role: UserRole.PARENT,
      cedula: "0950789064", // Cédula válida Guayas
      phone: "+593994567890",
      institutionId: escuelaLibertad.id,
      isActive: true,
    },
  });

  // Padre sin institución (para probar registro)
  const parent5 = await prisma.user.create({
    data: {
      email: "lucia.fernandez@gmail.com",
      password: hashedPassword,
      name: "Lucía Fernández Gómez",
      role: UserRole.PARENT,
      cedula: "1780067392", // Cédula válida Pichincha
      phone: "+593995678901",
      isActive: true,
    },
  });

  console.log("✅ 5 padres creados");

  // ========== NIÑOS ==========
  console.log("\n👶 Creando niños...");

  // Hijos de María García (San José)
  const child1 = await prisma.child.create({
    data: {
      name: "Sofía García",
      grade: "3° Primaria",
      school: "Unidad Educativa San José La Salle",
      parentId: parent1.id,
      institutionId: colegioSanJose.id,
    },
  });

  const child2 = await prisma.child.create({
    data: {
      name: "Lucas García",
      grade: "5° Primaria",
      school: "Unidad Educativa San José La Salle",
      parentId: parent1.id,
      institutionId: colegioSanJose.id,
    },
  });

  // Hijos de Juan Pérez (San José)
  const child3 = await prisma.child.create({
    data: {
      name: "Emma Pérez",
      grade: "2° Primaria",
      school: "Unidad Educativa San José La Salle",
      parentId: parent2.id,
      institutionId: colegioSanJose.id,
    },
  });

  // Hijos de Ana Rodríguez (Santa María)
  const child4 = await prisma.child.create({
    data: {
      name: "Diego Rodríguez",
      grade: "4° Primaria",
      school: "Colegio Santa María Eufrasia",
      parentId: parent3.id,
      institutionId: colegioSantaMaria.id,
    },
  });

  const child5 = await prisma.child.create({
    data: {
      name: "Valentina Rodríguez",
      grade: "1° Primaria",
      school: "Colegio Santa María Eufrasia",
      parentId: parent3.id,
      institutionId: colegioSantaMaria.id,
    },
  });

  // Hijos de Pedro Jiménez (Libertad)
  const child6 = await prisma.child.create({
    data: {
      name: "Mateo Jiménez",
      grade: "6° Primaria",
      school: "Escuela Fiscal Libertad",
      parentId: parent4.id,
      institutionId: escuelaLibertad.id,
    },
  });

  console.log("✅ 6 niños creados");

  // ========== ÓRDENES DE RETIRO CON CREDENCIALES TEMPORALES ==========
  console.log("\n📋 Creando órdenes de retiro...");

  // Orden 1: Pendiente - Sofía García (con credenciales temporales)
  const tempCode1 = generateTemporaryCode();
  const tempPassword1 = await bcrypt.hash(tempCode1, 10);
  const encryptedCode1 = CryptoUtil.encrypt(tempCode1);
  const expiresAt1 = calculateExpirationDate();

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
      name: "Roberto García Cevallos",
      cedula: "1790178403", // Cédula válida Pichincha
      phone: "+593996789012",
      relationship: "padre",
      withdrawalOrderId: order1.id,
      temporaryPassword: tempPassword1,
      encryptedCode: encryptedCode1,
      codeExpiresAt: expiresAt1,
      isActive: true,
    },
  });

  console.log(
    `✅ Orden 1 creada - Código temporal: ${tempCode1} (expira: ${expiresAt1.toLocaleString("es-EC")})`
  );

  // Orden 2: Validada - Lucas García (con credenciales temporales)
  const tempCode2 = generateTemporaryCode();
  const tempPassword2 = await bcrypt.hash(tempCode2, 10);
  const encryptedCode2 = CryptoUtil.encrypt(tempCode2);
  const expiresAt2 = calculateExpirationDate();

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
      name: "Carmen López Andrade",
      cedula: "1800289514", // Cédula válida Tungurahua
      phone: "+593997890123",
      relationship: "abuela",
      withdrawalOrderId: order2.id,
      temporaryPassword: tempPassword2,
      encryptedCode: encryptedCode2,
      codeExpiresAt: expiresAt2,
      isActive: true,
    },
  });

  console.log(
    `✅ Orden 2 creada - Código temporal: ${tempCode2} (expira: ${expiresAt2.toLocaleString("es-EC")})`
  );

  // Orden 3: Completada - Emma Pérez
  const order3 = await prisma.withdrawalOrder.create({
    data: {
      childId: child3.id,
      parentId: parent2.id,
      status: WithdrawalStatus.COMPLETED,
      qrCode: "QR-EMMA-003",
      withdrawalDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  });

  await prisma.picker.create({
    data: {
      name: "Juan Pérez Martínez",
      cedula: "1770956281", // Usa la misma cédula del padre
      phone: "+593992345678",
      relationship: "padre",
      withdrawalOrderId: order3.id,
      isActive: false,
    },
  });

  // Orden 4: Pendiente - Diego Rodríguez (Santa María)
  const tempCode4 = generateTemporaryCode();
  const tempPassword4 = await bcrypt.hash(tempCode4, 10);
  const encryptedCode4 = CryptoUtil.encrypt(tempCode4);
  const expiresAt4 = calculateExpirationDate();

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
      name: "Miguel Rodríguez Vera",
      cedula: "0107890126", // Cédula válida Azuay
      phone: "+593988901234",
      relationship: "tío",
      withdrawalOrderId: order4.id,
      temporaryPassword: tempPassword4,
      encryptedCode: encryptedCode4,
      codeExpiresAt: expiresAt4,
      isActive: true,
    },
  });

  console.log(
    `✅ Orden 4 creada - Código temporal: ${tempCode4} (expira: ${expiresAt4.toLocaleString("es-EC")})`
  );

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
      cedula: "0106789015", // Usa la misma cédula de la madre
      phone: "+593983456789",
      relationship: "madre",
      withdrawalOrderId: order5.id,
      isActive: false,
    },
  });

  console.log("✅ 5 órdenes de retiro creadas");

  // ========== RESUMEN ==========
  console.log("\n🎉 Seed completado exitosamente!\n");
  console.log(
    "═══════════════════════════════════════════════════════════════"
  );
  console.log("📊 RESUMEN DE DATOS CREADOS:");
  console.log(
    "═══════════════════════════════════════════════════════════════"
  );
  console.log("   📚 4 Instituciones");
  console.log("   👑 1 Admin");
  console.log("   📋 4 Gestores (1 inactivo)");
  console.log("   🛡️  5 Guardias (1 inactivo)");
  console.log("   👨‍👩‍👧‍👦 5 Padres");
  console.log("   👶 6 Niños");
  console.log("   📝 5 Órdenes de retiro");
  console.log(
    "═══════════════════════════════════════════════════════════════\n"
  );

  console.log("🔐 CREDENCIALES DE PRUEBA (contraseña: Password123!):");
  console.log(
    "═══════════════════════════════════════════════════════════════"
  );
  console.log("\n👑 ADMIN:");
  console.log("   └─ admin@safepick.com");

  console.log("\n📋 GESTORES:");
  console.log("   ├─ gestor.sanjose@safepick.com     (U.E. San José La Salle)");
  console.log(
    "   ├─ gestor.santamaria@safepick.com  (Colegio Santa María Eufrasia)"
  );
  console.log(
    "   ├─ gestor.libertad@safepick.com    (Escuela Fiscal Libertad)"
  );
  console.log(
    "   └─ gestor.inactivo@safepick.com    (Instituto Tecnológico Simón Bolívar - INACTIVO)"
  );

  console.log("\n🛡️  GUARDIAS:");
  console.log(
    "   ├─ guardia1@sanjose.edu.ec            (U.E. San José La Salle)"
  );
  console.log(
    "   ├─ guardia2@sanjose.edu.ec            (U.E. San José La Salle)"
  );
  console.log(
    "   ├─ guardia1@santamariaeufrasia.edu.ec (Colegio Santa María Eufrasia)"
  );
  console.log(
    "   ├─ guardia1@escuelalibertad.edu.ec    (Escuela Fiscal Libertad)"
  );
  console.log("   └─ guardia.inactivo@sanjose.edu.ec    (INACTIVO)");

  console.log("\n👨‍👩‍👧‍👦 PADRES:");
  console.log("   ├─ maria.garcia@gmail.com    (U.E. San José La Salle)");
  console.log("   ├─ juan.perez@hotmail.com    (U.E. San José La Salle)");
  console.log("   ├─ ana.rodriguez@outlook.com (Colegio Santa María Eufrasia)");
  console.log("   ├─ pedro.jimenez@yahoo.com   (Escuela Fiscal Libertad)");
  console.log("   └─ lucia.fernandez@gmail.com (Sin institución)");

  console.log(
    "\n═══════════════════════════════════════════════════════════════"
  );
  console.log("📱 Códigos temporales de pickers mostrados arriba");
  console.log(
    "═══════════════════════════════════════════════════════════════\n"
  );
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
