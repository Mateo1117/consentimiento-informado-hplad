/**
 * consentCatalog.ts — fuente única de los nombres de consentimiento.
 *
 * Antes existían tres copias de estas tablas (appConsentService,
 * signedConsentPdfService y la edge function public-sign-consent) y se
 * desincronizaron: la copia de la edge function sólo conocía los cinco
 * consentimientos de laboratorio, así que los de imágenes caían al respaldo
 * `key.toUpperCase()` y viajaban al hospital como `RADIOGRAFIA` o `ECO TV`,
 * nombres que no existen en /plantillas-consentimiento.
 *
 * `nombre_consentimiento` es lo que el flujo de n8n usa como `filtro` contra
 * /plantillas-consentimiento del HIS. Si no coincide con una plantilla real,
 * el consentimiento termina sobre la plantilla equivocada. Por eso los valores
 * de TEMPLATE_NAMES no son cosmética: son parte del contrato con el hospital.
 *
 * Vive bajo supabase/functions/_shared/ para que Deno lo despliegue junto a las
 * edge functions; el front lo importa por ruta relativa.
 */

/** Claves canónicas: un consentimiento, una clave. */
export type ConsentKey =
  | "hiv"
  | "venopuncion"
  | "carga_glucosa"
  | "frotis_vaginal"
  | "hemocomponentes"
  | "radiografia"
  | "rx_gestante"
  | "mamografia"
  | "ultrasonido"
  | "eco_tv"
  | "tac";

/**
 * Alias → clave canónica.
 *
 * Las claves de este mapa están ya normalizadas (minúsculas, sin tildes,
 * separadores a `_`). Incluye los `consent_type` que realmente guardan los
 * formularios en la tabla `consents`, que es lo que antes faltaba: valores como
 * "TOMA DE RADIOGRAFÍA PARA GESTANTE" o "TOMA DE MAMOGRAFÍA" no coincidían con
 * ninguna clave y se iban al respaldo.
 */
const ALIASES: Record<string, ConsentKey> = {
  // Laboratorio
  hiv: "hiv",
  vih: "hiv",
  prueba_vih: "hiv",
  prueba_presuntiva_de_vih: "hiv",

  venopuncion: "venopuncion",
  toma_de_muestra_por_venopuncion: "venopuncion",

  glucosa: "carga_glucosa",
  carga_glucosa: "carga_glucosa",
  carga_de_glucosa: "carga_glucosa",

  frotis_vaginal: "frotis_vaginal",
  toma_de_muestra_para_frotis_vaginal: "frotis_vaginal",

  hemocomponentes: "hemocomponentes",
  hemocomponentes_sanguineos: "hemocomponentes",
  transfusion_de_hemocomponentes_sanguineos: "hemocomponentes",

  // Imágenes diagnósticas
  radiografia: "radiografia",
  toma_de_radiografia: "radiografia",

  rx_gestante: "rx_gestante",
  rx_para_gestante: "rx_gestante",
  toma_de_radiografia_para_gestante: "rx_gestante",

  mamografia: "mamografia",
  toma_de_mamografia: "mamografia",

  ultrasonido: "ultrasonido",

  eco_tv: "eco_tv",
  ecografia_tv: "eco_tv",
  ultrasonido_transvaginal: "eco_tv",

  tac: "tac",
  tac_con_o_sin_contraste: "tac",
  tomografia_axial_computarizada_con_o_sin_contraste: "tac",
  tomografia_axial_computarizada_con_o_sin_contraste_tac: "tac",
};

/**
 * Nombre legible del consentimiento: títulos de PDF, pantallas, códigos.
 * NO es lo que se manda al hospital — para eso está TEMPLATE_NAMES.
 */
const DISPLAY_NAMES: Record<ConsentKey, string> = {
  hiv: "VIH",
  venopuncion: "VENOPUNCION",
  carga_glucosa: "GLUCOSA",
  frotis_vaginal: "FROTIS VAGINAL",
  hemocomponentes: "HEMOCOMPONENTES",
  radiografia: "TOMA DE RADIOGRAFÍA",
  rx_gestante: "RX PARA GESTANTE",
  mamografia: "MAMOGRAFÍA",
  ultrasonido: "ULTRASONIDO",
  eco_tv: "ULTRASONIDO TRANSVAGINAL",
  tac: "TAC CON O SIN CONTRASTE",
};

/**
 * `nombre_consentimiento`: el filtro con el que n8n busca la plantilla en
 * /plantillas-consentimiento del HIS.
 *
 * Verificado contra el catálogo real del hospital (93 plantillas, consultado el
 * 24/09/2026). No es un nombre bonito: tiene que resolver a UNA sola plantilla.
 * Dos de estos valores NO son el nombre legible, y no es un descuido:
 *
 *   rx_gestante  "RX PARA GESTANTE" no existe → la plantilla es "CI rx RX GESTANTE"
 *   eco_tv       "ULTRASONIDO TRANSVAGINAL" no existe → es "CI rx ECO TV"
 *
 * Con los nombres legibles, esos dos consentimientos no pueden encontrar su
 * plantilla en el hospital.
 */
