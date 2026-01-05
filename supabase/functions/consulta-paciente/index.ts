import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const WEBHOOK_URL = 'https://webhook.mcmasociados.tech/webhook/consulta-paciente';

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  try {
    const { documento } = await req.json();
    
    if (!documento) {
      return new Response(
        JSON.stringify({ 
          error: 'El número de documento es requerido',
          errorType: 'validation'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`Consultando paciente con documento: ${documento}`);
    
    // Build the webhook URL with query parameters
    const webhookUrl = `${WEBHOOK_URL}?op=GetPaciente&documento_paciente=${encodeURIComponent(documento)}`;
    console.log('URL de consulta:', webhookUrl);

    // Make request to the webhook with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let response: Response;
    try {
      response = await fetch(webhookUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error('Error de fetch:', fetchError);
      
      if (fetchError.name === 'AbortError') {
        return new Response(
          JSON.stringify({ 
            error: 'La consulta tardó demasiado tiempo. Verifique su conexión.',
            errorType: 'timeout'
          }),
          { status: 504, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'No se pudo conectar con el servidor del webhook.',
          errorType: 'network'
        }),
        { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    clearTimeout(timeoutId);
    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorMessages: Record<number, string> = {
        400: 'Solicitud inválida.',
        401: 'No autorizado.',
        403: 'Acceso denegado.',
        404: 'Paciente no encontrado.',
        500: 'Error interno del servidor.',
        502: 'El servidor no está respondiendo.',
        503: 'Servicio no disponible.',
        504: 'Tiempo de espera agotado.'
      };
      
      return new Response(
        JSON.stringify({ 
          error: errorMessages[response.status] || `Error del servidor: ${response.status}`,
          errorType: 'http'
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Parse response
    let data;
    try {
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      if (!responseText || responseText.trim() === '') {
        return new Response(
          JSON.stringify({ 
            error: 'El servidor respondió pero no envió datos.',
            errorType: 'empty_response'
          }),
          { status: 204, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'La respuesta del servidor no es válida (JSON inválido).',
          errorType: 'parse_error'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Datos recibidos:', data);

    // Check for error in response
    if (data.error) {
      return new Response(
        JSON.stringify({ 
          error: typeof data.error === 'string' ? data.error : 'Error en la consulta',
          errorType: 'api_error'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (data.success === false || data.success === 'false') {
      return new Response(
        JSON.stringify({ 
          error: data.message || 'No se encontró el paciente',
          errorType: 'not_found'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Return successful response
    return new Response(
      JSON.stringify({ 
        success: true,
        data: data
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error: any) {
    console.error('Error general:', error);
    return new Response(
      JSON.stringify({ 
        error: `Error inesperado: ${error.message}`,
        errorType: 'unknown'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
