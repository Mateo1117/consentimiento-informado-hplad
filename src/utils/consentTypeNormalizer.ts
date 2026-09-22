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
  frotis_vaginal: "Laboratorio Clínico",
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

/** Returns the service a consent type belongs to */
export function consentTypeSpecialty(raw: string | null | undefined): string {
  const normalized = normalizeConsentType(raw);
  return CONSENT_TYPE_SPECIALTY[normalized] || "Otros";
}

/**
 * Orden en que se muestran los servicios. Los que no estén aquí van al final,
 * alfabéticamente, para que un tipo nuevo nunca desaparezca de la pantalla.
 */
export const CONSENT_SERVICE_ORDER: string[] = [
  "Laboratorio Clínico",
  "Imágenes Diagnósticas",
  "Banco de Sangre / Medicina Transfusional",
];

/**
 * Agrupa una lista de tipos de consentimiento por el servicio al que pertenecen,
 * respetando CONSENT_SERVICE_ORDER. Los grupos vacíos no se devuelven, de modo
 * que al filtrar por búsqueda solo aparecen los servicios con resultados.
 */
export function groupConsentTypesByService<T extends { id: string }>(
  types: T[],
): { service: string; types: T[] }[] {
  const grupos = new Map<string, T[]>();
  for (const type of types) {
    const service = consentTypeSpecialty(type.id);
    const actual = grupos.get(service);
    if (actual) actual.push(type);
    else grupos.set(service, [type]);
  }

  return [...grupos.entries()]
    .sort(([a], [b]) => {
      const ia = CONSENT_SERVICE_ORDER.indexOf(a);
      const ib = CONSENT_SERVICE_ORDER.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b, "es");
    })
    .map(([service, types]) => ({ service, types }));
}
