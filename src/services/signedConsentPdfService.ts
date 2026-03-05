/**
 * signedConsentPdfService.ts
 * Genera automáticamente el PDF de un consentimiento firmado
 * (firma + huella side-by-side), lo sube a Storage y
 * actualiza el registro `consents.pdf_url`.
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import { BasePDFGenerator, BasePDFData } from "@/utils/pdfGeneratorBase";

const BUCKET = "consent-pdfs";

// ─── helpers ────────────────────────────────────────────────────────────────

function consentUpperName(consentType: string): string {
  const key = (consentType || "").toLowerCase().replace(/[\s-]/g, "_");
  const displayNames: Record<string, string> = {
    hiv: "VIH",
    vih: "VIH",
    venopuncion: "VENOPUNCION",
    carga_glucosa: "GLUCOSA",
    frotis_vaginal: "FROTIS VAGINAL",
    hemocomponentes: "HEMOCOMPONENTES",
  };
  return displayNames[key] || key.toUpperCase().replace(/_/g, " ");
}

function defaultProcedureName(consentType: string): string {
  const key = (consentType || "").toLowerCase().replace(/[\s-]/g, "_");
  const procedureNames: Record<string, string> = {
    venopuncion: "Toma de Muestra por Venopunción",
    hiv: "Prueba Presuntiva de VIH (Virus de Inmunodeficiencia Humana)",
    vih: "Prueba Presuntiva de VIH (Virus de Inmunodeficiencia Humana)",
    hemocomponentes: "Transfusión de Hemocomponentes Sanguíneos",
    carga_glucosa: "Administración oral de carga de glucosa (Dextrosa Anhidra)",
    frotis_vaginal: "Toma de Muestra para Frotis Vaginal - Cultivo Recto-Vaginal",
  };
  return procedureNames[key] || consentType;
}

function buildPdfData(consent: any, signatureData: string, fingerprintData: string | null): BasePDFData {
  const payload = consent.payload || {};
  const patientData = payload.patientData || {};
  const hasDisability = !!payload.hasDisability;
  const isMinor = !!payload.isMinor;
  const requiresGuardian = hasDisability || isMinor;

  const decisionRaw = payload.decision || payload.consentDecision || "aprobar";
  const consentDecision: "aprobar" | "disentir" = decisionRaw === "disentir" ? "disentir" : "aprobar";

  const procedureName = payload.procedureName || defaultProcedureName(consent.consent_type);
  const consentName = consentUpperName(consent.consent_type);

  const now = new Date();
  const fechaHora = now.toLocaleString("es-CO", { timeZone: "America/Bogota" });

  // Determinar si la firma es del paciente o del acudiente
  const patientSignature = requiresGuardian ? undefined : signatureData;
  const guardianSignature = requiresGuardian ? signatureData : undefined;

  const guardianData = requiresGuardian
    ? {
        nombreCompleto: payload.guardianName || consent.signed_by_name || "",
        documento: payload.guardianDocument || "",
        telefono: payload.guardianPhone || "",
        vinculo: payload.guardianRelationship || "Representante Legal",
      }
    : null;

  return {
    documentMeta: {
      formatoNumero: `CONSENTIMIENTO ${consentName}`,
      titulo: "CONSENTIMIENTO INFORMADO",
      subtitulo: procedureName,
      codigo: `CI-${consentName.replace(/\s+/g, "-")}`,
      version: "1.0",
      fecha: now.toLocaleDateString("es-CO"),
    },
    patientData: {
      nombreCompleto: consent.patient_name || "",
      tipoDocumento: consent.patient_document_type || "CC",
      numeroDocumento: consent.patient_document_number || "",
      fechaNacimiento: patientData.fechaNacimiento || "",
      edad: Number(patientData.edad) || 0,
      sexo: patientData.sexo || patientData.genero || "N/A",
      eps: patientData.eps || "",
      telefono: consent.patient_phone || patientData.telefono || "",
      direccion: patientData.direccion || "",
      regimen: patientData.regimen || undefined,
    },
    guardianData,
    procedureData: [
      { label: "PROCEDIMIENTO", value: procedureName },
      ...(payload.procedureDescription
        ? [{ label: "DESCRIPCIÓN", value: payload.procedureDescription }]
        : []),
      ...(payload.risks?.length
        ? [{ label: "RIESGOS", value: (payload.risks as string[]).join(", ") }]
        : []),
      ...(payload.benefits?.length
        ? [{ label: "BENEFICIOS", value: (payload.benefits as string[]).join(", ") }]
        : []),
    ],
    professionalData: {
      nombreCompleto: consent.professional_name || "",
      documento: consent.professional_document || "",
      firma: consent.professional_signature_data || undefined,
    },
    patientSignature,
    guardianSignature,
    patientPhoto: fingerprintData || undefined,
    consentDecision,
    fechaHora,
  };
}

// ─── main export ────────────────────────────────────────────────────────────

export interface GeneratePdfAfterSignResult {
  pdfUrl: string | null;
  pdfPath: string | null;
  webhookOk: boolean;
}

/**
 * Genera el PDF con firma + huella, lo sube a Storage (consent-pdfs),
 * actualiza la fila en `consents` con pdf_url y llama al webhook externo.
 *
 * Se puede llamar sin autenticación (firma pública): en ese caso el upload
 * se realiza con la service-role-key a través de la edge function, pero
 * aquí intentamos primero con el cliente anon usando bucket público si está
 * disponible; en caso de error simplemente omitimos el upload.
 */
