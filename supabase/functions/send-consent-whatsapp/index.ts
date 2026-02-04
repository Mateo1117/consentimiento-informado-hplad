import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface WhatsAppRequest {
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
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!WHATSAPP_ACCESS_TOKEN) {
      throw new Error('WHATSAPP_ACCESS_TOKEN no está configurado');
    }
    if (!WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WHATSAPP_PHONE_NUMBER_ID no está configurado');
    }

    const { to, patientName, shareUrl, consentType }: WhatsAppRequest = await req.json();

    // Validate required fields
    if (!to || !patientName || !shareUrl) {
      throw new Error('Faltan campos requeridos: to, patientName, shareUrl');
    }

    // Normalize phone number - remove spaces, special chars, ensure country code
    let phoneNumber = to.replace(/\s+/g, '').replace(/[^\d+]/g, '');
    
    // Remove + prefix for WhatsApp API (it expects just numbers)
    if (phoneNumber.startsWith('+')) {
      phoneNumber = phoneNumber.substring(1);
    }
    
    // If Colombian number without country code, add 57
    if (phoneNumber.length === 10 && phoneNumber.startsWith('3')) {
      phoneNumber = '57' + phoneNumber;
    }

    console.log('📱 WhatsApp Request to Meta API:', { phoneNumber, patientName });

    // Build the message using the approved template "consentimiento_firma"
    // Template parameters: {{1}} = patient name, {{2}} = signature URL
    // Using es_CO as the language code (Spanish - Colombia) as configured in Meta Business Suite
    const messageBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: phoneNumber,
      type: "template",
      template: {
        name: "consentimiento_firma",
        language: {
          code: "es_CO"
        },
        components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: patientName
              },
              {
                type: "text",
                text: shareUrl
              }
            ]
          }
        ]
      }
    };

    // Call Meta WhatsApp Cloud API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(messageBody),
      }
    );

    const responseData = await response.json();
    console.log('📨 Meta WhatsApp Response:', response.status, responseData);

    if (!response.ok) {
      const errorMessage = responseData.error?.message || responseData.error?.error_data?.details || JSON.stringify(responseData);
      throw new Error(`Error de WhatsApp API: ${response.status} - ${errorMessage}`);
    }

    console.log('✅ WhatsApp enviado exitosamente a:', phoneNumber);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'WhatsApp enviado exitosamente',
      messageId: responseData.messages?.[0]?.id,
      providerResponse: responseData
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error en send-consent-whatsapp:', error.message);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
