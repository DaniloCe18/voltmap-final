/**
 * Documentación de la API en formato Swagger 2.0 (OpenAPI 2.0).
 * Se sirve en /api/docs (interfaz) y /api/docs.json (especificación).
 */

const CONNECTORS = ["CCS2", "Type2", "CHAdeMO", "GBT", "NACS"];
const BODY_TYPES = ["hatchback", "sedan", "suv", "pickup", "van"];

// ─── Respuestas reutilizables ───
const ref = (name: string) => ({ $ref: `#/definitions/${name}` });
const r = {
  ok: (schema: object, description = "OK") => ({ description, schema }),
  e400: { description: "Datos inválidos (validación Zod)", schema: ref("ValidationError") },
  e401: { description: "Sin sesión", schema: ref("Error") },
  e403: { description: "Con sesión pero sin rol admin", schema: ref("Error") },
  e404: { description: "No encontrado (o dado de baja, para quien no es admin)", schema: ref("Error") },
};

const idParam = { name: "id", in: "path", required: true, type: "string", description: "Id de MongoDB" };
const bodyParam = (schema: string) => ({ name: "body", in: "body", required: true, schema: ref(schema) });
const q = (name: string, type: string, description: string, extra: object = {}) => ({
  name,
  in: "query",
  required: false,
  type,
  description,
  ...extra,
});

const pageParams = [
  q("page", "integer", "Número de página (desde 1)", { default: 1, minimum: 1 }),
  q("limit", "integer", "Resultados por página (máx. 50)", { default: 9, minimum: 1, maximum: 50 }),
];
const statusParam = q("status", "string", "active (público) · inactive / all (solo admin)", {
  enum: ["active", "inactive", "all"],
  default: "active",
});
const hardParam = q("hard", "string", "true = baja física (borra el documento). Sin el parámetro: baja lógica", {
  enum: ["true", "false"],
});

/** CRUD completo para un recurso, con las mismas reglas en estaciones y vehículos */
function crudPaths(opts: {
  base: string;
  tag: string;
  entity: string;
  input: string;
  listParams: object[];
  extraList?: Record<string, object>;
}) {
  const { base, tag, entity, input, listParams, extraList = {} } = opts;
  const list = `${entity}List`;
  return {
    [base]: {
      get: {
        tags: [tag],
        summary: `Listar (público, paginado)`,
        parameters: [...pageParams, ...listParams, statusParam],
        responses: { 200: r.ok(ref(list)), 400: r.e400, 401: r.e401, 403: r.e403 },
      },
      post: {
        tags: [tag],
        summary: "Crear (solo admin)",
        security: [{ sessionCookie: [] }],
        parameters: [bodyParam(input)],
        responses: { 201: r.ok(ref(entity), "Creado"), 400: r.e400, 401: r.e401, 403: r.e403 },
      },
    },
    ...extraList,
    [`${base}/{id}`]: {
      get: {
        tags: [tag],
        summary: "Obtener por id (público)",
        parameters: [idParam],
        responses: { 200: r.ok(ref(entity)), 404: r.e404 },
      },
      put: {
        tags: [tag],
        summary: "Reemplazar todos los campos (solo admin)",
        security: [{ sessionCookie: [] }],
        parameters: [idParam, bodyParam(input)],
        responses: { 200: r.ok(ref(entity)), 400: r.e400, 401: r.e401, 403: r.e403, 404: r.e404 },
      },
      patch: {
        tags: [tag],
        summary: 'Actualizar campos sueltos o reactivar con { "active": true } (solo admin)',
        security: [{ sessionCookie: [] }],
        parameters: [
          idParam,
          { name: "body", in: "body", required: true, schema: { type: "object", example: { active: true } } },
        ],
        responses: { 200: r.ok(ref(entity)), 400: r.e400, 401: r.e401, 403: r.e403, 404: r.e404 },
      },
      delete: {
        tags: [tag],
        summary: "Baja lógica (por defecto) o física (?hard=true) — solo admin",
        security: [{ sessionCookie: [] }],
        parameters: [idParam, hardParam],
        responses: {
          200: r.ok(
            { type: "object", properties: { message: { type: "string" }, data: ref(entity) } },
            "Baja lógica: queda guardado con active=false",
          ),
          204: { description: "Baja física: borrado definitivamente" },
          400: r.e400,
          401: r.e401,
          403: r.e403,
          404: r.e404,
        },
      },
    },
  };
}

