import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

// Helper para devolver siempre 200 con el contenido de error/éxito
function jsonResponse(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed", errorType: "validation" });
  }

  try {
    const { documento } = await req.json();

    if (!documento || String(documento).trim() === "") {
      return jsonResponse({
        error: "El número de documento es requerido",
        errorType: "validation",
      });
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
          return jsonResponse({
            error: "La consulta tardó demasiado tiempo. Verifique su conexión.",
            errorType: "timeout",
          });
        }

        return jsonResponse({
          error: "No se pudo conectar con el servidor del webhook.",
          errorType: "network",
        });
      }

      lastStatus = response.status;
      console.log(`Status intento ${attempt.name}:`, response.status);

      // Si el formato no coincide (404/405), probamos el siguiente intento
      if (response.status === 404 || response.status === 405) {
        continue;
      }

      if (!response.ok) {
        const err = httpError(response.status, response.statusText);
        return jsonResponse(err);
      }

      // Parse JSON
      let responseText: string;
      try {
        responseText = await response.text();
      } catch (readErr) {
        return jsonResponse({
          error: "No fue posible leer la respuesta del webhook.",
          errorType: "unknown",
        });
      }

      if (!responseText || responseText.trim() === "") {
        return jsonResponse({
          error: "El servidor respondió pero no envió datos.",
          errorType: "empty_response",
        });
      }

      let data: any;
      try {
        data = JSON.parse(responseText);
        console.log("Respuesta parseada:", JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.error("JSON inválido:", responseText);
        return jsonResponse({
          error: "La respuesta del servidor no es válida (JSON inválido).",
          errorType: "parse_error",
        });
      }

      // Verificar si hay un error explícito
      if (data?.error && typeof data.error === "string") {
        console.log("Error en respuesta:", data.error);
        return jsonResponse({
          error: data.error,
          errorType: "api_error",
        });
      }

      // Verificar si el webhook indica explícitamente que no encontró el paciente
      // Analizar la respuesta del webhook: puede ser un array con success=false
      let webhookMessage = "";
      let webhookSuccess: boolean | string | undefined;
      
      if (Array.isArray(data) && data.length > 0) {
        // El webhook devuelve un array con el resultado
        const firstItem = data[0];
        webhookSuccess = firstItem?.success;
        webhookMessage = firstItem?.message || "";
      } else {
        webhookSuccess = data?.success;
        webhookMessage = data?.message || "";
      }
      
      if (webhookSuccess === false || webhookSuccess === "false") {
        console.log("Webhook indica success=false:", webhookMessage);
        return jsonResponse({
          error: webhookMessage || "No se encontraron datos del paciente",
          errorType: "not_found",
          webhookMessage: webhookMessage,
        });
      }

      // Verificar que haya datos de paciente válidos
      // El webhook puede devolver campos en mayúsculas o minúsculas
      const nombrePaciente = data?.NOMBRE_PACIENTE || data?.nombre_paciente || data?.nombrePaciente;
      const documentoPaciente = data?.DOCUMENTO_PACIENTE || data?.documento || data?.documentoPaciente;
      
      // Verificar si es un array con datos del paciente
      let hasPatientData = nombrePaciente || documentoPaciente;
      
      if (!hasPatientData && Array.isArray(data) && data.length > 0) {
        const firstItem = data[0];
        hasPatientData = firstItem?.NOMBRE_PACIENTE || firstItem?.nombre_paciente || firstItem?.nombrePaciente ||
                        firstItem?.DOCUMENTO_PACIENTE || firstItem?.documento || firstItem?.documentoPaciente;
      }
      
      // Verificar que el nombre no esté vacío
      if (!hasPatientData || (nombrePaciente && String(nombrePaciente).trim() === "")) {
        console.log("No se encontraron datos de paciente en la respuesta. Campos:", Object.keys(data || {}));
        return jsonResponse({
          error: "No se encontraron datos del paciente. Valide la creación del mismo en el sistema para continuar.",
          errorType: "not_found",
        });
      }

      console.log("Paciente encontrado exitosamente");

      return jsonResponse({
        success: true,
        data,
        attempt: attempt.name,
      });
    }

    // Si todos dieron 404/405
    const fallbackErr = httpError(lastStatus ?? 404);
    return jsonResponse({
      error:
        "El webhook no respondió al formato esperado. Confirme si el servicio está disponible.",
      errorType: fallbackErr.errorType,
      lastStatus,
    });
  } catch (error: any) {
    console.error("Error general:", error);
    return jsonResponse({
      error: `Error inesperado: ${error.message}`,
      errorType: "unknown",
    });
  }
});
