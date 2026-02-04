const MOBILE_UA_REGEX =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i;

export function isMobileUserAgent(ua: string = navigator.userAgent): boolean {
  return MOBILE_UA_REGEX.test(ua);
}

/**
 * Base URL pública para compartir enlaces.
 * En preview, window.location.origin puede requerir autenticación, por eso se debe configurar.
 */
export function getPublicBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_PUBLIC_APP_URL || "").trim();
  const sanitized = envUrl.replace(/\/+$/, "");
  return sanitized || window.location.origin;
}

/**
 * Normaliza a formato E.164 sin "+" para WhatsApp (solo dígitos), con heurística Colombia.
 */
export function normalizePhoneForWhatsApp(phone?: string): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");

  // Heurísticas Colombia
  if (digits.startsWith("0")) {
    digits = "57" + digits.substring(1);
  } else if (digits.length === 10 && digits.startsWith("3")) {
    digits = "57" + digits;
  }

  return digits;
}

/**
 * Normaliza a E.164 con "+" para links SMS.
 */
export function normalizePhoneForSms(phone: string): string {
  let digits = phone.replace(/\D/g, "");

  // Heurísticas Colombia
  if (digits.startsWith("0")) {
    return "+57" + digits.substring(1);
  }
  if (digits.length === 10 && digits.startsWith("3")) {
    return "+57" + digits;
  }

  // Fallback: anteponer +
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export function buildConsentWhatsAppMessage(
  patientName: string,
  shareUrl: string,
): string {
  return `Hola ${patientName}, necesitas firmar un consentimiento informado. Por favor ingresa al siguiente enlace: ${shareUrl}`;
}

/**
 * Genera un link de WhatsApp que intenta abrir app en móvil (wa.me) y
 * usa api.whatsapp.com en escritorio (más compatible que web.whatsapp.com en algunos entornos).
 */
export function generateWhatsAppUrl(
  patientName: string,
  shareUrl: string,
  phone?: string,
): string {
  const text = encodeURIComponent(buildConsentWhatsAppMessage(patientName, shareUrl));
  const phoneDigits = normalizePhoneForWhatsApp(phone);
  const isMobile = isMobileUserAgent();

  if (isMobile) {
    // Intentar abrir la app primero (evita bloqueos de WhatsApp Web en algunos navegadores/redes)
    // Nota: si el esquema no está soportado, el usuario puede usar el botón "Copiar mensaje".
    return phoneDigits
      ? `whatsapp://send?phone=${phoneDigits}&text=${text}`
      : `whatsapp://send?text=${text}`;
  }

  // Escritorio
  return phoneDigits
    ? `https://api.whatsapp.com/send?phone=${phoneDigits}&text=${text}`
    : `https://api.whatsapp.com/send?text=${text}`;
}
