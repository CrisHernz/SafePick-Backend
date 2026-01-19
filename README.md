# SafePick Backend

API REST para el sistema de retiro escolar seguro SafePick.

## 🎯 Funcionalidad Principal

Sistema que permite a padres autorizar el retiro de sus hijos por terceros de forma segura:

- **Autenticación JWT** - Login para padres, guardias, gestores y administradores
- **Gestión de Órdenes de Retiro** - Crear, validar y completar retiros
- **Credenciales Temporales** - Códigos OTP de 6 dígitos para pickers
- **Códigos QR** - Generación y validación de QR para retiros
- **Notificaciones Telegram** - Alertas al completar retiros (opcional)
- **RBAC** - Control de acceso basado en roles

## 🔐 Roles del Sistema

| Rol          | Permisos                                           |
| ------------ | -------------------------------------------------- |
| **ADMIN**    | Gestión total: instituciones, gestores, usuarios   |
| **GESTOR**   | Gestión de su institución: guardias, padres, niños |
| **GUARDIAN** | Escanear QR y completar retiros                    |
| **PARENT**   | Crear órdenes, autorizar pickers                   |
| **PICKER**   | Acceso temporal para retirar niños                 |

## 🛠️ Tecnologías

- NestJS + TypeScript
- Prisma ORM + PostgreSQL
- JWT + Passport
- bcrypt (hash passwords)
- AES-256-CBC (cifrado de códigos)

## ⚡ Instalación

```bash
# Instalar dependencias
npm install
```

## 🚀 Ejecución

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod

# Base de datos
npx prisma migrate deploy  # Aplicar migraciones
npx prisma db seed         # Poblar datos de prueba
```

## 📡 Endpoints Principales

### Autenticación

- `POST /auth/register` - Registro de usuarios
- `POST /auth/login` - Login (email + password)
- `POST /auth/login-picker` - Login picker (cédula + código OTP)
- `GET /auth/me` - Perfil del usuario

### Retiros

- `POST /withdrawals` - Crear orden de retiro
- `GET /withdrawals` - Listar órdenes
- `POST /withdrawals/:id/credentials` - Generar credenciales picker
- `POST /withdrawals/validate-qr` - Validar QR (guardia)
- `POST /withdrawals/guardian/scan-and-complete` - Completar retiro

### Instituciones

- `GET /institutions/public` - Lista pública
- `GET /institutions` - Lista con estadísticas (admin/gestor)
- `POST /institutions` - Crear institución (admin)

### Usuarios

- `GET /users` - Listar usuarios (admin)
- `POST /users` - Crear usuario
- `PATCH /users/:id/activate` - Activar usuario
- `PATCH /users/:id/deactivate` - Desactivar usuario

## 🔒 Seguridad Implementada

- ✅ Contraseñas hasheadas con bcrypt (factor 10)
- ✅ JWT firmado con secreto de 256 bits
- ✅ Códigos temporales cifrados con AES-256-CBC
- ✅ Validación de cédula ecuatoriana (algoritmo módulo 10)
- ✅ Guards de autenticación y autorización
- ✅ DTOs con class-validator para sanitización
- ✅ Mensajes de error genéricos (sin enumeración)

## 📦 Scripts Disponibles

```bash
npm run start:dev    # Desarrollo con hot-reload
npm run build        # Compilar para producción
npm run start:prod   # Ejecutar build de producción
npm run lint         # Ejecutar ESLint
npm run test         # Ejecutar tests
```

## 👤 Credenciales de Prueba

Contraseña para todos: `Password123!`

- **Admin:** admin@safepick.com
- **Gestor:** gestor.sanjose@safepick.com
- **Guardia:** guardia1@sanjose.edu.ec
- **Padre:** cristian.hernandez@gmail.com

---

**Puerto por defecto:** 3001
