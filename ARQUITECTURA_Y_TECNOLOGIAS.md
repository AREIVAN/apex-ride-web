# Arquitectura y tecnologias del proyecto

## Objetivo del documento

Documentar la arquitectura **actual** del repositorio para que el equipo pueda: (1) entender responsabilidades por carpeta, (2) mantener convenciones consistentes y (3) replicar la misma base tecnica en otros proyectos sin suposiciones.

---

## Stack tecnologico (verificado en codigo)

### Runtime y framework

- **Next.js** `16.2.1` (App Router) - `package.json`
- **React** `19.2.4` y **react-dom** `19.2.4` - `package.json`
- **TypeScript** `5.8.3` con `strict: true` - `package.json`, `tsconfig.json`

### UI y estilos

- **Tailwind CSS** `4.2.2` + `@tailwindcss/postcss` `4` - `package.json`, `postcss.config.mjs`
- **Shadcn/ui config** (`components.json`): `rsc: true`, `tsx: true`, `style: base-nova`, alias `@/components`, `@/lib`, `@/hooks`
- **Lucide React** `1.7.0` - `package.json`
- **Sonner** `2.0.7` (toasts) - `package.json`, `src/app/layout.tsx`, `src/app/providers.tsx`
- **Motion** `12.38.0` (animaciones) - `package.json`, uso en login y users

### Estado, datos y validacion

- **Zustand** `5.0.12` con `persist` - `package.json`, `src/store/auth-store.ts`, `src/app/stores/*`
- **TanStack Query** `5.96.0` - `package.json`, `src/app/providers.tsx`, hooks `useQuery/useMutation`
- **TanStack Form** `1.28.6` - `package.json`, forms de login y alta de usuario
- **TanStack Table** `8.21.3` - `package.json`, `src/app/(portal)/users/components/UsersTable.tsx`
- **Zod** `4.3.6` - `package.json`, `src/lib/auth-schema.ts`, `src/app/(portal)/users/lib/new-user-schema.ts`

### Calidad y tooling

- **ESLint** `10.1.0` + `typescript-eslint` `8.58.0` + reglas Next - `eslint.config.mjs`
- **Prettier** `3.8.1` + `prettier-plugin-tailwindcss` - `.prettierrc.json`
- **Turbopack en dev** (`next dev --turbo`) y `reactCompiler: true` - `package.json`, `next.config.ts`

---

## Arquitectura del proyecto

## 1) Capa de entrada (App Router)

Base en `src/app/`:

- Route groups: `src/app/(auth)/...` y `src/app/(portal)/...`
- Secciones funcionales: `src/app/dashboard/...`, `src/app/rework/...`
- Layout raiz: `src/app/layout.tsx` (fuentes, `<Providers />`, `<Toaster />`)
- Proveedor cliente global: `src/app/providers.tsx` (QueryClient global + manejo de errores)

## 2) Capa de UI

- Componentes reutilizables: `src/components/ui/`, `src/global-components/`
- Componentes de dominio en feature folders: ejemplo `src/app/(portal)/users/components/`
- Estilos globales y tokens Tailwind v4 en `src/app/globals.css`

## 3) Capa de estado de cliente

- Estado de autenticacion principal: `src/store/auth-store.ts`
- Stores adicionales de app/demo dentro de `src/app/stores/` (work orders, inspecciones, notificaciones, auth alternativo)

## 4) Capa de acceso a datos

- Cliente HTTP central: `src/lib/api-client.ts`
- Servicios por dominio: `src/services/auth-service.ts`, `src/app/(portal)/users/services/operators-service.ts`
- Hooks de Query/Mutation por caso de uso: `src/hooks/*`, `src/app/(portal)/users/hooks/*`

## 5) Capa de acciones de servidor y seguridad

- Server Actions: `src/app/actions/auth.ts`, `src/app/actions/documents.ts`
- Wrapper de acciones protegidas: `src/lib/safe-action.ts`
- Control de acceso por ruta + inyeccion de header auth: `src/proxy.ts`
- Refresh de token coordinado en cliente: `src/lib/token-refresh.ts`

---

## Patrones y convenciones observadas

## Estado (Zustand)

- Patrón `create(...)` + middleware `persist(...)` para sesiones locales.
- Store de auth con tokens y usuario en `localStorage` (`name: 'auth-storage'`).

## Datos remotos (TanStack Query)

- QueryClient unico en `src/app/providers.tsx`.
- Lecturas con `useQuery` (ej: `useOperatorsQuery`).
- Escrituras con `useMutation` (login/logout/crear/eliminar usuario).
- Manejo de errores con toast + redireccion cuando aplica.

## Validacion (Zod)

- Esquemas por caso de uso (`loginSchema`, `newUserSchema`).
- Tipos inferidos con `z.infer<typeof schema>`.

## Server Actions

- Archivos con `'use server'` en `src/app/actions/*`.
- Uso mixto: algunas acciones usan wrapper `protectedAction` (documents), otras exportan funciones directas (auth).

## Imports y alias

- Alias `@/*` configurado en `tsconfig.json` y usado de forma dominante.
- Orden de imports no siempre uniforme entre archivos (hay mezcla en varios componentes).

## Naming

- Conviven convenciones: kebab-case (`login-form.tsx`), camel (`use-login-mutation.ts`), y variaciones (`use-newOperator-mutation.ts`, `auth-store copy.ts`).

---

