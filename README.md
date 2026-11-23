# ⚡ VoltMap: estaciones de carga para autos eléctricos

**VoltMap** es un directorio colaborativo de **estaciones de carga para vehículos eléctricos** en Argentina. Cualquier persona puede buscar dónde cargar y filtrar por ciudad, tipo de conector, potencia, disponibilidad y si la estación usa **energía 100 % renovable**. Para cada estación, la app calcula el **tiempo y el costo estimados** de una carga del 10 al 80 %.

Los visitantes y usuarios consultan el catálogo; los **administradores** lo mantienen (alta, modificación y baja) y gestionan a los usuarios.

Además incluye **Volti**, un **agente de IA hecho con LangChain** (ver [más abajo](#-agente-de-ia-volti-langchain--gemini)). Le preguntás en lenguaje natural, por ejemplo *"¿dónde cargo rápido en Córdoba con CCS2?"*, y el agente decide solo qué herramientas usar para consultar la base y responderte.

> Por qué este tema: la movilidad eléctrica crece rápido, pero la info sobre dónde cargar está dispersa. La "ansiedad de autonomía" es una de las principales barreras para pasarse a un auto eléctrico, y VoltMap ataca justamente ese problema.

## 🔗 Links

| | URL |
|---|---|
| **Frontend** (Static Site) | https://voltmap-danilo.onrender.com |
| **Backend** (Web Service) | https://voltmap-danilo-api.onrender.com/api/health |
| **Repositorio** | https://github.com/DaniloCe18/voltmap |

> ⚠️ El backend está en el plan gratuito de Render: el primer request después de un rato de inactividad puede tardar unos 50 segundos.

## 👤 Usuarios de prueba

| Rol | Email | Contraseña |
|---|---|---|
| admin | `admin@voltmap.dev` | `Admin1234!` |
| user | `user@voltmap.dev` | `User1234!` |

Todo usuario nuevo (por email, GitHub o Google) se registra con rol **`user`**.

## 🔐 Roles y permisos

| Acción | Visitante (sin sesión) | `user` | `admin` |
|---|:-:|:-:|:-:|
| Ver listado y detalle (vista pública) | ✅ | ✅ | ✅ |
| Chatear con el asistente de IA | ❌ (→ login) | ✅ | ✅ |
| Crear, modificar y eliminar | ❌ (401) | ❌ (403) | ✅ |
| Panel admin `/admin` | ❌ (→ login) | ❌ ("Sin permisos") | ✅ |
| Gestionar usuarios y roles | ❌ | ❌ | ✅ |

El listado público y el detalle no requieren sesión. Toda escritura exige rol `admin`.

### Bajas lógica y física

| | Baja lógica | Baja física |
|---|---|---|
| Cómo | `DELETE /api/stations/:id` | `DELETE /api/stations/:id?hard=true` |
| Qué hace | Marca `active: false` y guarda `deletedAt` | Borra el documento de MongoDB |
| Vista pública | Deja de verse | Deja de verse |
| ¿Se puede deshacer? | Sí: **Reactivar** (`PATCH { "active": true }`) | No |
| En el panel | Botón **Dar de baja** → modal de confirmación | Botón **Eliminar** → modal de confirmación |

Toda eliminación pide confirmación en una ventana modal con **Cancelar** y **Confirmar**. En el panel, las pestañas *Activas / Dadas de baja / Todas* permiten ver y reactivar las bajas lógicas.

---

## 🧱 Entidad: `Station` (estación de carga)

| Campo | Tipo | Reglas |
|---|---|---|
| `name` | texto | 3–80 caracteres |
| `operator` | texto | 2–60 caracteres (empresa que la opera) |
| `city` | texto | 2–60 caracteres |
| `address` | texto | 5–120 caracteres |
| `connectorType` | enum | `CCS2`, `Type2`, `CHAdeMO`, `GBT`, `NACS` |
| `powerKw` | número | 1–1000 kW |
| `pricePerKwh` | número | ≥ 0 (ARS) |
| `renewable` | booleano | energía 100 % renovable |
| `open24h` | booleano | abierta las 24 h |
| `available` | booleano | operativa o fuera de servicio |
| `installedAt` | fecha | no puede ser futura |
| `active` | booleano | `false` = dada de baja (baja lógica) |
| `deletedAt` | fecha | cuándo se dio de baja (`null` si está activa) |
| `createdBy` | texto | id del admin que la cargó (automático, no editable) |
| `createdByName` | texto | nombre de quien la cargó (automático) |
| `fastCharge` | booleano (virtual) | `powerKw >= 50`, calculado y no guardado |

Tipos usados: **texto, número, booleano, fecha y enum**.

## 🚗 Entidad: `Vehicle` (vehículo eléctrico)

| Campo | Tipo | Reglas |
|---|---|---|
| `brand` | texto | 2–40 caracteres |
| `model` | texto | 1–60 caracteres |
| `bodyType` | enum | `hatchback`, `sedan`, `suv`, `pickup`, `van` |
| `connectorType` | enum | mismo tipo que las estaciones (`CCS2`, `Type2`, `CHAdeMO`, `GBT`, `NACS`) |
| `batteryKwh` | número | 5–250 kWh |
| `rangeKm` | número | 30–1200 km |
| `maxChargeKw` | número | potencia máxima de carga, 2–500 kW |
| `priceUsd` | número | ≥ 0 |
| `availableInArgentina` | booleano | se vende en el país |
| `releaseDate` | fecha | desde 1990 |
| `imageUrl` | texto | URL de la foto (opcional) |
| `active` / `deletedAt` | booleano / fecha | baja lógica |
| `kmPerKwh` | número (virtual) | eficiencia: `rangeKm / batteryKwh`, calculada |

Se relaciona con las estaciones por el **tipo de conector**: un vehículo CCS2 puede cargar en las estaciones CCS2.

---

## 🏗️ Arquitectura

```
Navegador (React + Vite)
  ├─ Páginas y formularios (React Hook Form + Zod)
  ├─ Estado global: Redux Toolkit
  │    ├─ voltmapApi (RTK Query): caché de estaciones, ciudades, etc.
  │    └─ notifications: avisos globales (toasts)
  └─ Sesión: Better Auth (useSession)
        │  fetch a /api (mismo origen; en Render, rewrite al backend)
        ▼
API REST (Express + TypeScript)
  ├─ routes → middlewares (authMiddleware, requireRole, validateBody) → controllers
  ├─ Better Auth en /api/auth/* (usuarios, sesiones, OAuth)
  └─ Agente de IA (LangChain + Gemini) en /api/agent/chat
        │
        ▼
MongoDB Atlas (Mongoose para los modelos, driver nativo para Better Auth)
```

**Por qué RTK Query:** cada consulta (por ejemplo, el listado de estaciones) queda cacheada en el store. Cada mutación (crear, editar, dar de baja, reactivar o eliminar) declara qué datos quedan viejos (`invalidatesTags`), y RTK Query los vuelve a pedir solo. Por eso lo que el admin cambia en el panel **se refleja automáticamente en la vista pública**, sin recargar la página.

## 🛣️ Endpoints de la API

Base: `/api`

| Método | Ruta | Descripción | Rol requerido |
|---|---|---|---|
| GET | `/api/health` | Estado del servidor | Público |
| GET | `/api/stations` | Listado paginado con búsqueda y filtros (solo activas) | Público |
| GET | `/api/stations/cities` | Ciudades con estaciones (para filtros) | Público |
| GET | `/api/stations/:id` | Detalle de una estación (las dadas de baja dan 404, salvo para admin) | Público |
| POST | `/api/stations` | Crear estación | admin |
| PUT | `/api/stations/:id` | Reemplazar estación (todos los campos) | admin |
| PATCH | `/api/stations/:id` | Actualizar campos sueltos o reactivar (`{ "active": true }`) | admin |
| DELETE | `/api/stations/:id` | **Baja lógica**: la oculta de la vista pública (responde 200) | admin |
| DELETE | `/api/stations/:id?hard=true` | **Baja física**: la borra de la base (responde 204) | admin |
| GET | `/api/vehicles` | Listado paginado de vehículos con filtros (solo activos) | Público |
| GET | `/api/vehicles/brands` | Marcas con vehículos (para filtros) | Público |
| GET | `/api/vehicles/:id` | Detalle de un vehículo | Público |
| POST | `/api/vehicles` | Crear vehículo | admin |
| PUT | `/api/vehicles/:id` | Reemplazar vehículo | admin |
| PATCH | `/api/vehicles/:id` | Actualizar campos o reactivar (`{ "active": true }`) | admin |
| DELETE | `/api/vehicles/:id` | **Baja lógica** (200) | admin |
| DELETE | `/api/vehicles/:id?hard=true` | **Baja física** (204) | admin |
| POST | `/api/agent/chat` | Conversar con el agente de IA (máx. 15 mensajes cada 5 min) | user / admin (logueado) |
| * | `/api/auth/*` | Endpoints de Better Auth (sign-up, sign-in, OAuth, sesión, admin) | Según endpoint |

**Query params de `GET /api/stations`:** `page`, `limit` (máx. 50), `search`, `city`, `connectorType`, `minPower`, `available=true|false`, `renewable=true|false`, `sort=newest|oldest|power|price|name`, `status=active|inactive|all` (`inactive` y `all` solo para admin: 401 sin sesión, 403 con rol `user`).

**Query params de `GET /api/vehicles`:** `page`, `limit` (máx. 50), `search` (marca o modelo), `brand`, `bodyType`, `connectorType`, `minRangeKm`, `availableInArgentina=true|false`, `sort=newest|range|price|battery|name`, `status=active|inactive|all` (solo admin).

Respuesta de los listados:
```json
{ "data": [ ... ], "page": 1, "limit": 9, "total": 12, "totalPages": 2 }
```

**Códigos HTTP**

| Código | Cuándo |
|---|---|
| 200 | Lectura o edición OK |
| 201 | Estación creada |
| 204 | Estación eliminada definitivamente (baja física) |
| 400 | Error de validación (Zod). Devuelve `{ error, details: [{ field, message }] }` |
| 401 | Ruta de escritura sin sesión |
| 403 | Con sesión pero sin rol `admin` (por ejemplo, un `user` que intenta escribir) |
| 404 | La estación no existe (o el id es inválido) |
| 429 | Se superó el límite de mensajes al agente |
| 502 / 503 | El modelo de IA no respondió / falta configurar `GOOGLE_API_KEY` |

Las rutas de escritura están protegidas con `authMiddleware` (401 sin sesión) + `requireRole("admin")` (403 sin permisos): ver [`backend/src/routes/station.routes.ts`](backend/src/routes/station.routes.ts).

En [`backend/requests.http`](backend/requests.http) hay ejemplos listos para probar con la extensión REST Client.

---

## 🖥️ Correrlo en local

**Requisitos:** Node 20+, una base MongoDB (Atlas o local) y una OAuth App de GitHub para desarrollo.

### 1. Backend

```bash
cd backend
cp .env.example .env      # completar las variables (ver tabla)
npm install
npm run seed              # crea admin + user de prueba, 12 estaciones y 12 vehículos de ejemplo
npm run dev               # http://localhost:3000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

Vite proxea `/api` → `http://localhost:3000`, así que el navegador trabaja con un solo origen (igual que en producción).

### Variables de entorno (`backend/.env`)

| Variable | Ejemplo local | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto del backend |
| `NODE_ENV` | `development` | `production` en Render |
| `MONGODB_URI` | `mongodb+srv://usuario:***@cluster.mongodb.net/voltmap` | Conexión a Mongo |
| `BETTER_AUTH_SECRET` | *(salida de `openssl rand -base64 32`)* | Secreto para firmar sesiones |
| `BETTER_AUTH_URL` | `http://localhost:5173` | URL pública por donde entra `/api/auth` (la del **frontend**) |
| `FRONTEND_URL` | `http://localhost:5173` | Para CORS y `trustedOrigins` |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | | OAuth App de GitHub |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | | OAuth Client de Google |
| `GOOGLE_API_KEY` | | API key de Gemini para el agente ([Google AI Studio](https://aistudio.google.com/apikey), gratis) |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Modelo que usa el agente |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | `admin@voltmap.dev` / `Admin1234!` | Usuario admin del seed |
| `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` | `user@voltmap.dev` / `User1234!` | Usuario común del seed |

### OAuth de Google

En [Google Cloud Console](https://console.cloud.google.com/):
1. Crear un proyecto → **APIs y servicios → Pantalla de consentimiento de OAuth** (Google Auth Platform) → tipo **Externo**, con el nombre de la app y el email de soporte.
2. Scopes: solo los básicos (`openid`, `email`, `profile`).
3. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web**:
   - **Orígenes de JavaScript autorizados:** `http://localhost:5173` y `https://voltmap-danilo.onrender.com`
   - **URIs de redireccionamiento autorizados:** `http://localhost:5173/api/auth/callback/google` y `https://voltmap-danilo.onrender.com/api/auth/callback/google`
4. **Información de la marca:** página principal `https://voltmap-danilo.onrender.com`, política de privacidad `https://voltmap-danilo.onrender.com/privacidad` (página incluida en la app) y dominio autorizado `voltmap-danilo.onrender.com`. Google los exige para publicar.
5. **Publicar la app:** en *Pantalla de consentimiento / Público (Audience)*, tocar **"Publicar app"** para que el estado pase de *Prueba* a **En producción**. En modo prueba solo pueden entrar las cuentas agregadas como testers. Publicada, **puede entrar cualquier cuenta de Google**. Con los scopes básicos no hace falta la verificación de Google.

### OAuth App de GitHub (desarrollo)

GitHub → Settings → Developer settings → OAuth Apps → New:
- **Homepage URL:** `http://localhost:5173`
- **Authorization callback URL:** `http://localhost:5173/api/auth/callback/github`

---

## 🚀 Deploy en Render

Se puede usar el blueprint [`render.yaml`](render.yaml) (New → Blueprint) o crear los servicios a mano:

### Backend: Web Service
- **Root Directory:** `backend`
- **Build Command:** `npm install --include=dev && npm run build`
- **Start Command:** `npm start`
- **Variables:** las de la tabla, con `NODE_ENV=production` y `BETTER_AUTH_URL` = `FRONTEND_URL` = `https://voltmap-danilo.onrender.com`

### Frontend: Static Site
- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **Redirects/Rewrites** (en este orden):

| Source | Destination | Action |
|---|---|---|
| `/api/*` | `https://voltmap-danilo-api.onrender.com/api/*` | Rewrite |
| `/*` | `/index.html` | Rewrite |

La primera regla hace que el frontend llame siempre a `/api` (mismo origen, así la cookie de sesión funciona sin problemas de third-party cookies). La segunda hace que **F5 funcione en cualquier ruta** de la SPA.

### OAuth App de GitHub (producción)
Una segunda OAuth App, separada de la de desarrollo:
- **Homepage URL:** `https://voltmap-danilo.onrender.com`
- **Authorization callback URL:** `https://voltmap-danilo.onrender.com/api/auth/callback/github`

(El callback apunta al **frontend**, porque `/api/*` se reescribe hacia el backend.)

### Datos iniciales en producción
Desde tu máquina, con `MONGODB_URI` apuntando a la base de producción: `cd backend && npm run seed`.

---

## 🤖 Agente de IA: Volti (LangChain + Gemini)

Página `/assistant` (requiere sesión). El backend expone `POST /api/agent/chat`, que arma un agente con **LangChain** (`createAgent`), usa como modelo **Google Gemini** y le da 4 herramientas ([`backend/src/agent/tools.ts`](backend/src/agent/tools.ts)):

| Herramienta | Qué hace |
|---|---|
| `buscar_estaciones` | Consulta Mongo con filtros (ciudad, conector, potencia, disponibles, renovables, 24 h, orden) |
| `detalle_estacion` | Trae todos los datos de una estación por id |
| `estadisticas_red` | Agregación en Mongo: totales, disponibles, renovables, precio promedio, ciudades |
| `estimar_carga` | Calcula el tiempo y el costo de una carga (cuentas exactas, sin que el modelo las "adivine") |

**Cómo funciona:** el modelo recibe la pregunta y **decide por su cuenta** qué herramientas llamar y con qué argumentos. Ve los resultados y, si hace falta, llama a otras (por ejemplo, busca, no encuentra nada, afloja un filtro y vuelve a buscar). Recién ahí arma la respuesta, con links a las estaciones. En el chat se puede desplegar la **traza de herramientas** que usó el agente en cada respuesta.

**Seguridad y costos:** requiere sesión, valida el body con Zod (máx. 20 mensajes de hasta 1000 caracteres), aplica un rate limit por usuario (15 mensajes cada 5 min) y limita los pasos del agente (`recursionLimit`). El system prompt le prohíbe inventar datos: todo sale de la base.

### Relación con los contenidos de la materia

**Clase 13: agentes de software.** Volti cumple las características de agente vistas en clase:
- **Actúa en nombre del usuario:** recibe un objetivo ("quiero cargar en el camino a Mar del Plata") y lo resuelve.
- **Autonomía:** nadie le programa el orden de los pasos. El modelo elige qué herramienta usar y cuándo.
- **Reactividad:** responde a lo que "percibe" del entorno (los resultados de las herramientas) y ajusta su plan. Si una búsqueda viene vacía, cambia los filtros.
- **Proactividad:** sugiere alternativas o cómo afinar la búsqueda sin que se lo pidan.
- **Tipo:** es un **agente de información** (recopila y filtra información de una fuente de datos) con rasgos de **agente de interfaz**, porque asiste al usuario dentro de la aplicación. Por eso también puede verse como un **agente híbrido**.

**Clase 14: programación paralela y concurrencia.**
- Cuando el modelo pide **varias herramientas en el mismo paso** (por ejemplo, buscar en dos ciudades), LangChain las ejecuta **a la vez** y no una tras otra. En el listado del backend pasa lo mismo: `find()` y `countDocuments()` se lanzan juntas con `Promise.all`.
- Aclaración, siguiendo la distinción de la clase entre **concurrente y paralelo**: Node.js ejecuta JavaScript en **un solo hilo**, así que esto es **concurrencia** (mientras una consulta espera a Mongo o a Gemini, el event loop atiende la otra) y no paralelismo real de CPU con varios núcleos, como el multithreading de C/C++. Para cómputo pesado en paralelo, Node ofrece `worker_threads`. Acá no hace falta, porque el cuello de botella es la entrada/salida (red y base de datos), no la CPU.

## ✅ Funcionalidades

**Obligatorias**
- CRUD completo de estaciones, con validación Zod y errores 400 detallados
- Better Auth con email/contraseña y GitHub, usuarios y sesiones guardados en Mongo
- Roles `user` (por defecto, solo lectura) y `admin` (alta, modificación y baja)
- Listado y detalle; login, registro y logout
- Panel admin `/admin` protegido por rol (un usuario común ve "Sin permisos")
- Formularios con React Hook Form + Zod; los errores del backend también se muestran en cada campo
- Sesión persistente con `useSession()` (sobrevive al F5)

**Opcionales implementados**
- ✅ Paginación, búsqueda y filtros (sincronizados con la URL, así se pueden compartir)
- ✅ Login con Google, con la app publicada (cualquier cuenta de Google puede entrar)
- ✅ Gestión de usuarios para el admin (`/admin/users`): crearlos (`authClient.admin.createUser`) y cambiarles el rol (`authClient.admin.setRole`)

**Extras**
- 🤖 Agente de IA con LangChain (Volti), con herramientas sobre la base, traza visible de herramientas y rate limit
- Estimación de tiempo y costo de carga, indicador de "carga rápida" y medidor visual de potencia
- Link directo a Google Maps desde el detalle
- Página de política de privacidad (`/privacidad`), requerida para publicar el login con Google
- Script de diagnóstico del modelo de IA: `npx tsx src/scripts/test-gemini.ts` (lista los modelos disponibles y mide la respuesta)

---

## 📁 Estructura

```
.
├── backend/
│   ├── src/
│   │   ├── agent/          # agente LangChain: tools, agente y controlador del chat
│   │   ├── controllers/    # station.controller.ts, vehicle.controller.ts
│   │   ├── lib/            # auth (Better Auth), db, env
│   │   ├── middlewares/    # authMiddleware, requireRole, validateBody, rate-limit, errores
│   │   ├── models/         # station.model.ts, vehicle.model.ts
│   │   ├── routes/         # station.routes.ts, vehicle.routes.ts, agent.routes.ts
│   │   ├── schemas/        # Zod: station.schema.ts, vehicle.schema.ts
│   │   ├── scripts/        # seed.ts (datos de prueba), test-gemini.ts (diagnóstico de IA)
│   │   ├── app.ts
│   │   └── index.ts
│   ├── .env.example
│   └── requests.http
├── frontend/
│   └── src/
│       ├── components/     # Navbar, RequireAdmin, StationForm, StationCard…
│       ├── lib/            # auth-client, api, format
│       ├── store/          # Redux: store, api (RTK Query), notificaciones
│       ├── pages/          # Home, Detail, Assistant, Login, Register, Privacy, admin/* (panel, editor, usuarios)
│       └── schemas/        # Zod de formularios
├── render.yaml
└── README.md
```

## 🛠️ Stack
**Backend:** Express 5 · TypeScript · MongoDB (Mongoose + driver nativo) · Better Auth (plugin admin) · Zod · LangChain + Google Gemini
**Frontend:** React 19 · Vite · TypeScript · React Router 7 · Redux Toolkit + RTK Query · React Hook Form · Zod · Better Auth client
**Deploy:** Render (Web Service + Static Site)