const TEMPLATE_NAMES: Record<ConsentKey, string> = {
  hiv: "VIH",
  venopuncion: "VENOPUNCION",
  carga_glucosa: "GLUCOSA",
  frotis_vaginal: "FROTIS VAGINAL",
  hemocomponentes: "HEMOCOMPONENTES",
  radiografia: "TOMA DE RADIOGRAFÍA",
  rx_gestante: "RX GESTANTE",
  mamografia: "MAMOGRAFÍA",
  ultrasonido: "ULTRASONIDO",
  eco_tv: "ECO TV",
  tac: "TAC CON O SIN CONTRASTE",
};

/**
 * OID de la plantilla en el HIS al que resuelve cada consentimiento, tal como
 * se comprobó el 24/09/2026 contra /plantillas-consentimiento.
 *
 * No se envía a ninguna parte: está aquí para que la próxima vez que algo caiga
 * sobre la plantilla equivocada se pueda comprobar de un vistazo qué OID
 * debería haber salido. Los OID son del HIS, no nuestros: si el hospital
 * reorganiza su catálogo, esto queda obsoleto y manda TEMPLATE_NAMES.
 */
export const HIS_TEMPLATE_OID: Record<ConsentKey, number> = {
  hiv: 40, // CI lab PRUEBA PRESUNTIVA VIH
  venopuncion: 93, // CI lab TOMA DE MUESTRAS VENOPUNCION  ESTE ACT
  carga_glucosa: 92, // CI lab SUMINISTROS DE CARGA DE GLUCOSA
  frotis_vaginal: 91, // CI lab FROTIS VAGINAL Y CULTIVO RECTOVAGINAL
  hemocomponentes: 39, // CI lab TRANSFUSIÓN HEMOCOMPONENTES
  radiografia: 32, // CI rx TOMA DE RADIOGRAFIA
  rx_gestante: 33, // CI rx RX GESTANTE
  mamografia: 34, // CI rx MAMOGRAFIA
  ultrasonido: 35, // CI rx ULTRASONIDO
  eco_tv: 36, // CI rx ECO TV
  tac: 37, // CI rx TAC con o sin contraste
};

/** Nombre largo del procedimiento, para el PDF y para `hcaproced`. */
const PROCEDURE_NAMES: Record<ConsentKey, string> = {
  hiv: "Prueba Presuntiva de VIH (Virus de Inmunodeficiencia Humana)",
  venopuncion: "Toma de Muestra por Venopunción",
  carga_glucosa: "Administración oral de carga de glucosa (Dextrosa Anhidra)",
  frotis_vaginal: "Toma de Muestra para Frotis Vaginal - Cultivo Recto-Vaginal",
  hemocomponentes: "Transfusión de Hemocomponentes Sanguíneos",
  radiografia: "Toma De Radiografía",
  rx_gestante: "Toma De Radiografía Para Gestante",
  mamografia: "Toma De Mamografía",
  ultrasonido: "Ultrasonido",
  eco_tv: "Ultrasonido Transvaginal",
  tac: "Tomografía Axial Computarizada Con O Sin Contraste (Tac)",
};

/**
 * Normaliza un `consent_type` a su clave canónica.
 * Acepta "VENOPUNCION", "Venopunción", "Carga de Glucosa", "TOMA DE
 * RADIOGRAFÍA PARA GESTANTE"…
 */
export function normalizeConsentType(consentType: string): string {
  const raw = (consentType || "").toString().trim().toLowerCase();
  const noAccents = raw.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const cleaned = noAccents
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return ALIASES[cleaned] || cleaned;
}

/** ¿Es un consentimiento del catálogo, o caerá al respaldo? */
export function isKnownConsentType(consentType: string): boolean {
  return normalizeConsentType(consentType) in TEMPLATE_NAMES;
}

/**
 * Nombre con el que el hospital conoce la plantilla.
 *
 * El respaldo se conserva para no romper un tipo nuevo antes de darlo de alta
 * aquí, pero un nombre inventado NO va a coincidir con ninguna plantilla real:
 * quien lo consuma debería comprobar `isKnownConsentType` y registrar el aviso.
 */
export function getConsentTemplateName(consentType: string): string {
  const key = normalizeConsentType(consentType);
  return TEMPLATE_NAMES[key as ConsentKey] || key.toUpperCase().replace(/_/g, " ");
}

/** Nombre legible, para PDF y pantallas. */
export function getConsentDisplayName(consentType: string): string {
  const key = normalizeConsentType(consentType);
  return DISPLAY_NAMES[key as ConsentKey] || key.toUpperCase().replace(/_/g, " ");
}

/** Nombre largo del procedimiento. */
export function getProcedureName(consentType: string): string {
  const key = normalizeConsentType(consentType);
  return PROCEDURE_NAMES[key as ConsentKey] || consentType;
}

/** Los catálogos completos, para diagnóstico y pruebas. */
export const CONSENT_CATALOG = TEMPLATE_NAMES;
export const CONSENT_DISPLAY_CATALOG = DISPLAY_NAMES;
