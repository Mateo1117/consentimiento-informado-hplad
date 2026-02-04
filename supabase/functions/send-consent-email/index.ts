import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ConsentEmailRequest {
  to: string;
  patientName: string;
  shareUrl: string;
  consentType?: string;
  professionalName?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY no está configurado');
    }

    const { to, patientName, shareUrl, consentType, professionalName }: ConsentEmailRequest = await req.json();

    // Validate required fields
    if (!to || !patientName || !shareUrl) {
      throw new Error('Faltan campos requeridos: to, patientName, shareUrl');
    }

    console.log('📧 Enviando email de consentimiento a:', to);

    const resend = new Resend(RESEND_API_KEY);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🏥 Hospital Santa Matilde</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Sistema de Consentimientos Informados</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="color: #1e40af; margin-top: 0; font-size: 20px;">Firma de Consentimiento Requerida</h2>
            
            <p style="color: #374151; line-height: 1.6;">
              Estimado/a <strong>${patientName}</strong>,
            </p>
            
            <p style="color: #374151; line-height: 1.6;">
              Se requiere su firma para un consentimiento informado${consentType ? ` de <strong>${consentType}</strong>` : ''}.
              ${professionalName ? `<br>Profesional a cargo: <strong>${professionalName}</strong>` : ''}
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${shareUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(16,185,129,0.3);">
                ✍️ Firmar Consentimiento
              </a>
            </div>
            
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>⚠️ Importante:</strong> Este enlace es personal e intransferible. No lo comparta con otras personas.
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
              Si no puede hacer clic en el botón, copie y pegue este enlace en su navegador:<br>
              <a href="${shareUrl}" style="color: #3b82f6; word-break: break-all;">${shareUrl}</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            
            <p style="color: #374151; margin-bottom: 0;">
              Atentamente,<br>
              <strong>Equipo Médico</strong><br>
              Hospital Santa Matilde
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">© 2025 Hospital Santa Matilde</p>
            <p style="margin: 8px 0 0 0;">Este correo fue generado automáticamente. Por favor no responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: 'Hospital Santa Matilde <onboarding@resend.dev>',
      to: [to],
      subject: `Consentimiento Informado - Firma Requerida${consentType ? ` (${consentType})` : ''}`,
      html: emailHtml,
    });

    if (error) {
      console.error('❌ Error Resend:', error);
      throw new Error(`Error al enviar email: ${error.message}`);
    }

    console.log('✅ Email enviado exitosamente:', data);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email enviado exitosamente',
      messageId: data?.id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error en send-consent-email:', error.message);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
