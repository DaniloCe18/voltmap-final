import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { Paginated, Station } from "../types/station";
import type { StationFormValues } from "../schemas/station";

export interface StationListParams {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  connectorType?: string;
  minPower?: string;
  available?: string;
  renewable?: string;
  sort?: string;
  status?: "active" | "inactive" | "all";
}

/** Saca los parámetros vacíos para no mandar "?city=&search=" al backend */
function cleanParams(params: StationListParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
}

/**
 * API de VoltMap con RTK Query.
 * - Cachea las respuestas en el store de Redux (estado global).
 * - Las mutaciones "invalidan" tags: después de crear, editar o borrar, RTK Query vuelve a pedir
 *   los listados afectados, y por eso los cambios del panel se reflejan solos en la vista pública.
 */
export const voltmapApi = createApi({
  reducerPath: "voltmapApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api", credentials: "include" }),
  tagTypes: ["Station", "Cities"],
  endpoints: (build) => ({
    getStations: build.query<Paginated<Station>, StationListParams>({
      query: (params) => ({ url: "/stations", params: cleanParams(params) }),
      providesTags: (result) => [
        { type: "Station", id: "LIST" },
        ...(result?.data.map((s) => ({ type: "Station" as const, id: s.id })) ?? []),
      ],
    }),

    getCities: build.query<string[], void>({
      query: () => "/stations/cities",
      transformResponse: (res: { data: string[] }) => res.data,
      providesTags: ["Cities"],
    }),

    getStation: build.query<Station, string>({
      query: (id) => `/stations/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Station", id }],
    }),

    createStation: build.mutation<Station, StationFormValues>({
      query: (body) => ({ url: "/stations", method: "POST", body }),
      invalidatesTags: [{ type: "Station", id: "LIST" }, "Cities"],
    }),

    updateStation: build.mutation<Station, { id: string; body: StationFormValues }>({
      query: ({ id, body }) => ({ url: `/stations/${id}`, method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Station", id }, { type: "Station", id: "LIST" }, "Cities"],
    }),

    // Reactivar una baja lógica: PATCH { active: true }
    restoreStation: build.mutation<Station, string>({
      query: (id) => ({ url: `/stations/${id}`, method: "PATCH", body: { active: true } }),
      invalidatesTags: (_r, _e, id) => [{ type: "Station", id }, { type: "Station", id: "LIST" }, "Cities"],
    }),

    // hard=false → baja lógica · hard=true → baja física
    deleteStation: build.mutation<void, { id: string; hard: boolean }>({
      query: ({ id, hard }) => ({
        url: `/stations/${id}`,
        method: "DELETE",
        params: hard ? { hard: "true" } : undefined,
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Station", id }, { type: "Station", id: "LIST" }, "Cities"],
    }),
  }),
});

export const {
  useGetStationsQuery,
  useGetCitiesQuery,
  useGetStationQuery,
  useCreateStationMutation,
  useUpdateStationMutation,
  useRestoreStationMutation,
  useDeleteStationMutation,
} = voltmapApi;
