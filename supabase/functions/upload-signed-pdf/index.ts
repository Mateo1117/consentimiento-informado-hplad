import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "consent-pdfs";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  try {
    const body = (await req.json()) as {
      token?: string;
      fileName?: string;
      pdfBase64?: string;
    };

    const token = (body.token || "").trim();
    const fileName = (body.fileName || "").trim();
    const pdfBase64 = body.pdfBase64 || "";

    if (!token || token.length < 32) return json({ success: false, error: "Token inválido" }, 400);
    if (!pdfBase64 || pdfBase64.length < 100) return json({ success: false, error: "PDF inválido" }, 400);
    // Evitar path traversal: solo nombre plano permitido
    if (!/^[A-Za-z0-9._-]{1,180}\.pdf$/.test(fileName)) {
      return json({ success: false, error: "Nombre de archivo inválido" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Validar que el token corresponde a un consentimiento real y firmado
    const { data: consent, error: consentError } = await supabase
      .from("consents")
      .select("id, status")
      .eq("share_token", token)
      .maybeSingle();

    if (consentError) return json({ success: false, error: consentError.message }, 500);
    if (!consent) return json({ success: false, error: "Token no encontrado" }, 404);
    if (consent.status !== "signed") {
      return json({ success: false, error: "El consentimiento aún no está firmado" }, 400);
    }

    const base64 = pdfBase64.includes(",") ? pdfBase64.split(",")[1] : pdfBase64;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const path = `remote_signed/${consent.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: "application/pdf", upsert: true });

    if (uploadError) {
      console.error("❌ Error subiendo PDF firmado:", uploadError);
      return json({ success: false, error: uploadError.message }, 500);
    }

    const { error: updateError } = await supabase
      .from("consents")
      .update({ pdf_url: path, pdf_size: bytes.length })
      .eq("id", consent.id);

    if (updateError) console.error("⚠️ No se pudo actualizar pdf_url:", updateError);

    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60);

    return json({ success: true, pdfPath: path, pdfUrl: signed?.signedUrl ?? null });
  } catch (error: any) {
    console.error("❌ upload-signed-pdf error:", error?.message || error);
    return json({ success: false, error: error?.message || "Error" }, 500);
  }
});