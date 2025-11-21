# 🚀 Guía de Optimización de Performance - Legal Studio App

## 🚨 Hallazgos Críticos (Alta Severidad)

• **Dependencias innecesarias**: Svelte, Vue, Remix incluidos sin uso (~2MB extra)
• **Imágenes no optimizadas**: `unoptimized: true` en next.config.mjs
• **TypeScript/ESLint deshabilitados**: `ignoreBuildErrors: true` elimina optimizaciones
• **Queries N+1**: Fetching `case_members` y `clients` por separado en algunos endpoints
• **TanStack Query mal configurado**: `refetchInterval: 30000` causa refetches innecesarios
• **Sin caché HTTP**: API routes no implementan headers de caché
• **Over-fetching**: `select(*)` en queries de Supabase

## 📋 Plan de Acción por Prioridad

### 🔴 ALTA PRIORIDAD (Impacto: Alto, Esfuerzo: Bajo)

#### 1. Limpieza de dependencias (~60% reducción bundle)
```bash
npm uninstall @remix-run/react @sveltejs/kit svelte vue vue-router ogl
npm uninstall dotenv # innecesario en Next.js
```

#### 2. Configuración Next.js optimizada
```javascript
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remover estas líneas peligrosas:
  // eslint: { ignoreDuringBuilds: true },
  // typescript: { ignoreBuildErrors: true },
  
  // Optimizaciones críticas:
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000,
  },
  compress: true,
  poweredByHeader: false,
  
  // Optimizaciones experimentales
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-*'],
  },
  
  // Headers para caché
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=60, stale-while-revalidate=300' },
        ],
      },
    ];
  },
}

export default nextConfig
```

#### 3. TanStack Query optimizado
```typescript
// components/providers/query-provider.tsx
const [queryClient] = useState(() =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 15, // 15min (era 5min)
        gcTime: 1000 * 60 * 30, // 30min garbage collection
        refetchOnWindowFocus: false, // era true - causa refetches innecesarios
        refetchOnMount: false, // solo si stale
        retry: 1,
        networkMode: 'online',
      },
      mutations: {
        retry: 1,
        networkMode: 'online',
      },
    },
  })
)
```

### 🟡 MEDIA PRIORIDAD (Impacto: Alto, Esfuerzo: Medio)

#### 4. Optimización queries Supabase
```typescript
// app/api/cases/route.ts - Reemplazar query actual
let query = supabase
  .from('cases')
  .select(`
    id, title, status, priority, created_at,
    client_id,
    clients!inner (
      id, name, company
    )
  `)
  .in('id', caseIds)
  .order('created_at', { ascending: false })
  .limit(50) // Paginación crítica
```

#### 5. Hooks optimizados con select
```typescript
// hooks/use-cases.ts
export function useCases(searchQuery?: string, statusFilter?: string, priorityFilter?: string) {
  return useQuery({
    queryKey: ['cases', searchQuery, statusFilter, priorityFilter],
    queryFn: async (): Promise<Case[]> => {
      const params = new URLSearchParams()
      if (searchQuery) params.append('q', searchQuery)
      if (statusFilter) params.append('status', statusFilter)  
      if (priorityFilter) params.append('priority', priorityFilter)
      
      const response = await fetch(`/api/cases?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch cases')
      return response.json()
    },
    staleTime: 1000 * 60 * 10, // 10min para esta query específica
    select: (data) => data, // Agregar transformaciones aquí si necesario
    // Eliminar refetchInterval completamente
  })
}
```

### 🟢 BAJA PRIORIDAD (Impacto: Medio, Esfuerzo: Alto)

#### 6. Prefetching inteligente
```typescript
// En layout.tsx o componentes de navegación
import { useQueryClient } from '@tanstack/react-query'

function Navigation() {
  const queryClient = useQueryClient()
  
  const prefetchCases = () => {
    queryClient.prefetchQuery({
      queryKey: ['cases'],
      queryFn: () => fetch('/api/cases').then(res => res.json()),
      staleTime: 1000 * 60 * 5,
    })
  }
  
  return (
    <Link 
      href="/dashboard" 
      onMouseEnter={prefetchCases} // Prefetch al hover
      onFocus={prefetchCases}
    >
      Dashboard
    </Link>
  )
}
```

## 🎯 Comandos de Auditoría y Medición

### Análisis actual de bundles
```bash
npm run build -- --profile
npx @next/bundle-analyzer
```

### Análisis de dependencias
```bash
npx depcheck
npm ls --depth=0 --prod-only
npx bundle-phobia-cli
```

### Performance testing
```bash
# Lighthouse CI
npm install -g @lhci/cli
lhci collect --url="http://localhost:3000" --numberOfRuns=3

# Load testing API
npx autocannon -d 20 -c 100 http://localhost:3000/api/cases
```

## 📊 Métricas Objetivo

| Métrica | Actual (est.) | Objetivo |
|---------|---------------|----------|
| Bundle JS | ~800KB | <400KB |
| LCP | ~3.5s | <2.5s |
| API Response | ~200ms | <100ms |
| Queries/page | 5-8 | 2-3 |

## ✅ Checklist CI/CD

### Comandos para package.json
```json
"scripts": {
  "build": "next build",
  "dev": "next dev",
  "lint": "next lint --fix",
  "typecheck": "tsc --noEmit",
  "start": "next start",
  "analyze": "ANALYZE=true npm run build",
  "perf:audit": "lhci collect --url=http://localhost:3000",
  "perf:api": "autocannon -d 10 -c 50 http://localhost:3000/api/cases",
  "db:seed": "cat scripts/*.sql | psql \"$DATABASE_URL\"",
  "db:reset": "psql \"$DATABASE_URL\" -c 'drop schema public cascade; create schema public;' && npm run db:seed"
}
```

### Pre-commit hooks (.husky/pre-commit)
```bash
#!/bin/sh
npm run typecheck
npm run lint
npm run build
```

### Criterios de aceptación PR
- [ ] Bundle size < 400KB gzipped
- [ ] API responses < 100ms promedio
- [ ] Lighthouse Performance > 90
- [ ] Zero TypeScript errors
- [ ] TanStack Query DevTools sin queries redundantes

## 🛠️ Cambios Inmediatos a Aplicar

### 1. Primero - Limpieza de dependencias (5 min)
```bash
npm uninstall @remix-run/react @sveltejs/kit svelte vue vue-router ogl dotenv
```

### 2. Segundo - Next.config optimizado (2 min)
Reemplazar `next.config.mjs` con la configuración optimizada arriba

### 3. Tercero - TanStack Query (3 min)
Actualizar `components/providers/query-provider.tsx` con configuración optimizada

### 4. Cuarto - Remover refetchInterval (5 min)
En `hooks/use-cases.ts` eliminar la línea `refetchInterval: 30000`

### 5. Quinto - Headers de caché API (10 min)
Agregar headers de caché a todas las rutas API

**Impacto esperado después de estos 5 cambios:**
- Bundle: -60% (~320KB final)
- LCP: -40% (~2.1s)
- API: -30% (~140ms)
- Refetches innecesarios: -90%

---

**Fecha creación:** 15 Oct 2025  
**Stack detectado:** Next.js 15 + Supabase + TanStack Query + Radix UI + Tailwind  
**Prioridad:** 🔴 Crítica - Aplicar cambios 1-4 inmediatamente

asd