const paginated = (item: string) => ({
  type: "object",
  properties: {
    data: { type: "array", items: ref(item) },
    page: { type: "integer", example: 1 },
    limit: { type: "integer", example: 9 },
    total: { type: "integer", example: 12 },
    totalPages: { type: "integer", example: 2 },
  },
});

const auditFields = {
  id: { type: "string", example: "6b04b2a8781c9d0c1b45f458" },
  active: { type: "boolean", description: "false = dado de baja (baja lógica)" },
  deletedAt: { type: "string", format: "date-time", description: "Fecha de la baja lógica" },
  createdBy: { type: "string" },
  createdByName: { type: "string" },
  createdAt: { type: "string", format: "date-time" },
  updatedAt: { type: "string", format: "date-time" },
};

const stationInput = {
  type: "object",
  required: ["name", "operator", "city", "address", "connectorType", "powerKw", "pricePerKwh", "installedAt"],
  properties: {
    name: { type: "string", minLength: 3, maxLength: 80, example: "Hub Puerto Madero" },
    operator: { type: "string", minLength: 2, maxLength: 60, example: "EcoVolt" },
    city: { type: "string", minLength: 2, maxLength: 60, example: "Buenos Aires" },
    address: { type: "string", minLength: 5, maxLength: 120, example: "Av. Alicia Moreau de Justo 1500" },
    connectorType: { type: "string", enum: CONNECTORS },
    powerKw: { type: "number", minimum: 1, maximum: 1000, example: 150 },
    pricePerKwh: { type: "number", minimum: 0, example: 420, description: "Precio en ARS" },
    renewable: { type: "boolean", default: false },
    open24h: { type: "boolean", default: false },
    available: { type: "boolean", default: true },
    installedAt: { type: "string", format: "date", example: "2024-03-12", description: "No puede ser futura" },
  },
};

const vehicleInput = {
  type: "object",
  required: ["brand", "model", "bodyType", "connectorType", "batteryKwh", "rangeKm", "maxChargeKw", "priceUsd", "releaseDate"],
  properties: {
    brand: { type: "string", minLength: 2, maxLength: 40, example: "BYD" },
    model: { type: "string", minLength: 1, maxLength: 60, example: "Dolphin" },
    bodyType: { type: "string", enum: BODY_TYPES },
    connectorType: { type: "string", enum: CONNECTORS },
    batteryKwh: { type: "number", minimum: 5, maximum: 250, example: 60.4 },
    rangeKm: { type: "number", minimum: 30, maximum: 1200, example: 427 },
    maxChargeKw: { type: "number", minimum: 2, maximum: 500, example: 88 },
    priceUsd: { type: "number", minimum: 0, example: 32990 },
    availableInArgentina: { type: "boolean", default: false },
    releaseDate: { type: "string", format: "date", example: "2021-08-01" },
    imageUrl: { type: "string", description: "URL de la foto (opcional)" },
  },
};

