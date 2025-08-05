import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from 'npm:resend@4.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      to, 
      subject, 
      message, 
      patientData,
      consentData,
      type = 'notification'
    } = await req.json();

    console.log('📧 Email Request:', { to, subject, type });

    // Email templates
    const templates = {
      consent_confirmation: {
        subject: `Confirmación de Consentimiento Informado - ${patientData?.nombre || 'Paciente'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🏥 Hospital Santa Matilde</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Sistema de Consentimientos Informados</p>
            </div>
            
            <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
              <h2 style="color: #1e40af; margin-top: 0;">Consentimiento Registrado Exitosamente</h2>
              
              <p>Estimado/a <strong>${patientData?.nombre} ${patientData?.apellidos}</strong>,</p>
              
              <p>Su consentimiento informado ha sido registrado correctamente en nuestro sistema con los siguientes detalles:</p>
              
              <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981;">
                <p><strong>📋 Fecha:</strong> ${new Date().toLocaleDateString('es-CO')}</p>
                <p><strong>🆔 Documento:</strong> ${patientData?.tipoDocumento} ${patientData?.numeroDocumento}</p>
                <p><strong>🏥 Centro:</strong> ${patientData?.centroSalud}</p>
                <p><strong>⚕️ Estado:</strong> ${consentData?.decision === 'aprobar' ? '✅ Aprobado' : '❌ Denegado'}</p>
                <p><strong>📅 Procedimientos:</strong> ${consentData?.procedures?.join(', ') || 'N/A'}</p>
              </div>
              
              <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #92400e;"><strong>⚠️ Importante:</strong> Conserve este email como comprobante de su consentimiento.</p>
              </div>
              
              <p>Si tiene alguna pregunta, no dude en contactarnos.</p>
              
              <p style="margin-bottom: 0;">Atentamente,<br>
              <strong>Equipo Médico - Hospital Santa Matilde</strong></p>
            </div>
            
            <div style="background: #1e293b; color: #94a3b8; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px;">
              <p style="margin: 0;">© 2025 Hospital Santa Matilde - Sistema Seguro de Consentimientos</p>
              <p style="margin: 5px 0 0 0;">Este email fue generado automáticamente, por favor no responder.</p>
            </div>
          </div>
        `
      },
      
      professional_notification: {
        subject: `Nuevo Consentimiento Registrado - ${patientData?.nombre || 'Paciente'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🔔 Notificación Sistema</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Hospital Santa Matilde</p>
            </div>
            
            <div style="background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0;">
              <h2 style="color: #7c3aed; margin-top: 0;">Nuevo Consentimiento Registrado</h2>
              
              <p>Se ha registrado un nuevo consentimiento informado en el sistema:</p>
              
              <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #7c3aed;">
                <p><strong>👤 Paciente:</strong> ${patientData?.nombre} ${patientData?.apellidos}</p>
                <p><strong>🆔 Documento:</strong> ${patientData?.tipoDocumento} ${patientData?.numeroDocumento}</p>
                <p><strong>📞 Teléfono:</strong> ${patientData?.telefono}</p>
                <p><strong>🏥 Centro:</strong> ${patientData?.centroSalud}</p>
                <p><strong>⚕️ Estado:</strong> ${consentData?.decision === 'aprobar' ? '✅ Aprobado' : '❌ Denegado'}</p>
                <p><strong>👨‍⚕️ Profesional:</strong> ${consentData?.professionalName}</p>
              </div>
              
              <div style="text-align: center; margin: 20px 0;">
                <a href="${Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://af1951d7-255f-4edf-8d9f-67b1b4c15e8c.lovableproject.com')}/admin" 
                   style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Ver en Panel Administrativo
                </a>
              </div>
            </div>
            
            <div style="background: #1e293b; color: #94a3b8; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px;">
              <p style="margin: 0;">Sistema Automático de Notificaciones</p>
            </div>
          </div>
        `
      }
    };

    // Select template or use custom message
    const emailTemplate = templates[type as keyof typeof templates];
    const finalSubject = subject || emailTemplate?.subject || 'Notificación Hospital Santa Matilde';
    const finalHtml = emailTemplate?.html || `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #1e40af;">Hospital Santa Matilde</h2>
        <p>${message}</p>
      </div>
    `;

    // Send with Resend if API key available
    if (Deno.env.get('RESEND_API_KEY')) {
      const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
      
      const { data, error } = await resend.emails.send({
        from: 'Hospital Santa Matilde <noreply@hospitalstm.com>',
        to: [to],
        subject: finalSubject,
        html: finalHtml,
      });

      if (error) {
        throw new Error(`Resend error: ${error.message}`);
      }

      console.log('✅ Email sent via Resend:', data);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully via Resend',
        data: data 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fallback to webhook if no Resend API key
    const webhookUrl = Deno.env.get('EMAIL_WEBHOOK_URL');
    if (webhookUrl) {
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': Deno.env.get('EMAIL_WEBHOOK_KEY') || ''
        },
        body: JSON.stringify({
          to,
          subject: finalSubject,
          html: finalHtml,
          patientData,
          consentData,
          timestamp: new Date().toISOString(),
          source: 'hospital_consent_system'
        })
      });

      console.log('✅ Email sent via webhook:', webhookResponse.status);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully via webhook' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('No email provider configured. Please set RESEND_API_KEY or EMAIL_WEBHOOK_URL.');

  } catch (error: any) {
    console.error('❌ Email Error:', error.message);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});