import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WEBHOOK_URL = "https://webhook.mcmasociados.tech/webhook/consulta-paciente";

type ErrorType =
  | "validation"
  | "timeout"
  | "network"
  | "http"
  | "empty_response"
  | "parse_error"
  | "api_error"
  | "not_found"
  | "unknown";

function httpError(status: number, statusText?: string) {
  const messages: Record<number, { error: string; errorType: ErrorType }> = {
    400: { error: "Solicitud inválida.", errorType: "http" },
    401: { error: "No autorizado.", errorType: "http" },
    403: { error: "Acceso denegado.", errorType: "http" },
    404: { error: "Webhook no encontrado (404). Verifique la URL.", errorType: "http" },
    405: { error: "Método no permitido (405).", errorType: "http" },
    500: { error: "Error interno del servidor.", errorType: "http" },
    502: { error: "El servidor no está respondiendo.", errorType: "http" },
    503: { error: "Servicio no disponible.", errorType: "http" },
    504: { error: "Tiempo de espera agotado.", errorType: "timeout" },
  };
  return (
    messages[status] || {
      error: `Error del servidor: ${status}${statusText ? ` ${statusText}` : ""}`,
      errorType: "http" as const,
    }
  );
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
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
    const { documento } = await req.json();

    if (!documento || String(documento).trim() === "") {
      return new Response(
        JSON.stringify({
          error: "El número de documento es requerido",
          errorType: "validation",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const doc = String(documento).trim();
    console.log(`Consultando paciente con documento: ${doc}`);

    const attempts: Array<{
      name: string;
      method: "GET" | "POST";
      url: string;
      headers: Record<string, string>;
      body?: string;
    }> = [
      {
        name: "POST_JSON",
        method: "POST",
        url: WEBHOOK_URL,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documento: doc, op: "GetPaciente", documento_paciente: doc }),
      },
      {
        name: "GET_QUERY_documento_paciente",
        method: "GET",
        url: `${WEBHOOK_URL}?op=GetPaciente&documento_paciente=${encodeURIComponent(doc)}`,
        headers: { Accept: "application/json" },
      },
      {
        name: "GET_QUERY_documento",
        method: "GET",
        url: `${WEBHOOK_URL}?documento=${encodeURIComponent(doc)}`,
        headers: { Accept: "application/json" },
      },
    ];

    let lastStatus: number | null = null;

    for (const attempt of attempts) {
      console.log(`Intento ${attempt.name} => ${attempt.method} ${attempt.url}`);

      let response: Response;
      try {
        response = await fetchWithTimeout(
          attempt.url,
          {
            method: attempt.method,
            headers: attempt.headers,
            body: attempt.body,
          },
          15000,
        );
      } catch (fetchError: any) {
        console.error(`Error de fetch en intento ${attempt.name}:`, fetchError);

        if (fetchError?.name === "AbortError") {
          return new Response(
            JSON.stringify({
              error: "La consulta tardó demasiado tiempo. Verifique su conexión.",
              errorType: "timeout",
            }),
            {
              status: 504,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            },
          );
        }

        return new Response(
          JSON.stringify({
            error: "No se pudo conectar con el servidor del webhook.",
            errorType: "network",
          }),
          {
            status: 502,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      lastStatus = response.status;
      console.log(`Status intento ${attempt.name}:`, response.status);

      // Si el formato no coincide (404/405), probamos el siguiente intento
      if (response.status === 404 || response.status === 405) {
        continue;
      }

      if (!response.ok) {
        const err = httpError(response.status, response.statusText);
        return new Response(JSON.stringify(err), {
          status: response.status,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // Parse JSON
      let responseText: string;
      try {
        responseText = await response.text();
      } catch (readErr) {
        return new Response(
          JSON.stringify({
            error: "No fue posible leer la respuesta del webhook.",
            errorType: "unknown",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      if (!responseText || responseText.trim() === "") {
        return new Response(
          JSON.stringify({
            error: "El servidor respondió pero no envió datos.",
            errorType: "empty_response",
          }),
          {
            status: 204,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON inválido:", responseText);
        return new Response(
          JSON.stringify({
            error: "La respuesta del servidor no es válida (JSON inválido).",
            errorType: "parse_error",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      if (data?.error) {
        return new Response(
          JSON.stringify({
            error: typeof data.error === "string" ? data.error : "Error en la consulta",
            errorType: "api_error",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      if (data?.success === false || data?.success === "false") {
        return new Response(
          JSON.stringify({
            error: data?.message || "No se encontró el paciente",
            errorType: "not_found",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data,
          attempt: attempt.name,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // Si todos dieron 404/405
    const fallbackErr = httpError(lastStatus ?? 404);
    return new Response(
      JSON.stringify({
        error:
          "El webhook no respondió al formato esperado (404/405). Confirme si requiere POST (JSON) o parámetros GET.",
        errorType: fallbackErr.errorType,
        lastStatus,
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (error: any) {
    console.error("Error general:", error);
    return new Response(
      JSON.stringify({
        error: `Error inesperado: ${error.message}`,
        errorType: "unknown",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
});
