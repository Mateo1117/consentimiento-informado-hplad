import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getConsentTemplateName,
  getProcedureName,
  isKnownConsentType,
} from "../_shared/consentCatalog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WEBHOOK_URL = "https://webhook.mcmasociados.tech/webhook/crear_consentimiento";

type Json = Record<string, unknown>;

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function parseBase64Image(dataUrl: string): { bytes: Uint8Array; contentType: string; extension: string } {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
  if (!match) throw new Error("Imagen inválida (se esperaba data:image/*;base64,...)");

  const contentType = match[1];
  const base64 = match[2];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

  const extension = contentType === "image/png" ? "png" : "jpg";
  return { bytes, contentType, extension };
}

function randomName(prefix: string, extension: string) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const rand = crypto.randomUUID().slice(0, 8);
  return `${prefix}_${ts}_${rand}.${extension}`;
}

async function toPublicUrl(
  supabase: ReturnType<typeof createClient>,
  input: string | null | undefined,
  prefix: string,
): Promise<string | null> {
  if (!input) return null;
  if (isHttpUrl(input)) return input;
  if (!input.startsWith("data:image")) return null;

  const { bytes, contentType, extension } = parseBase64Image(input);
  const fileName = randomName(prefix, extension);

  const { error: uploadError } = await supabase.storage
    .from("photos")
    .upload(fileName, bytes, { contentType, upsert: false });

  if (uploadError) {
    console.error("❌ Error subiendo imagen a storage:", uploadError);
    return null;
  }

  const { data } = supabase.storage.from("photos").getPublicUrl(fileName);
  return data.publicUrl;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const body = (await req.json()) as {
      token?: string;
      signedByName?: string;
      signatureData?: string;
      patientPhoto?: string;
      fingerprintData?: string;
    };

    const token = (body.token || "").trim();
    const signedByName = (body.signedByName || "").trim();
    const signatureData = body.signatureData || "";
    const patientPhoto = body.patientPhoto || "";
    const fingerprintData = body.fingerprintData || "";

    if (!token || token.length < 32) {
      return new Response(JSON.stringify({ success: false, error: "Token inválido" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!signedByName) {
      return new Response(JSON.stringify({ success: false, error: "Nombre requerido" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!signatureData || signatureData.length < 20) {
      // Signature is optional if fingerprint is provided
      if (!fingerprintData || fingerprintData.length < 20) {
        return new Response(JSON.stringify({ success: false, error: "Debe proporcionar al menos la firma digital o la huella dactilar" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1) Subir evidencias (URLs públicas) - solo subir lo que realmente se proporcionó
    const patientPhotoUrl = (patientPhoto && patientPhoto.length > 20)
      ? await toPublicUrl(supabase, patientPhoto, "patient")
      : null;
    const signatureUrl = (signatureData && signatureData.length > 20)
      ? await toPublicUrl(supabase, signatureData, "firma_remota")
      : null;
    const fingerprintUrl = (fingerprintData && fingerprintData.length > 20)
      ? await toPublicUrl(supabase, fingerprintData, "huella")
      : null;

    // 2) Firmar (DB)
    const { data: signData, error: signError } = await supabase.rpc("sign_consent_by_token_secure", {
      p_token: token,
      p_signature_data: signatureData, // mantenemos compatibilidad (se guarda lo que ya se guardaba)
      p_signed_by_name: signedByName,
      p_patient_photo_url: patientPhotoUrl,
      p_verification_code: null,
      p_ip_address: null,
      p_user_agent: req.headers.get("user-agent"),
    });

    if (signError) {
      console.error("❌ Error firmando (RPC):", signError);
      return new Response(JSON.stringify({ success: false, error: signError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 3) Obtener datos del consentimiento (para completar payload del webhook)
    const { data: consentRows, error: getError } = await supabase.rpc("get_consent_by_token_secure", {
      p_token: token,
      p_ip_address: null,
      p_user_agent: req.headers.get("user-agent"),
    });

    if (getError || !consentRows || !consentRows[0]) {
      console.error("❌ Error obteniendo consentimiento (RPC):", getError);
      return new Response(JSON.stringify({ success: false, error: "No se pudo leer el consentimiento" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const consent = consentRows[0] as any;
    const payload = (consent.payload || {}) as any;

    const hasDisability = !!payload.hasDisability;
    const isMinor = !!payload.isMinor;
    const requiresGuardian = hasDisability || isMinor;

    const decisionRaw = payload.decision || payload.consentDecision;
    const aceptacion = decisionRaw === "disentir" ? "Rechazado" : "Aceptado";

    const procedureName = payload.procedureName || getProcedureName(consent.consent_type);

    // `nombre_consentimiento` es el filtro con el que n8n busca la plantilla en
    // /plantillas-consentimiento del hospital. Un nombre fuera del catálogo no
    // coincide con ninguna plantilla real, así que se deja registrado en vez de
    // enviarlo en silencio.
    const templateName = getConsentTemplateName(consent.consent_type);
    if (!isKnownConsentType(consent.consent_type)) {
      console.error(
        "⚠️ Tipo de consentimiento fuera del catálogo; el hospital no va a encontrar la plantilla:",
        { consent_type: consent.consent_type, enviado: templateName },
      );
    }

    const guardianName = payload.guardianName || null;
    const guardianDocument = payload.guardianDocument || null;
    const guardianRelationship = payload.guardianRelationship || null;
    const guardianPhone = payload.guardianPhone || null;

    // Firma profesional (si viene base64, convertir a URL)
    let professionalSignature = consent.professional_signature_data || null;
    if (typeof professionalSignature === "string" && professionalSignature.startsWith("data:image")) {
      professionalSignature = await toPublicUrl(supabase, professionalSignature, "firma_profesional");
    }

    // 4) Enviar al webhook externo (siempre server-side)
    const webhookPayload = {
      // Datos del paciente
      paciente_nombre_completo: consent.patient_name,
      paciente_tipo_documento: consent.patient_document_type || "CC",
      paciente_numero_documento: consent.patient_document_number || "",
      paciente_email: consent.patient_email || null,
      paciente_telefono: consent.patient_phone || null,
      paciente_firma: requiresGuardian ? null : (signatureUrl || signatureData),
      paciente_foto: patientPhotoUrl || consent.patient_photo_url || null,
      paciente_huella: fingerprintUrl || null,
      paciente_tiene_discapacidad: hasDisability,
      paciente_es_menor: isMinor,

      // Datos acudiente
      acudiente_nombre_completo: requiresGuardian ? (guardianName || signedByName) : null,
      acudiente_documento: requiresGuardian ? guardianDocument : null,
      acudiente_parentesco: requiresGuardian ? guardianRelationship : null,
      acudiente_telefono: requiresGuardian ? guardianPhone : null,
      acudiente_firma: requiresGuardian ? (signatureUrl || signatureData) : null,

      // Datos consentimiento
      tipo_procedimiento: procedureName,
      procedimiento_medico: procedureName,
      diagnostico: procedureName,
      nombre_consentimiento: templateName,
      aceptacion_procedimiento: aceptacion,
      fecha_firma: new Date().toISOString(),
      fecha_documento: new Date().toISOString().split("T")[0],

      // Profesional
      profesional_nombre_completo: consent.professional_name || "",
      profesional_documento: consent.professional_document || null,
      profesional_firma: professionalSignature,

      // PDF y metadatos
      pdf_url: null,
      consent_id: consent.id,
      payload_adicional: payload,
    };

    const webhookResp = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Hospital-Consent-System/1.0",
      },
      body: JSON.stringify(webhookPayload),
    });

    const webhookText = await webhookResp.text();
    let webhookJson: unknown = null;
    try {
      webhookJson = JSON.parse(webhookText);
    } catch {
      webhookJson = { raw: webhookText };
    }

    // No fallar la firma si el webhook falla, pero sí reportarlo
    const webhookOk = webhookResp.ok;
    if (!webhookOk) {
      console.error("❌ Webhook error:", webhookResp.status, webhookText);
    }

    // Devolver datos completos del consentimiento para que el cliente genere el PDF
    const consentForClient = {
      id: consent.id,
      consent_type: consent.consent_type,
      patient_name: consent.patient_name,
      patient_document_type: consent.patient_document_type,
      patient_document_number: consent.patient_document_number,
      patient_email: consent.patient_email,
      patient_phone: consent.patient_phone,
      patient_photo_url: patientPhotoUrl || consent.patient_photo_url,
      professional_name: consent.professional_name,
      professional_document: consent.professional_document,
      professional_signature_data: professionalSignature,
      signed_at: new Date().toISOString(),
      signed_by_name: signedByName,
      status: "signed",
      payload: consent.payload,
    };

    return new Response(
      JSON.stringify({
        success: true,
        signed: signData?.[0] ?? null,
        patientPhotoUrl,
        consentData: consentForClient,
        webhook: {
          ok: webhookOk,
          status: webhookResp.status,
          response: webhookJson,
        },
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 200 },
    );
  } catch (error: any) {
    console.error("❌ public-sign-consent error:", error?.message || error);
    return new Response(JSON.stringify({ success: false, error: error?.message || "Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
