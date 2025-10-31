# Sincronización de Usuarios con Chatwoot

Esta guía explica cómo vincular el login de tu aplicación Legal Studio con Chatwoot para que cada usuario vea solo sus conversaciones asignadas.

## 🎯 Objetivo

Conectar los usuarios de Legal Studio con los agentes de Chatwoot para:
- Cada usuario ve solo las conversaciones que Chatwoot le ha asignado
- Los administradores ven todas las conversaciones
- Sincronización automática basada en email

## 📋 Prerrequisitos

1. ✅ SQL migration ejecutada en Supabase (`sql/09-user-chatwoot-mapping.sql`)
2. ✅ Variables de entorno configuradas en `.env.local`:
   ```env
   CHATWOOT_ACCESS_TOKEN=tu_token
   CHATWOOT_BASE_URL=https://app.chatwoot.com
   CHATWOOT_ACCOUNT_ID=1
   ```
3. ✅ Usuarios registrados en Legal Studio con el **mismo email** que usan en Chatwoot

## 🚀 Cómo funciona

### Paso 1: Crear usuarios en Legal Studio

Los usuarios deben registrarse en tu app usando `/register` con el **mismo email** que tienen en Chatwoot como agentes.

Ejemplo:
- Agente en Chatwoot: `juan@bufete.com`
- Usuario en Legal Studio: debe registrarse con `juan@bufete.com`

### Paso 2: Sincronizar agentes (Solo Admin)

1. Ve a `/dashboard/chatwoot/settings`
2. Haz clic en **"Sincronizar Agentes"**
3. El sistema:
   - Obtiene la lista de agentes desde Chatwoot API
   - Busca usuarios en Legal Studio con el mismo email
   - Actualiza los campos `chatwoot_agent_id`, `chatwoot_agent_email`, `chatwoot_agent_name`
   - Activa `chatwoot_sync_enabled = true`

### Paso 3: Usuarios ven solo sus conversaciones

Una vez sincronizados:
- **Usuarios regulares**: Solo ven conversaciones donde `assignee_email` coincide con su email
- **Administradores**: Ven todas las conversaciones
- **Usuarios sin sincronizar**: Ven todas las conversaciones

## 🔧 Arquitectura Técnica

### Base de Datos

#### Tabla `users` (actualizada)
```sql
ALTER TABLE users 
ADD COLUMN chatwoot_agent_id INTEGER,
ADD COLUMN chatwoot_agent_email TEXT,
ADD COLUMN chatwoot_agent_name TEXT,
ADD COLUMN chatwoot_sync_enabled BOOLEAN DEFAULT true;
```

#### Funciones SQL
- `get_user_chatwoot_conversations(user_email)`: Obtiene conversaciones de un usuario
- `get_all_chatwoot_conversations()`: Obtiene todas las conversaciones (para admins)

### API Endpoints

#### `GET /api/chatwoot/agents/sync`
Ver estado de sincronización de usuarios
- Requiere autenticación
- Retorna lista de usuarios y su estado de sync

#### `POST /api/chatwoot/agents/sync`
Sincronizar agentes de Chatwoot con usuarios
- Solo administradores
- Conecta con Chatwoot API
- Actualiza usuarios por email

#### `GET /api/chatwoot/conversations`
Obtener conversaciones (filtradas por usuario)
- Usuarios regulares: solo sus conversaciones
- Admins: todas las conversaciones
- Usa las funciones SQL según el rol

### Flujo de Filtrado

```
Usuario hace login
    ↓
GET /api/chatwoot/conversations
    ↓
Verifica rol del usuario en tabla users
    ↓
¿Es admin? 
    → Sí: llama get_all_chatwoot_conversations()
    → No: ¿Tiene sync_enabled?
        → Sí: llama get_user_chatwoot_conversations(email)
        → No: llama get_all_chatwoot_conversations()
    ↓
Dashboard muestra conversaciones filtradas
```

## 📊 Interfaz de Usuario

