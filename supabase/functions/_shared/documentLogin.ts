/**
 * documentLogin.ts — iniciar sesión con el número de documento.
 *
 * Supabase Auth exige un email por usuario. A quien se crea sólo con documento
 * se le asigna un email interno derivado de ese número
 * (`1077721710@usuarios.consentimientohplad.mcmasociados.tech`). Nadie lo
 * escribe ni lo ve: en el login se teclea el documento y aquí se traduce.
 *
 * El dominio es un subdominio de mcmasociados.tech a propósito: si algún día
 * Supabase intentara mandar un correo a esa dirección, iría a un dominio propio
 * y no a un tercero.
 *
 * Los usuarios que ya existen con correo real siguen entrando con su correo:
 * todo lo que lleve "@" se usa tal cual.
 *
 * Vive en supabase/functions/_shared/ para que lo compartan la edge function
 * create-user y el front.
 */

export const DOCUMENT_LOGIN_DOMAIN = "usuarios.consentimientohplad.mcmasociados.tech";

const MIN_LONGITUD = 4;
const MAX_LONGITUD = 20;

/**
 * Deja sólo letras y números, en mayúsculas: "1.077.721.710" y "1077721710"
 * son el mismo usuario. Las letras se conservan por los pasaportes.
 */
export function normalizeDocument(value: string | null | undefined): string {
  return String(value ?? "").replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

export function isValidDocument(value: string | null | undefined): boolean {
  const doc = normalizeDocument(value);
  return doc.length >= MIN_LONGITUD && doc.length <= MAX_LONGITUD;
}

export function documentToLoginEmail(value: string): string {
  return `${normalizeDocument(value).toLowerCase()}@${DOCUMENT_LOGIN_DOMAIN}`;
}

/** El documento si el email es uno de los internos; null si es un correo real. */
export function loginEmailToDocument(email: string | null | undefined): string | null {
  const e = String(email ?? "").trim().toLowerCase();
  const sufijo = `@${DOCUMENT_LOGIN_DOMAIN}`;
  if (!e.endsWith(sufijo)) return null;
  const doc = e.slice(0, -sufijo.length);
  return doc ? doc.toUpperCase() : null;
}

/** Lo que se teclea en el login ("1077721710" o "ana@hospital.gov.co") → email de Auth. */
export function loginIdentifierToEmail(input: string): string {
  const valor = String(input ?? "").trim();
  return valor.includes("@") ? valor.toLowerCase() : documentToLoginEmail(valor);
}

/** Con qué entra el usuario, para mostrarlo: el documento o su correo real. */
export function loginLabel(email: string | null | undefined): string {
  return loginEmailToDocument(email) ?? String(email ?? "");
}