## Flujo de datos end-to-end (UI -> estado -> fetching/acciones -> UI)

## Flujo de login

1. UI captura credenciales en `src/app/(auth)/login/login-form.tsx` (TanStack Form + Zod).
2. Se ejecuta `useLoginMutation` (`src/hooks/use-login-mutation.ts`).
3. La mutacion llama `authService.login` (`src/services/auth-service.ts`) -> `apiClient.post('/auth/login')`.
4. Respuesta exitosa:
   - Se guarda `user`, `accessToken`, `refreshToken` en `useAuthStore`.
   - Se setean cookies httpOnly con `setAuthCookiesAction` (server action).
   - UI muestra toast y redirige a `/dashboard`.
5. En llamadas futuras, `apiClient` agrega `Authorization` desde store.
6. Si hay `401`, `apiClient` intenta `ensureValidToken()` -> `refreshTokenAction` (server) -> actualiza store -> reintenta request.

## Flujo de gestion de usuarios (portal)

1. UI (`UsersTable` / `NewUserForm`) dispara hooks de Query/Mutation.
2. Hooks llaman `operatorsService`.
3. `operatorsService` usa `apiClient` para GET/POST/DELETE en backend.
4. Resultados impactan UI (tabla, loaders, errores con toast/modal).

---

## Scripts de desarrollo relevantes

Desde `package.json`:

- `npm run dev` - Next en modo desarrollo con Turbopack.
- `npm run lint` / `npm run lint:fix` - ESLint.
- `npm run format:check` / `npm run format:fix` - Prettier.
- `npm run build` - lint + build.
- `npm run build:fast` - build sin lint previo.
- `npm run build:local` - format check + build.
- `npm run setup:skills` - inicializacion de skills del repo.

---

## Checklist para replicar esta arquitectura en otro proyecto

1. Crear proyecto Next 16 + TS estricto y activar alias `@/*` en `tsconfig`.
2. Configurar Tailwind v4 via `@import 'tailwindcss'` + `@tailwindcss/postcss`.
3. Definir layout raiz con proveedor global de QueryClient y Toaster.
4. Estructurar `src/app` por route groups (`(auth)`, `(portal)`) y features.
5. Implementar cliente HTTP central (`apiClient`) con timeout, manejo uniforme de error y retry controlado.
6. Definir capa `services/` por dominio para encapsular endpoints.
7. Implementar hooks `useQuery/useMutation` por caso de uso.
8. Crear store de auth con Zustand persist (usuario + tokens + acciones).
9. Definir Zod schemas por formulario/accion y derivar tipos.
10. Agregar Server Actions para operaciones sensibles (cookies, refresh, acciones protegidas).
11. Agregar capa de proteccion de rutas (`proxy.ts`) leyendo cookie auth.
12. Configurar ESLint + Prettier + plugin Tailwind.
13. Documentar naming/imports esperados y bloquear desvio con lint rules.

---

## Riesgos / deuda tecnica observada y recomendaciones

## 1) Se ignoran errores de TypeScript en build

- Evidencia: `next.config.ts` -> `typescript.ignoreBuildErrors: true`.
- Riesgo: pasar a produccion con errores de tipos no detectados.
- Recomendacion: apagar esta opcion en CI y dejar fallback temporal solo local si es necesario.

## 2) Frontera server/client difusa en `safe-action`

- Evidencia: `src/lib/safe-action.ts` importa `useAuthStore` (estado cliente) dentro de util de acciones server.
- Riesgo: acoplamiento fuerte y posibles errores de ejecucion/hidratacion segun contexto.
- Recomendacion: resolver sesion server-side desde cookies/JWT (no desde store cliente).

## 3) Duplicidad de stores y convenciones mixtas

- Evidencia: `src/store/auth-store.ts`, `src/app/stores/use-auth-store.ts`, `src/store/auth-store copy.ts`.
- Riesgo: divergencia funcional, bugs por fuente de verdad multiple.
- Recomendacion: consolidar en una sola implementacion de auth store y eliminar/copiar-deprecado.

## 4) Base mixta JS + TS

- Evidencia: `tsconfig.json` con `allowJs: true` y presencia de `src/app/data.js`, `src/app/ui.js`, `src/app/screens/*.js`.
- Riesgo: menor garantia de tipos y mayor costo de mantenimiento.
- Recomendacion: migracion progresiva a TS y apagar `allowJs` al final.

## 5) Cobertura de pruebas automatizadas no visible

- Evidencia: no se encontraron archivos `*.test.*`/`*.spec.*` en el repo.
- Riesgo: regresiones funcionales en auth/refresh/rutas.
- Recomendacion: priorizar tests de contrato para `apiClient`, `token-refresh`, y server actions de auth.

---

## Fuentes verificadas

- `package.json`
- `tsconfig.json`
- `eslint.config.mjs`
- `.prettierrc.json`
- `components.json`
- `next.config.ts`
- `postcss.config.mjs`
- `src/app/layout.tsx`
- `src/app/providers.tsx`
- `src/app/actions/auth.ts`
- `src/app/actions/documents.ts`
- `src/lib/safe-action.ts`
- `src/lib/api-client.ts`
- `src/lib/token-refresh.ts`
- `src/lib/auth-schema.ts`
- `src/proxy.ts`
- `src/store/auth-store.ts`
- `src/app/stores/*`
- `src/services/auth-service.ts`
- `src/app/(portal)/users/*`
