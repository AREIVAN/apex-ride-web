# Apex Ride - arquitectura base

## Capas

1. `app/` (Next App Router): enruta, compone pantalla y delega a features.
2. `features/`: dominios aislados con UI, esquemas, servicios y contratos por modulo.
3. `lib/`: infraestructura transversal (Supabase clients, mappers, utilidades).
4. `types/domain/`: tipos de negocio puros para no acoplar UI con nombres SQL.
5. `supabase/migrations/`: modelo de datos y seguridad (RLS) versionados.

## Decisiones clave

- **Monorepo liviano con workspaces**: permite crecer a `apps/mobile` o `packages/ui` sin migracion traumática.
- **App Router + route group `(app)`**: separa secciones autenticadas de auth/public sin mezclar layouts.
- **Servicios tipados por dominio**: cada feature habla con Supabase a traves de contratos (`createRidesService`, etc.).
- **Mapeo fila SQL -> dominio**: evita que columnas snake_case contaminen el resto de la app.
- **RLS desde el dia 1**: protege datos de usuario incluso en etapa inicial.

## Convenciones

- UI y logica separadas: componentes en `components/`, acceso a datos en `services/`.
- Toda validacion de input en `schemas/` con Zod.
- TODOs explicitos en integraciones aun no productivas (auth real, mapas reales, settings persistentes).

## Evolucion recomendada

1. Incorporar server actions para formularios de auth y segmento.
2. Agregar cache/query layer para lecturas frecuentes.
3. Extraer componentes compartidos a `packages/ui` cuando exista segunda app.
