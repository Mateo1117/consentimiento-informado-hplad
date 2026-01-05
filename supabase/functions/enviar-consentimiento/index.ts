import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WEBHOOK_URL = "https://webhook.mcmasociados.tech/webhook/crear_consentimiento";

interface ConsentPayload {
  // Datos del paciente
  paciente_nombre_completo: string;
  paciente_tipo_documento: string;
  paciente_numero_documento: string;
  paciente_email: string | null;
  paciente_telefono: string | null;
  paciente_firma: string | null; // base64 de la firma
  paciente_foto: string | null; // URL de la foto
  
  // Datos del consentimiento
  tipo_procedimiento: string;
  nombre_consentimiento: string;
  fecha_firma: string;
  
  // Datos del profesional
  profesional_nombre_completo: string;
  profesional_documento: string | null;
  profesional_firma: string | null; // base64 de la firma
  
  // PDF y metadatos
  pdf_url: string | null;
  consent_id: string;
  payload_adicional: any;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const body = await req.json();
    console.log("📤 Preparando envío de consentimiento al webhook externo");
    console.log("📋 Datos recibidos:", JSON.stringify({
      consent_id: body.consent_id,
      paciente_nombre: body.paciente_nombre_completo,
      tipo_procedimiento: body.tipo_procedimiento,
      profesional: body.profesional_nombre_completo,
      tiene_firma_paciente: !!body.paciente_firma,
      tiene_foto_paciente: !!body.paciente_foto,
      tiene_firma_profesional: !!body.profesional_firma,
      tiene_pdf: !!body.pdf_url
    }, null, 2));

    // Validar datos mínimos requeridos
    if (!body.paciente_nombre_completo) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "El nombre del paciente es requerido" 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Construir payload para el webhook
    const webhookPayload: ConsentPayload = {
      // Datos del paciente
      paciente_nombre_completo: body.paciente_nombre_completo || "",
      paciente_tipo_documento: body.paciente_tipo_documento || "CC",
      paciente_numero_documento: body.paciente_numero_documento || "",
      paciente_email: body.paciente_email || null,
      paciente_telefono: body.paciente_telefono || null,
      paciente_firma: body.paciente_firma || null,
      paciente_foto: body.paciente_foto || null,
      
      // Datos del consentimiento
      tipo_procedimiento: body.tipo_procedimiento || "",
      nombre_consentimiento: body.nombre_consentimiento || "",
      fecha_firma: body.fecha_firma || new Date().toISOString(),
      
      // Datos del profesional
      profesional_nombre_completo: body.profesional_nombre_completo || "",
      profesional_documento: body.profesional_documento || null,
      profesional_firma: body.profesional_firma || null,
      
      // PDF y metadatos
      pdf_url: body.pdf_url || null,
      consent_id: body.consent_id || "",
      payload_adicional: body.payload_adicional || {}
    };

    // Construir URL con parámetros para GET
    const params = new URLSearchParams();
    params.append('paciente_nombre_completo', webhookPayload.paciente_nombre_completo);
    params.append('paciente_tipo_documento', webhookPayload.paciente_tipo_documento);
    params.append('paciente_numero_documento', webhookPayload.paciente_numero_documento);
    if (webhookPayload.paciente_email) params.append('paciente_email', webhookPayload.paciente_email);
    if (webhookPayload.paciente_telefono) params.append('paciente_telefono', webhookPayload.paciente_telefono);
    if (webhookPayload.paciente_firma) params.append('paciente_firma', webhookPayload.paciente_firma);
    if (webhookPayload.paciente_foto) params.append('paciente_foto', webhookPayload.paciente_foto);
    params.append('tipo_procedimiento', webhookPayload.tipo_procedimiento);
    params.append('nombre_consentimiento', webhookPayload.nombre_consentimiento);
    params.append('fecha_firma', webhookPayload.fecha_firma);
    params.append('profesional_nombre_completo', webhookPayload.profesional_nombre_completo);
    if (webhookPayload.profesional_documento) params.append('profesional_documento', webhookPayload.profesional_documento);
    if (webhookPayload.profesional_firma) params.append('profesional_firma', webhookPayload.profesional_firma);
    if (webhookPayload.pdf_url) params.append('pdf_url', webhookPayload.pdf_url);
    params.append('consent_id', webhookPayload.consent_id);

    const fullUrl = `${WEBHOOK_URL}?${params.toString()}`;
    console.log("🔗 Enviando al webhook (GET):", WEBHOOK_URL);

    // Intentar primero con GET, si falla intentar con POST
    let response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Hospital-Consent-System/1.0"
      }
    });

    // Si GET falla con 404/405, intentar POST
    if (response.status === 404 || response.status === 405) {
      console.log("🔄 GET no disponible, intentando POST...");
      response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Hospital-Consent-System/1.0"
        },
        body: JSON.stringify(webhookPayload)
      });
    }

    const responseText = await response.text();
    console.log("📥 Respuesta del webhook - Status:", response.status);
    console.log("📥 Respuesta del webhook - Body:", responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      console.error("❌ Error del webhook:", response.status, responseText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `El webhook respondió con error: ${response.status}`,
          webhookStatus: response.status,
          webhookResponse: responseData
        }),
        {
          status: 200, // Retornamos 200 para no fallar el flujo principal
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("✅ Consentimiento enviado exitosamente al webhook");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Consentimiento enviado al webhook exitosamente",
        webhookStatus: response.status,
        webhookResponse: responseData
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("❌ Error al enviar consentimiento:", error.message);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: `Error al enviar: ${error.message}`
      }),
      {
        status: 200, // No falla el flujo principal
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
