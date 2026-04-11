# Plan de migracion desde MVP HTML

## Objetivo

Migrar sin romper el MVP actual (`index.html` en root), moviendo capacidades a una base modular en Next.js + Supabase.

## Prioridades

1. Base tecnica y rutas estables.
2. Modelo de datos y seguridad base en Supabase.
3. Paridad funcional gradual del MVP en modulos (`rides`, `segments`, `leaderboards`).
4. Corte de trafico progresivo cuando cada modulo tenga QA.

## Mapeo legacy -> modulos nuevos

- Legacy landing (`index.html`) -> `apps/web/src/app/page.tsx`
- Login/registro manual -> `features/auth`
- Vista principal MVP -> `features/dashboard` + `features/shared/ui/app-shell`
- Registro simple de actividad -> `features/tracking` + `features/rides`
- Segmentos y ranking MVP -> `features/segments` + `features/leaderboard`

## Fases recomendadas

### Fase 0 (ya implementada)

- Crear estructura `apps/web`, `supabase`, `docs`.
- Definir rutas App Router y componentes base.
- Crear SQL inicial con PostGIS e indices.

### Fase 1

- Integrar auth real con Supabase (`signInWithPassword`, `signUp`, sesiones SSR).
- Proteger rutas autenticadas y redirecciones.
- Persistir perfil inicial al registrarse.

### Fase 2

- Reemplazar mocks por servicios reales en `rides`, `segments`, `leaderboards`.
- Integrar mapas reales (MapLibre o proveedor equivalente).
- Agregar carga incremental y estados de error robustos.

### Fase 3

- Activar tracking real desde mobile/web worker + ingestion backend.
- Consolidar analitica y telemetria.
- Migrar trafico de MVP al nuevo frontend por feature flag.

### Fase 4

- Congelar MVP HTML como fallback historico.
- Documentar runbook de rollback y soporte.

## Criterios para no romper MVP

- No eliminar archivos legacy en root.
- Mantener rollout por rutas nuevas, sin reemplazo abrupto de enlaces existentes.
- Habilitar feature flags para publicar por modulo.
