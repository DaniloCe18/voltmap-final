const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export const formatPrice = (n: number) => money.format(n);

export const formatPower = (kw: number) =>
  `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(kw)} kW`;

// Las fechas vienen en UTC: se muestran sin corrimiento de zona horaria
export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export const toDateInput = (iso: string) => iso.slice(0, 10);

/** Minutos aprox. para cargar 10 → 80 % de una batería de 60 kWh */
export const chargeMinutes = (kw: number) => Math.round(((60 * 0.7) / (kw * 0.9)) * 60);
