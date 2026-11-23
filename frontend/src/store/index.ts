import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { useDispatch, useSelector } from "react-redux";
import { voltmapApi } from "./api";
import notificationsReducer from "./notificationsSlice";

/**
 * Store global de Redux:
 * - voltmapApi: caché de los datos del backend (RTK Query)
 * - notifications: avisos que se muestran en cualquier pantalla
 * La sesión la maneja Better Auth con su propio hook (useSession).
 */
export const store = configureStore({
  reducer: {
    [voltmapApi.reducerPath]: voltmapApi.reducer,
    notifications: notificationsReducer,
  },
  middleware: (getDefault) => getDefault().concat(voltmapApi.middleware),
});

// Vuelve a pedir los datos al recuperar el foco o la conexión
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Hooks tipados para usar en los componentes
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
