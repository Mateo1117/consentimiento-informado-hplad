import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ConsentSmsRequest {
  to: string;
  patientName: string;
  shareUrl: string;
  consentType?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HABLAME_API_KEY = Deno.env.get('HABLAME_API_KEY');
    if (!HABLAME_API_KEY) {
      throw new Error('HABLAME_API_KEY no está configurado');
    }

    const { to, patientName, shareUrl, consentType }: ConsentSmsRequest = await req.json();

    // Validate required fields
    if (!to || !patientName || !shareUrl) {
      throw new Error('Faltan campos requeridos: to, patientName, shareUrl');
    }

    // Normalize phone number - remove spaces and ensure it starts with country code
    let phoneNumber = to.replace(/\s+/g, '').replace(/[^\d+]/g, '');
    
    // If starts with +, remove it for Hablame.co
    if (phoneNumber.startsWith('+')) {
      phoneNumber = phoneNumber.substring(1);
    }
    
    // If Colombian number without country code, add 57
    if (phoneNumber.length === 10 && phoneNumber.startsWith('3')) {
      phoneNumber = '57' + phoneNumber;
    }

    console.log('📱 SMS Request to Hablame.co:', { phoneNumber, patientName });

    // Build SMS message (keep it short - SMS has 160 char limit)
    const message = `Hospital Santa Matilde: ${patientName}, firme su consentimiento${consentType ? ` (${consentType})` : ''} aquí: ${shareUrl}`;

    // Call Hablame.co API v5
    const response = await fetch('https://www.hablame.co/api/sms/v5/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HABLAME_API_KEY}`,
      },
      body: JSON.stringify({
        toNumber: phoneNumber,
        sms: message,
      }),
    });

    const responseData = await response.json();
    console.log('📨 Hablame.co Response:', response.status, responseData);

    if (!response.ok) {
      throw new Error(`Hablame.co error: ${response.status} - ${JSON.stringify(responseData)}`);
    }

    // Check for Hablame.co specific error responses
    if (responseData.status === 'error' || responseData.resultado !== undefined && responseData.resultado < 0) {
      throw new Error(`Error de Hablame.co: ${responseData.mensaje || responseData.message || 'Error desconocido'}`);
    }

    console.log('✅ SMS enviado exitosamente a:', phoneNumber);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'SMS enviado exitosamente',
      messageId: responseData.smsId || responseData.id,
      providerResponse: responseData
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error en send-consent-sms:', error.message);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
