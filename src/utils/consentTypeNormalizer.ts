// Normalizes consent_type values so variants like "hiv" and "vih" are unified
const TYPE_ALIASES: Record<string, string> = {
  hiv: "vih",
  vih: "vih",
  venopuncion: "venopuncion",
  carga_glucosa: "carga_glucosa",
  frotis_vaginal: "frotis_vaginal",
  hemocomponentes: "hemocomponentes",
  radiografia: "radiografia",
  rx_gestante: "rx_gestante",
  mamografia: "mamografia",
  ultrasonido: "ultrasonido",
  eco_tv: "eco_tv",
  tac: "tac",
};

export const CONSENT_TYPE_LABELS: Record<string, string> = {
  vih: "VIH",
  venopuncion: "Venopunción",
  carga_glucosa: "Carga de Glucosa",
  frotis_vaginal: "Frotis Vaginal",
  hemocomponentes: "Hemocomponentes",
  radiografia: "Toma de Radiografía",
  rx_gestante: "RX para Gestante",
  mamografia: "Mamografía",
  ultrasonido: "Ultrasonido",
  eco_tv: "Ultrasonido Transvaginal",
  tac: "TAC con o sin Contraste",
};

export const CONSENT_TYPE_SPECIALTY: Record<string, string> = {
  vih: "Laboratorio Clínico",
  venopuncion: "Laboratorio Clínico",
  carga_glucosa: "Laboratorio Clínico",
  frotis_vaginal: "Ginecología / Laboratorio",
  hemocomponentes: "Banco de Sangre / Medicina Transfusional",
  radiografia: "Imágenes Diagnósticas",
  rx_gestante: "Imágenes Diagnósticas",
  mamografia: "Imágenes Diagnósticas",
  ultrasonido: "Imágenes Diagnósticas",
  eco_tv: "Imágenes Diagnósticas",
  tac: "Imágenes Diagnósticas",
};

/** Returns a normalized key for grouping */
export function normalizeConsentType(raw: string | null | undefined): string {
  const key = (raw || "otro").toLowerCase().trim();
  return TYPE_ALIASES[key] || key;
}

/** Returns a display label for a consent type */
export function consentTypeLabel(raw: string | null | undefined): string {
  const normalized = normalizeConsentType(raw);
  return CONSENT_TYPE_LABELS[normalized] || normalized;
}
