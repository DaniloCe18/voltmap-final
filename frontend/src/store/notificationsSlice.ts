import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";

export interface Notification {
  id: string;
  kind: "success" | "error";
  message: string;
}

/**
 * Notificaciones globales (toasts). Cualquier pantalla puede mostrar un aviso con
 * dispatch(notify(...)) y se ve aunque se navegue a otra página.
 */
const notificationsSlice = createSlice({
  name: "notifications",
  initialState: [] as Notification[],
  reducers: {
    notify: {
      reducer: (state, action: PayloadAction<Notification>) => {
        state.push(action.payload);
      },
      prepare: (message: string, kind: Notification["kind"] = "success") => ({
        payload: { id: nanoid(), kind, message },
      }),
    },
    dismiss: (state, action: PayloadAction<string>) => state.filter((n) => n.id !== action.payload),
  },
});

export const { notify, dismiss } = notificationsSlice.actions;
export default notificationsSlice.reducer;
