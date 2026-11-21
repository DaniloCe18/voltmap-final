# ⚡ VoltMap: estaciones de carga para autos eléctricos

**VoltMap** es un directorio colaborativo de **estaciones de carga para vehículos eléctricos** en Argentina. Cualquier persona puede buscar dónde cargar y filtrar por ciudad, tipo de conector, potencia, disponibilidad y si la estación usa **energía 100 % renovable**. Para cada estación, la app calcula el **tiempo y el costo estimados** de una carga del 10 al 80 %.

Cualquier usuario registrado puede **aportar estaciones** a la red. Cada estación queda a su nombre y solo esa persona puede editarla o eliminarla. Los administradores moderan **todo** el catálogo y gestionan los usuarios.

Además incluye **Volti**, un **agente de IA hecho con LangChain** (ver [más abajo](#-agente-de-ia-volti-langchain--gemini)). Le preguntás en lenguaje natural, por ejemplo *"¿dónde cargo rápido en Córdoba con CCS2?"*, y el agente decide solo qué herramientas usar para consultar la base y responderte.

> Por qué este tema: la movilidad eléctrica crece rápido, pero la info sobre dónde cargar está dispersa. La "ansiedad de autonomía" es una de las principales barreras para pasarse a un auto eléctrico, y VoltMap ataca justamente ese problema.

## 🔗 Links

| | URL |
|---|---|
| **Frontend** (Static Site) | https://voltmap.onrender.com |
| **Backend** (Web Service) | https://voltmap-api.onrender.com/api/health |
| **Repositorio** | https://github.com/<tu-usuario>/voltmap |

> ⚠️ El backend está en el plan gratuito de Render: el primer request después de un rato de inactividad puede tardar unos 50 segundos.

## 👤 Usuarios de prueba

| Rol | Email | Contraseña |
|---|---|---|
| admin | `admin@voltmap.dev` | `Admin1234!` |
| user | `user@voltmap.dev` | `User1234!` |

Todo usuario nuevo (por email, GitHub o Google) se registra con rol **`user`**. El usuario común ya tiene 3 estaciones propias cargadas por el seed, para probar "Mis estaciones".

## 🔐 Roles y permisos (opcional "registros propios")

| Acción | Visitante (sin sesión) | `user` | `admin` |
|---|:-:|:-:|:-:|
| Ver listado general y detalle | ✅ | ✅ | ✅ |
| Ver "Mis estaciones" | ❌ | ✅ (solo las suyas) | ✅ |
| Crear estación (queda a su nombre) | ❌ | ✅ | ✅ |
| Editar / eliminar **sus** estaciones | ❌ | ✅ | ✅ |
| Editar / eliminar estaciones **de otros** | ❌ | ❌ (403) | ✅ |
| Panel admin `/admin` (ABM de todas) | ❌ | ❌ ("Sin permisos") | ✅ |
| Crear usuarios y cambiarles el rol | ❌ | ❌ | ✅ |
| Chatear con el asistente de IA | ❌ | ✅ | ✅ |

El **listado general es público** y muestra las estaciones de todos. Cada usuario tiene además su vista **"Mis estaciones"** (`/my-stations`), donde administra solo las suyas.

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
| `createdBy` | texto | id del usuario dueño (automático, no editable) |
| `createdByName` | texto | nombre del dueño (automático) |
| `fastCharge` | booleano (virtual) | `powerKw >= 50`, calculado y no guardado |

Tipos usados: **texto, número, booleano, fecha y enum**.

---

## 🛣️ Endpoints de la API

Base: `/api`

| Método | Ruta | Descripción | Rol requerido |
|---|---|---|---|
| GET | `/api/health` | Estado del servidor | Público |
| GET | `/api/stations` | Listado paginado con búsqueda y filtros | Público |
| GET | `/api/stations/cities` | Ciudades con estaciones (para filtros) | Público |
| GET | `/api/stations/mine` | Estaciones del usuario logueado (mismos filtros) | user / admin (logueado) |
| GET | `/api/stations/:id` | Detalle de una estación | Público |
| POST | `/api/stations` | Crear estación (queda a nombre del usuario) | user / admin |
| PUT | `/api/stations/:id` | Reemplazar estación (todos los campos) | **dueño** o admin |
| PATCH | `/api/stations/:id` | Actualizar campos sueltos | **dueño** o admin |
| DELETE | `/api/stations/:id` | Eliminar estación | **dueño** o admin |
| POST | `/api/agent/chat` | Conversar con el agente de IA (máx. 15 mensajes cada 5 min) | user / admin (logueado) |
| * | `/api/auth/*` | Endpoints de Better Auth (sign-up, sign-in, OAuth, sesión, admin) | Según endpoint |

**Query params de `GET /api/stations`:** `page`, `limit` (máx. 50), `search`, `city`, `connectorType`, `minPower`, `available=true|false`, `renewable=true|false`, `sort=newest|oldest|power|price|name`.

Respuesta:
```json
{ "data": [ ... ], "page": 1, "limit": 9, "total": 12, "totalPages": 2 }
```

**Códigos HTTP**

| Código | Cuándo |
|---|---|
| 200 | Lectura o edición OK |
| 201 | Estación creada |
| 204 | Estación eliminada |
| 400 | Error de validación (Zod). Devuelve `{ error, details: [{ field, message }] }` |
| 401 | Ruta de escritura sin sesión |
| 403 | Con sesión, pero intenta modificar una estación de otro usuario sin ser admin |
| 404 | La estación no existe (o el id es inválido) |
| 429 | Se superó el límite de mensajes al agente |
| 502 / 503 | El modelo de IA no respondió / falta configurar `GOOGLE_API_KEY` |

Protección de las rutas de escritura ([`backend/src/routes/station.routes.ts`](backend/src/routes/station.routes.ts)):
- **Crear:** `authMiddleware` + `requireRole("user", "admin")`
- **Editar / eliminar:** `authMiddleware` + `requireOwnerOrAdmin` ([`middlewares/ownership.ts`](backend/src/middlewares/ownership.ts)). Este middleware busca la estación (404 si no existe) y deja pasar solo al dueño o a un admin (403 si no).

> Con el opcional de registros propios, los mínimos cambian así: `user` deja de ser solo lectura y puede escribir sus propios registros, mientras que `admin` sigue pudiendo crear, editar y eliminar **todo**.

En [`backend/requests.http`](backend/requests.http) hay ejemplos listos para probar con la extensión REST Client.

---

## 🖥️ Correrlo en local

**Requisitos:** Node 20+, una base MongoDB (Atlas o local) y una OAuth App de GitHub para desarrollo.

### 1. Backend

```bash
cd backend
cp .env.example .env      # completar las variables (ver tabla)
npm install
npm run seed              # crea admin + user de prueba y 12 estaciones de ejemplo
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
1. Crear un proyecto → **APIs y servicios → Pantalla de consentimiento de OAuth** → tipo **Externo**. Completar el nombre de la app, el email de soporte y los dominios autorizados (`onrender.com`).
2. Scopes: solo los básicos (`openid`, `email`, `profile`).
3. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web**:
   - **Orígenes de JavaScript autorizados:** `http://localhost:5173` y `https://voltmap.onrender.com`
   - **URIs de redireccionamiento autorizados:** `http://localhost:5173/api/auth/callback/google` y `https://voltmap.onrender.com/api/auth/callback/google`
4. **Publicar la app:** en *Pantalla de consentimiento / Público (Audience)*, tocar **"Publicar app"** para que el estado pase de *Prueba* a **En producción**. En modo prueba solo pueden entrar las cuentas agregadas como testers. Publicada, **puede entrar cualquier cuenta de Google**. Con los scopes básicos no hace falta la verificación de Google.

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
- **Variables:** las de la tabla, con `NODE_ENV=production` y `BETTER_AUTH_URL` = `FRONTEND_URL` = `https://voltmap.onrender.com`

### Frontend: Static Site
- **Root Directory:** `frontend`
- **Build Command:** `npm install && npm run build`
- **Publish Directory:** `dist`
- **Redirects/Rewrites** (en este orden):

| Source | Destination | Action |
|---|---|---|
| `/api/*` | `https://voltmap-api.onrender.com/api/*` | Rewrite |
| `/*` | `/index.html` | Rewrite |

La primera regla hace que el frontend llame siempre a `/api` (mismo origen, así la cookie de sesión funciona sin problemas de third-party cookies). La segunda hace que **F5 funcione en cualquier ruta** de la SPA.

### OAuth App de GitHub (producción)
Una segunda OAuth App, separada de la de desarrollo:
- **Homepage URL:** `https://voltmap.onrender.com`
- **Authorization callback URL:** `https://voltmap.onrender.com/api/auth/callback/github`

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
- Roles `user` (por defecto) y `admin`, con permisos por dueño del registro (ver tabla de roles)
- Listado y detalle; login, registro y logout
- Panel admin `/admin` protegido por rol (un usuario común ve "Sin permisos")
- Formularios con React Hook Form + Zod; los errores del backend también se muestran en cada campo
- Sesión persistente con `useSession()` (sobrevive al F5)

**Opcionales implementados**
- ✅ Paginación, búsqueda y filtros (sincronizados con la URL, así se pueden compartir)
- ✅ Que cada usuario vea y edite solo sus propios registros ("Mis estaciones"; los admins pueden con todos)
- ✅ Login con Google, con la app publicada (cualquier cuenta de Google puede entrar)
- ✅ Gestión de usuarios para el admin (`/admin/users`): crearlos (`authClient.admin.createUser`) y cambiarles el rol (`authClient.admin.setRole`)

**Extras**
- 🤖 Agente de IA con LangChain (Volti), con herramientas sobre la base, traza visible de herramientas y rate limit
- Estimación de tiempo y costo de carga, indicador de "carga rápida" y medidor visual de potencia
- Link directo a Google Maps desde el detalle

---

## 📁 Estructura

```
.
├── backend/
│   ├── src/
│   │   ├── agent/          # agente LangChain: tools, agente y controlador del chat
│   │   ├── controllers/station.controller.ts
│   │   ├── lib/            # auth (Better Auth), db, env
│   │   ├── middlewares/    # authMiddleware, requireRole, validateBody, errores
│   │   ├── models/station.model.ts
│   │   ├── routes/         # station.routes.ts, agent.routes.ts
│   │   ├── schemas/station.schema.ts   # Zod
│   │   ├── scripts/seed.ts
│   │   ├── app.ts
│   │   └── index.ts
│   ├── .env.example
│   └── requests.http
├── frontend/
│   └── src/
│       ├── components/     # Navbar, RequireAdmin, StationForm, StationCard…
│       ├── lib/            # auth-client, api, format
│       ├── pages/          # Home, Detail, MyStations, Editor, Assistant, Login, Register, admin/*
│       └── schemas/        # Zod de formularios
├── render.yaml
└── README.md
```

## 🛠️ Stack
**Backend:** Express 5 · TypeScript · MongoDB (Mongoose + driver nativo) · Better Auth (plugin admin) · Zod · LangChain + Google Gemini
**Frontend:** React 19 · Vite · TypeScript · React Router 7 · React Hook Form · Zod · Better Auth client
**Deploy:** Render (Web Service + Static Site)