export const swaggerDocument = {
  swagger: "2.0",
  info: {
    title: "VoltMap API",
    version: "1.0.0",
    description: [
      "API REST de VoltMap: estaciones de carga y vehículos eléctricos.",
      "",
      "**Autenticación:** la sesión es una cookie de Better Auth.",
      "Para probar las rutas de admin desde esta página:",
      "1. Abrila desde el frontend (`/api/docs` en la URL del frontend), así comparte el origen.",
      "2. Ejecutá **POST /auth/sign-in/email** con el usuario admin de prueba.",
      "3. El navegador guarda la cookie y las demás llamadas ya van autenticadas.",
      "",
      "Lectura pública · escritura solo `admin` (401 sin sesión, 403 con rol `user`).",
    ].join("\n"),
  },
  basePath: "/api",
  consumes: ["application/json"],
  produces: ["application/json"],
  tags: [
    { name: "Estaciones", description: "Estaciones de carga" },
    { name: "Vehículos", description: "Vehículos eléctricos" },
    { name: "Auth", description: "Better Auth (email/contraseña, sesión)" },
    { name: "Admin", description: "Sesiones activas (solo admin)" },
    { name: "Agente IA", description: "Asistente con LangChain" },
    { name: "Sistema" },
  ],
  securityDefinitions: {
    sessionCookie: {
      type: "apiKey",
      in: "header",
      name: "Cookie",
      description:
        "Cookie de sesión de Better Auth. El navegador la envía sola después de POST /auth/sign-in/email (no hace falta completar nada acá).",
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Sistema"],
        summary: "Estado del servidor",
        responses: {
          200: r.ok({
            type: "object",
            properties: { status: { type: "string", example: "ok" }, agent: { type: "boolean" }, time: { type: "string" } },
          }),
        },
      },
    },

    ...crudPaths({
      base: "/stations",
      tag: "Estaciones",
      entity: "Station",
      input: "StationInput",
      listParams: [
        q("search", "string", "Texto en nombre, ciudad, operador o dirección"),
        q("city", "string", "Ciudad exacta"),
        q("connectorType", "string", "Tipo de conector", { enum: CONNECTORS }),
        q("minPower", "number", "Potencia mínima en kW"),
        q("available", "string", "Solo operativas", { enum: ["true", "false"] }),
        q("renewable", "string", "Solo con energía renovable", { enum: ["true", "false"] }),
        q("sort", "string", "Orden", { enum: ["newest", "oldest", "power", "price", "name"] }),
      ],
      extraList: {
        "/stations/cities": {
          get: {
            tags: ["Estaciones"],
            summary: "Ciudades con estaciones activas",
            responses: { 200: r.ok({ type: "object", properties: { data: { type: "array", items: { type: "string" } } } }) },
          },
        },
      },
    }),

    ...crudPaths({
      base: "/vehicles",
      tag: "Vehículos",
      entity: "Vehicle",
      input: "VehicleInput",
      listParams: [
        q("search", "string", "Texto en marca o modelo"),
        q("brand", "string", "Marca exacta"),
        q("bodyType", "string", "Carrocería", { enum: BODY_TYPES }),
        q("connectorType", "string", "Tipo de conector", { enum: CONNECTORS }),
        q("minRangeKm", "number", "Autonomía mínima en km"),
        q("availableInArgentina", "string", "Solo los que se venden en Argentina", { enum: ["true", "false"] }),
        q("sort", "string", "Orden", { enum: ["newest", "range", "price", "battery", "name"] }),
      ],
      extraList: {
        "/vehicles/brands": {
          get: {
            tags: ["Vehículos"],
            summary: "Marcas con vehículos activos",
            responses: { 200: r.ok({ type: "object", properties: { data: { type: "array", items: { type: "string" } } } }) },
          },
        },
      },
    }),

    "/auth/sign-up/email": {
      post: {
        tags: ["Auth"],
        summary: "Registro con email y contraseña (rol user por defecto)",
        parameters: [
          {
            name: "body",
            in: "body",
            required: true,
            schema: {
              type: "object",
              required: ["name", "email", "password"],
              properties: {
                name: { type: "string", example: "Ana" },
                email: { type: "string", example: "ana@ejemplo.com" },
                password: { type: "string", minLength: 8, example: "Secreta123" },
              },
            },
          },
        ],
        responses: { 200: { description: "Usuario creado y sesión iniciada" }, 422: { description: "El email ya existe" } },
      },
    },
    "/auth/sign-in/email": {
      post: {
        tags: ["Auth"],
        summary: "Iniciar sesión (guarda la cookie de sesión)",
        parameters: [
          {
            name: "body",
            in: "body",
            required: true,
            schema: {
              type: "object",
              required: ["email", "password"],
              properties: {
                email: { type: "string", example: "admin@voltmap.dev" },
                password: { type: "string", example: "Admin1234!" },
              },
            },
          },
        ],
        responses: { 200: { description: "Sesión iniciada" }, 401: { description: "Email o contraseña incorrectos" } },
      },
    },
    "/auth/get-session": {
      get: {
        tags: ["Auth"],
        summary: "Sesión actual (null si no hay)",
        responses: { 200: { description: "Usuario y sesión, o null" } },
      },
    },
    "/auth/sign-out": {
      post: {
        tags: ["Auth"],
        summary: "Cerrar sesión",
        parameters: [{ name: "body", in: "body", required: false, schema: { type: "object", example: {} } }],
        responses: { 200: { description: "Sesión cerrada" } },
      },
    },

    "/admin/sessions": {
      get: {
        tags: ["Admin"],
        summary: "Listar sesiones activas (solo admin)",
        security: [{ sessionCookie: [] }],
        parameters: [
          q("page", "integer", "Página", { default: 1 }),
          q("limit", "integer", "Por página (máx. 50)", { default: 20 }),
          q("userId", "string", "Filtrar por usuario"),
        ],
        responses: { 200: r.ok(paginated("Session")), 401: r.e401, 403: r.e403 },
      },
    },
    "/admin/sessions/{id}": {
      delete: {
        tags: ["Admin"],
        summary: "Revocar una sesión (solo admin)",
        security: [{ sessionCookie: [] }],
        parameters: [idParam],
        responses: { 204: { description: "Revocada" }, 400: r.e400, 401: r.e401, 403: r.e403, 404: r.e404 },
      },
    },
    "/admin/users/{userId}/sessions": {
      delete: {
        tags: ["Admin"],
        summary: "Revocar todas las sesiones de un usuario (solo admin)",
        security: [{ sessionCookie: [] }],
        parameters: [{ name: "userId", in: "path", required: true, type: "string" }],
        responses: {
          200: r.ok({ type: "object", properties: { revoked: { type: "integer", example: 2 } } }),
          401: r.e401,
          403: r.e403,
        },
      },
    },

    "/agent/chat": {
      post: {
        tags: ["Agente IA"],
        summary: "Conversar con el asistente (requiere sesión · 15 mensajes cada 5 min)",
        security: [{ sessionCookie: [] }],
        parameters: [bodyParam("ChatRequest")],
        responses: {
          200: r.ok(ref("ChatResponse")),
          400: r.e400,
          401: r.e401,
          429: { description: "Demasiados mensajes", schema: ref("Error") },
          502: { description: "El modelo de IA no respondió", schema: ref("Error") },
          503: { description: "Falta configurar GOOGLE_API_KEY", schema: ref("Error") },
          504: { description: "El modelo tardó más de 60 s", schema: ref("Error") },
        },
      },
    },
  },

  definitions: {
    Error: { type: "object", properties: { error: { type: "string", example: "Estación no encontrada" } } },
    ValidationError: {
      type: "object",
      properties: {
        error: { type: "string", example: "Datos inválidos" },
        details: {
          type: "array",
          items: {
            type: "object",
            properties: {
              field: { type: "string", example: "powerKw" },
              message: { type: "string", example: "La potencia debe ser un número" },
            },
          },
        },
      },
    },
    StationInput: stationInput,
    Station: {
      type: "object",
      properties: {
        ...stationInput.properties,
        fastCharge: { type: "boolean", description: "Calculado: powerKw >= 50" },
        ...auditFields,
      },
    },
    StationList: paginated("Station"),
    VehicleInput: vehicleInput,
    Vehicle: {
      type: "object",
      properties: {
        ...vehicleInput.properties,
        kmPerKwh: { type: "number", description: "Calculado: rangeKm / batteryKwh" },
        ...auditFields,
      },
    },
    VehicleList: paginated("Vehicle"),
    Session: {
      type: "object",
      properties: {
        id: { type: "string" },
        userId: { type: "string" },
        userName: { type: "string" },
        userEmail: { type: "string" },
        userRole: { type: "string", enum: ["user", "admin"] },
        ipAddress: { type: "string" },
        userAgent: { type: "string" },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
        expiresAt: { type: "string", format: "date-time" },
        current: { type: "boolean", description: "Es la sesión de quien consulta" },
      },
    },
    ChatRequest: {
      type: "object",
      required: ["messages"],
      properties: {
        messages: {
          type: "array",
          maxItems: 20,
          items: {
            type: "object",
            properties: {
              role: { type: "string", enum: ["user", "assistant"] },
              content: { type: "string", maxLength: 1000, example: "¿Dónde cargo rápido en Córdoba?" },
            },
          },
        },
      },
    },
    ChatResponse: {
      type: "object",
      properties: {
        reply: { type: "string" },
        toolCalls: {
          type: "array",
          items: { type: "object", properties: { name: { type: "string" }, args: { type: "object" } } },
        },
        elapsedMs: { type: "integer" },
      },
    },
  },
};