### Dashboard de Conversaciones (`/dashboard/chatwoot`)

Muestra un indicador según el rol:
- **Admin**: "Viendo todas las conversaciones (Admin)"
- **Usuario sincronizado**: "Viendo conversaciones asignadas a: usuario@email.com"
- **Usuario sin sync**: "Viendo todas las conversaciones"

### Página de Configuración (`/dashboard/chatwoot/settings`)

Solo accesible para administradores:
- Estadísticas de sincronización
- Lista de usuarios con estado
- Botón "Sincronizar Agentes"
- Instrucciones de uso

## 🧪 Pruebas

### 1. Verificar sincronización
```bash
# En Supabase SQL Editor
SELECT 
  email, 
  full_name, 
  role, 
  chatwoot_agent_email, 
  chatwoot_sync_enabled 
FROM users;
```

### 2. Probar filtro de conversaciones
```bash
# Como usuario regular logueado
curl http://localhost:3000/api/chatwoot/conversations

# Debe retornar solo conversaciones con assignee_email = tu email
```

### 3. Verificar función SQL
```sql
-- Ver conversaciones de un usuario específico
SELECT * FROM get_user_chatwoot_conversations('juan@bufete.com');

-- Ver todas las conversaciones
SELECT * FROM get_all_chatwoot_conversations();
```

## 🔐 Seguridad

- Solo administradores pueden sincronizar agentes
- Cada usuario solo ve conversaciones asignadas a su email
- Los tokens de Chatwoot están en variables de entorno (servidor)
- Row Level Security (RLS) aplicado en tablas de Chatwoot

## 🐛 Troubleshooting

### Problema: Usuario no ve conversaciones

**Solución**:
1. Verifica que el email en Legal Studio sea exactamente igual al de Chatwoot
2. Ejecuta la sincronización desde `/dashboard/chatwoot/settings`
3. Verifica que `chatwoot_sync_enabled = true` en la base de datos

### Problema: Sincronización falla

**Solución**:
1. Verifica las variables de entorno de Chatwoot
2. Confirma que el `CHATWOOT_ACCESS_TOKEN` es válido
3. Revisa los logs en la consola del navegador

### Problema: Admin no ve todas las conversaciones

**Solución**:
1. Verifica que el rol sea exactamente `'admin'` en la tabla `users`
2. Revisa la respuesta de `/api/chatwoot/conversations` en DevTools

## 📝 Ejemplo Completo

### Escenario: Bufete con 3 usuarios

1. **Maria (Admin)** - maria@bufete.com
   - Ve todas las conversaciones
   - Puede sincronizar agentes

2. **Juan (Abogado)** - juan@bufete.com
   - Solo ve conversaciones asignadas a él en Chatwoot
   - Necesita estar sincronizado

3. **Pedro (Asistente)** - pedro@bufete.com
   - Solo ve conversaciones asignadas a él en Chatwoot
   - Necesita estar sincronizado

### Pasos:
1. Todos se registran en Legal Studio con sus emails
2. Maria entra a `/dashboard/chatwoot/settings`
3. Maria hace clic en "Sincronizar Agentes"
4. Sistema vincula Juan y Pedro con sus agentes de Chatwoot
5. Ahora cada uno ve solo sus conversaciones

## 🔄 Mantenimiento

### Agregar nuevo usuario
1. Usuario se registra en Legal Studio
2. Admin lo agrega como agente en Chatwoot (mismo email)
3. Admin ejecuta "Sincronizar Agentes"
4. Listo ✅

### Cambiar email de usuario
1. Actualizar email en Legal Studio
2. Actualizar email en Chatwoot
3. Ejecutar "Sincronizar Agentes"

## 🎉 Resultado Final

✅ Login único en Legal Studio
✅ Cada usuario ve solo sus conversaciones de Chatwoot
✅ Administradores tienen vista completa
✅ Sincronización automática por email
✅ Interfaz intuitiva para gestión
