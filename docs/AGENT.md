# Agente AI Legal - Documentación

## Overview

El agente AI es un asistente legal inteligente que tiene acceso a toda la información en Supabase (casos, documentos, notas, tareas) y puede ayudarte a:

- Analizar casos existentes
- Buscar información relacionada
- Generar resúmenes y análisis
- Crear tareas y notas automáticamente

## Acceso

**Botón "Agente"** en la barra superior del dashboard (ícono de chat).

El panel aparece como un sidebar en la derecha de la pantalla, disponible desde cualquier página del dashboard.

## Capacidades Actuales (MVP)

### 📊 Lectura de Datos
- `get_cases` - Obtiene lista de tus casos
- `get_case_details` - Información completa de un caso
- `get_case_documents` - Documentos de un caso
- `get_case_notes` - Notas de un caso
- `get_case_tasks` - Tareas de un caso

### ✍️ Acciones Autónomas
- `create_task` - Crea una nueva tarea en un caso
- `create_note` - Crea una nueva nota en un caso

## Ejemplos de Uso

### 1. Analizar un caso
```
"Analiza el caso 123456 y dame un resumen de lo que hay"

Agente:
→ Obtiene detalles del caso
→ Lee documentos, notas y tareas
→ Proporciona un análisis completo
```

### 2. Buscar tareas pendientes
```
"¿Qué tareas están pendientes en el caso ABC?"

Agente:
→ Busca el caso
→ Filtra tareas pendientes
→ Enumera con fechas y prioridades
```

### 3. Crear acciones automáticamente
```
"Crea una tarea para revisar los documentos del caso XYZ"

Agente:
→ Crea una tarea nueva en el caso
→ Confirma que fue creada
```

## Próximas Mejoras

### Fase 2: Web Search
- Buscar jurisprudencia
- Encontrar precedentes legales
- Consultar normativa actualizada

### Fase 3: Generación de Documentos
- Generar escritos
- Crear cronogramas procesales
- Redactar correspondencia

### Fase 4: Análisis Avanzado
- Análisis predictivo de casos
- Identificación de riesgos
- Recomendaciones de estrategia

## Arquitectura Técnica

### Backend
- **Endpoint**: `POST /api/agent/chat`
- **Modelo**: Claude (gpt-4o-mini)
- **Loop Agentico**: Implementa tool-use de forma nativa

### MCP (Model Context Protocol)
Utiliza Supabase directamente como "MCP" para que el agente acceda a datos.

### Herramientas Disponibles
Definidas en `app/api/agent/chat/route.ts`:
```typescript
const tools = [
  'get_cases',
  'get_case_details',
  'get_case_documents',
  'get_case_notes',
  'get_case_tasks',
  'create_task',
  'create_note',
]
```

## Variables de Entorno Requeridas

```bash
OPENAI_API_KEY=sk_...  # Para Claude API
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...  # Necesario para acceso de servidor
```

## Limitaciones Actuales

1. **Scope de usuario**: El agente solo accede a casos del usuario autenticado
2. **Sin web search**: Busca solo en tu base de datos
3. **Sin generación de documentos**: Solo lectura y creación básica
4. **Contexto limitado**: Mantiene historial dentro de la sesión

## Troubleshooting

### El agente no responde
- Verifica que `OPENAI_API_KEY` esté configurada
- Revisa los logs en `console`

### Error al crear tareas/notas
- Asegúrate que el `case_id` sea válido
- Verifica permisos en Supabase RLS

### Respuestas lentas
- El agente puede llamar múltiples herramientas
- Esto es normal y esperado (más datos = mejor análisis)

## Feedback y Mejoras

Por favor reporta bugs o sugiere mejoras en el panel del agente.
