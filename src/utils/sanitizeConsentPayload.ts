type JsonRecord = Record<string, unknown>;

/**
 * Removes binary images that already have dedicated columns in `consents`.
 * Keeping base64 copies inside JSONB caused every consent to consume hundreds
 * of kilobytes twice and eventually exhausted the database quota.
 */
export function sanitizeConsentPayload(payload: unknown): JsonRecord {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};

  const sanitized = { ...(payload as JsonRecord) };
  delete sanitized.patientSignature;
  delete sanitized.patientPhotoUrl;
  delete sanitized.guardianSignature;

  const professionalData = sanitized.professionalData;
  if (professionalData && typeof professionalData === "object" && !Array.isArray(professionalData)) {
    const sanitizedProfessional = { ...(professionalData as JsonRecord) };
    delete sanitizedProfessional.signatureData;
    sanitized.professionalData = sanitizedProfessional;
  }

  return sanitized;
}