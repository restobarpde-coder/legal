# Agente AI Legal - Documentación

## Overview

El agente AI es un asistente legal inteligente con acceso a:

1. **Base de datos** — Supabase (casos, documentos, notas, tareas)
2. **Web search** — Tavily (jurisprudencia, precedentes, normativa)

Puede:
- Analizar casos existentes
- Buscar jurisprudencia y precedentes en internet
- Generar resúmenes y análisis
- Crear tareas y notas automáticamente

## Acceso

**Botón "Agente"** en la barra superior del dashboard (ícono de chat).

El panel aparece como un sidebar en la derecha de la pantalla, disponible desde cualquier página del dashboard.

## Capacidades Actuales

### 📊 Lectura de Datos (Casos)
- `get_cases` - Obtiene lista de tus casos
- `get_case_details` - Información completa de un caso
- `get_case_documents` - Documentos de un caso
- `get_case_notes` - Notas de un caso
- `get_case_tasks` - Tareas de un caso

### ⚖️ Normativa Uruguaya (IMPO)
- `search_impo` - Consulta leyes, decretos, constitución y resoluciones en el Banco de Datos oficial de IMPO
  - Entiende consultas en lenguaje natural: "ley 19889", "decreto 356/2018", "artículo 72 de la constitución"
  - Fuente oficial para normativa uruguaya
  - Nunca inventa artículos ni normas

### 🌐 Búsqueda Web
- `search_web` - Busca jurisprudencia, precedentes, doctrina y contexto general

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

### 3. Consultar normas uruguayas
```
"¿Qué dice la ley 19889 sobre..."

Agente:
→ Consulta IMPO (fuente oficial)
→ Trae el texto exacto de la norma
→ Explica artículos relevantes
→ Fuente: IMPO (nunca inventa)
```

### 4. Buscar jurisprudencia y contexto
```
"Busca jurisprudencia sobre derechos de autor"

Agente:
→ Busca en internet con Tavily
→ Encuentra precedentes relevantes
→ Resume hallazgos y contexto general
```

### 5. Análisis integrado
```
"¿Cómo aplicaría la ley 19172 al caso ABC?"

Agente:
→ Lee el caso de la BD
→ Consulta ley 19172 en IMPO
→ Busca jurisprudencia relacionada
→ Proporciona análisis completo
```

## Próximas Mejoras

### Fase 3: Generación de Documentos
- Generar escritos legales
- Crear cronogramas procesales
- Redactar correspondencia

### Fase 4: Análisis Avanzado
- Análisis predictivo de casos
- Identificación de riesgos
- Recomendaciones de estrategia

## Arquitectura Técnica

### Backend
- **Endpoint**: `POST /api/agent/chat`
- **Modelo**: OpenAI GPT-4o
- **Loop Agentico**: Implementa tool-use de forma nativa

### Integraciones
- **Supabase** — Acceso a base de datos de casos
- **IMPO** — Banco de Datos de normativa uruguaya
- **Tavily** — Web search para jurisprudencia y precedentes
- **OpenAI** — LLM y orquestación de herramientas

### Herramientas Disponibles
Definidas en `app/api/agent/chat/route.ts`:
```typescript
const tools = [
  // Casos
  'get_cases',
  'get_case_details',
  'get_case_documents',
  'get_case_notes',
  'get_case_tasks',
  
  // Acciones
  'create_task',
  'create_note',
  
  // Búsquedas
  'search_web',        // Jurisprudencia, precedentes
  'search_impo',       // Normativa uruguaya (NEW)
]
```

## Variables de Entorno Requeridas

```bash
# OpenAI (declarations + agent + web search)
OPENAI_API_KEY=sk_...

# Tavily (legal web search)
TAVILY_API_KEY=tvly_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...  # Necesario para acceso de servidor
```

### Cómo obtener las claves:
1. **OPENAI_API_KEY** — https://platform.openai.com/api-keys
2. **TAVILY_API_KEY** — https://tavily.com (registrarse y crear API key)

## Limitaciones Actuales

1. **Scope de usuario**: El agente solo accede a casos del usuario autenticado
2. **Sin generación de documentos**: Solo lectura, creación básica y análisis
3. **Contexto limitado**: Mantiene historial dentro de la sesión
4. **Tavily gratis**: Primeros usos gratis, luego requiere plan pago

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
