// Normalizes consent_type values so variants like "hiv" and "vih" are unified
const TYPE_ALIASES: Record<string, string> = {
  hiv: "vih",
  vih: "vih",
  venopuncion: "venopuncion",
  carga_glucosa: "carga_glucosa",
  frotis_vaginal: "frotis_vaginal",
  hemocomponentes: "hemocomponentes",
};

export const CONSENT_TYPE_LABELS: Record<string, string> = {
  vih: "VIH",
  venopuncion: "Venopunción",
  carga_glucosa: "Carga de Glucosa",
  frotis_vaginal: "Frotis Vaginal",
  hemocomponentes: "Hemocomponentes",
};

export const CONSENT_TYPE_SPECIALTY: Record<string, string> = {
  vih: "Laboratorio Clínico",
  venopuncion: "Laboratorio Clínico",
  carga_glucosa: "Laboratorio Clínico",
  frotis_vaginal: "Ginecología / Laboratorio",
  hemocomponentes: "Banco de Sangre / Medicina Transfusional",
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