export async function generateAndUploadSignedPDF(params: {
  consent: any;           // fila completa del consentimiento (o datos mínimos)
  signatureData: string;  // base64 firma (data:image/...)
  fingerprintData: string | null; // base64 huella (data:image/...)
  patientPhotoUrl?: string | null; // URL pública de la huella ya subida
}): Promise<GeneratePdfAfterSignResult> {
  const { consent, signatureData, fingerprintData, patientPhotoUrl } = params;

  // Preferir base64 directo (ya en memoria, evita fetch adicional).
  // Si no hay base64, intentar con la URL pública (toBase64Url la convertirá en el PDF).
  const photoForPdf = fingerprintData || patientPhotoUrl || null;

  let pdfPath: string | null = null;
  let pdfPublicUrl: string | null = null;

  try {
    // 1) Generar el PDF con jsPDF
    const pdfData = buildPdfData(consent, signatureData, photoForPdf);
    const generator = new BasePDFGenerator();
    const pdf = await generator.generate(pdfData);
    const pdfBlob = pdf.output("blob");

    // 2) Subir a Storage - intentar con el cliente actual (funciona si el usuario está autenticado)
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const safeName = (consent.patient_name || "paciente")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .slice(0, 30);
    const consentType = (consent.consent_type || "consent")
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toUpperCase();

    // Para firmas remotas (sin sesión), guardar en carpeta pública dentro del bucket
    const folder = "remote_signed";
    const fileName = `${folder}/${consent.id}_${consentType}_${safeName}_${ts}.pdf`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, pdfBlob, { contentType: "application/pdf", upsert: false });

    if (!uploadError && uploadData) {
      pdfPath = uploadData.path;

      // Generar URL firmada larga (1 año) para retornar al llamador
      const { data: signedData } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(pdfPath, 60 * 60 * 24 * 365); // 1 año

      pdfPublicUrl = signedData?.signedUrl || null;

      // Guardar la RUTA del archivo (no la URL firmada efímera) en la BD
      // así siempre se puede regenerar una URL firmada válida
      if (consent.id) {
        try {
          const { error: updateErr } = await supabase
            .from("consents")
            .update({ pdf_url: pdfPath })
            .eq("id", consent.id);
          if (updateErr) {
            logger.warn("No se pudo actualizar pdf_url en la BD:", updateErr.message);
          } else {
            logger.info("pdf_url actualizado en la BD con ruta:", pdfPath);
          }
        } catch (updateEx: any) {
          logger.warn("Error actualizando pdf_url:", updateEx?.message);
        }
      }

      logger.info("PDF generado y subido:", { pdfPath, hasPdfUrl: !!pdfPublicUrl });
    } else {
      logger.warn("No se pudo subir PDF (sin auth o error):", uploadError?.message);
    }
  } catch (err: any) {
    logger.error("Error generando/subiendo PDF post-firma:", err?.message);
  }

  // 4) El webhook se envía únicamente desde la Edge Function `public-sign-consent`
  // para evitar duplicados de procesos/documentos.
  const webhookOk = true;

  // La actualización de pdf_url ya se realizó arriba al subir el archivo (usando la ruta)
  return { pdfUrl: pdfPublicUrl, pdfPath, webhookOk };
}
