# 🏛️ Estudio Jurídico MVP - Sistema de Gestión Legal

Sistema completo de gestión para estudios jurídicos desarrollado con Next.js 14 y Supabase. Diseñado para equipos pequeños y medianos (3-5 personas).

## ✨ Características Principales

- 👥 **Gestión de Clientes** - Registro completo de información de clientes
- 📋 **Casos Legales** - Seguimiento detallado de casos con estados y prioridades
- ✅ **Tareas** - Sistema de tareas asignables con fechas de vencimiento
- 📄 **Documentos** - Almacenamiento y gestión de documentos legales
- ⏰ **Registro de Tiempo** - Seguimiento de horas trabajadas para facturación
- 🔐 **Autenticación Completa** - Sistema de usuarios con roles
- 🛡️ **Seguridad RLS** - Row Level Security para protección de datos

## 🚀 Inicio Rápido

### 1. Configuración del Proyecto

```bash
# Clonar el repositorio
git clone <tu-repositorio>
cd legal-studio-app

# Instalar dependencias
npm install
```

### 2. Configuración de Supabase

1. **Crear proyecto en Supabase:**
   - Ve a [supabase.com](https://supabase.com)
   - Crea una nueva cuenta/proyecto
   - Copia la URL y la clave anónima

2. **Configurar variables de entorno:**

Crea un archivo `.env.local` con:

```env
# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui

# Redirect URLs
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
```

### 3. Configuración de la Base de Datos

**IMPORTANTE:** Ejecuta los scripts SQL en tu dashboard de Supabase en este orden exacto:

1. Ve a tu proyecto de Supabase → **SQL Editor**
2. Ejecuta los scripts en orden:

```sql
-- 1. Tipos personalizados
-- Contenido del archivo: scripts/01-types.sql

-- 2. Tablas principales
-- Contenido del archivo: scripts/02-tables.sql

-- 3. Funciones de base de datos
-- Contenido del archivo: scripts/03-functions.sql

-- 4. Políticas de seguridad (RLS)
-- Contenido del archivo: scripts/04-rls-policies.sql

-- 5. Configuración de almacenamiento
-- Contenido del archivo: scripts/05-storage.sql

-- 6. Datos de prueba (opcional)
-- Contenido del archivo: scripts/06-seed-data.sql
```

### 4. Verificar la Configuración

```bash
# Verificar que las tablas se crearon correctamente
node check-database.js

# Si hay problemas, usar el script de debug
node debug-supabase.js
```

### 5. Ejecutar la Aplicación

```bash
# Modo desarrollo
npm run dev

# La aplicación estará disponible en http://localhost:3000
```

## 📋 Flujo de Uso

### Primer Uso

1. **Registro de Usuario:**
   - Ve a `/register`
   - Crea tu cuenta de administrador

2. **Crear Primer Cliente:**
   - Dashboard → Clientes → Nuevo Cliente
   - Completa la información del cliente

3. **Crear Primer Caso:**
   - Dashboard → Casos → Nuevo Caso
   - Asocia el caso al cliente creado

4. **Gestionar Tareas:**
   - Crea tareas relacionadas con los casos
   - Asigna fechas de vencimiento y prioridades

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico

- **Frontend:** Next.js 14 (App Router)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **UI:** shadcn/ui + Tailwind CSS
- **Autenticación:** Supabase Auth
- **Tipado:** TypeScript

### Estructura de Carpetas

```
├── app/                    # App Router de Next.js
│   ├── dashboard/         # Panel principal (protegido)
│   │   ├── cases/         # Gestión de casos
│   │   ├── clients/       # Gestión de clientes
│   │   ├── tasks/         # Gestión de tareas
│   │   ├── documents/     # Gestión de documentos
│   │   └── time/          # Registro de tiempo
│   ├── login/             # Página de login
│   └── register/          # Página de registro
├── components/            # Componentes reutilizables
│   ├── ui/               # Componentes de shadcn/ui
│   ├── dashboard-sidebar.tsx
│   └── dashboard-header.tsx
├── lib/                   # Utilidades
│   ├── supabase/         # Configuración de Supabase
│   ├── auth.ts           # Utilidades de autenticación
│   └── utils.ts          # Utilidades generales
├── scripts/              # Scripts SQL
│   ├── 01-types.sql      # Tipos personalizados
│   ├── 02-tables.sql     # Tablas principales
│   ├── 03-functions.sql  # Funciones de BD
│   ├── 04-rls-policies.sql # Políticas de seguridad
│   ├── 05-storage.sql    # Configuración de storage
│   └── 06-seed-data.sql  # Datos de prueba
└── middleware.ts         # Middleware de autenticación
```

### Base de Datos

#### Tablas Principales

- **users** - Perfiles de usuarios del estudio
- **clients** - Información de clientes
- **cases** - Casos legales
- **case_members** - Relación usuarios-casos (acceso)
- **tasks** - Tareas específicas por caso
- **documents** - Documentos asociados
- **time_entries** - Registro de tiempo para facturación
- **notes** - Notas de casos y clientes

#### Seguridad

- **Row Level Security (RLS)** habilitado en todas las tablas
- Control de acceso basado en membresía de casos
- Solo miembros del caso pueden ver información relacionada

## 🔧 Desarrollo

### Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Linting
npm run lint

# Verificar base de datos
node check-database.js

# Debug Supabase
node debug-supabase.js

# Agregar componentes shadcn/ui
npx shadcn@latest add [component-name]
```

### Agregar Nuevas Funcionalidades

1. **Nueva página:** Crea archivo en `app/dashboard/nueva-seccion/page.tsx`
2. **Actualizar sidebar:** Modifica `components/dashboard-sidebar.tsx`
3. **Nuevas tablas:** Crea script SQL numerado secuencialmente
4. **Actualizar RLS:** Modifica políticas según necesidades

## 🐛 Troubleshooting

### Problemas Comunes

1. **Error "Table doesn't exist":**
   - Ejecuta los scripts SQL en orden
   - Verifica con `node check-database.js`

2. **RLS blocking queries:**
   - Revisa políticas en `04-rls-policies.sql`
   - Verifica que el usuario esté en `case_members`

3. **Error de autenticación:**
   - Verifica variables de entorno
   - Revisa configuración del middleware

4. **No se muestran datos:**
   - Las tablas están vacías (normal en instalación nueva)
   - Crea datos usando la interfaz o ejecuta `06-seed-data.sql`

### Debug

```bash
# Verificar estado de la BD
node debug-supabase.js

# Ver logs de Next.js
npm run dev

# Revisar consola del navegador para errores de cliente
```

## 📊 Características Específicas para Estudios Jurídicos

### Tipos de Casos
- Contratos comerciales
- Divorcios y familia
- Derecho penal
- Derecho laboral
- Disputas comerciales

### Tipos de Documentos
- Contratos
- Escritos judiciales
- Evidencias
- Correspondencia
- Presentaciones judiciales

### Tipos de Tareas
- Investigación legal
- Revisión de documentos
- Presentaciones judiciales
- Reuniones con clientes
- Preparación de casos

### Sistema de Facturación
- Registro de horas por caso
- Tarifas personalizables
- Seguimiento de tiempo facturable vs no facturable
- Reportes de facturación

## 🔒 Seguridad y Privacidad

- **Encriptación en tránsito y reposo** (Supabase)
- **Autenticación segura** con tokens JWT
- **Row Level Security** para aislamiento de datos
- **Control de acceso granular** por caso
- **Respaldo automático** (Supabase)

## 📝 Configuración de Producción

### Variables de Entorno para Producción

```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_production_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_production_key
SUPABASE_SERVICE_ROLE_KEY=tu_production_service_role_key
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
```

### Deploy

```bash
# Build de producción
npm run build

# Deploy en Vercel (recomendado para Next.js)
npm install -g vercel
vercel --prod
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

Si necesitas ayuda:

1. Revisa la sección de Troubleshooting
2. Ejecuta los scripts de debug
3. Revisa los logs de la aplicación
4. Consulta la documentación de [Next.js](https://nextjs.org/docs) y [Supabase](https://supabase.com/docs)

---

**Desarrollado para estudios jurídicos modernos** 🏛️⚖️
