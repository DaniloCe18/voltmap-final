export const CONNECTOR_TYPES = ["CCS2", "Type2", "CHAdeMO", "GBT", "NACS"] as const;
export type ConnectorType = (typeof CONNECTOR_TYPES)[number];

export const CONNECTOR_LABELS: Record<ConnectorType, string> = {
  CCS2: "CCS2 (Combo)",
  Type2: "Tipo 2 (Mennekes)",
  CHAdeMO: "CHAdeMO",
  GBT: "GB/T",
  NACS: "NACS (Tesla)",
};

export interface Station {
  id: string;
  name: string;
  operator: string;
  city: string;
  address: string;
  connectorType: ConnectorType;
  powerKw: number;
  pricePerKwh: number;
  renewable: boolean;
  open24h: boolean;
  available: boolean;
  fastCharge: boolean;
  installedAt: string;
  /** false = dada de baja (baja lógica): no se ve en la vista pública */
  active?: boolean;
  deletedAt?: string | null;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
