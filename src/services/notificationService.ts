import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NotificationConfig {
  sms?: {
    enabled: boolean;
    provider?: 'twilio' | 'generic' | 'webhook';
    url?: string;
    apiKey?: string;
    fromNumber?: string;
    webhookUrl?: string;
  };
  email?: {
    enabled: boolean;
    provider?: 'resend' | 'webhook';
    webhookUrl?: string;
  };
}

export interface ConsentNotificationData {
  patientData: {
    nombre: string;
    apellidos: string;
    tipoDocumento: string;
    numeroDocumento: string;
    telefono: string;
    centroSalud: string;
    eps: string;
  };
  consentData: {
    decision: string;
    procedures: string[];
    professionalName: string;
    professionalDocument: string;
  };
}

class NotificationService {
  private defaultConfig: NotificationConfig = {
    sms: {
      enabled: true,
      provider: 'generic'
    },
    email: {
      enabled: true,
      provider: 'resend'
    }
  };

  async sendConsentNotifications(data: ConsentNotificationData, config?: NotificationConfig) {
    const finalConfig = { ...this.defaultConfig, ...config };
    const results = { sms: null, email: null, errors: [] };

    console.log('🔔 Sending consent notifications for:', data.patientData.nombre);

    // Send SMS to patient
    if (finalConfig.sms?.enabled && data.patientData.telefono) {
      try {
        const smsResult = await this.sendSMS({
          phoneNumber: data.patientData.telefono,
          message: this.generateSMSMessage(data),
          patientData: data.patientData,
          config: finalConfig.sms
        });
        results.sms = smsResult;
        console.log('✅ SMS notification sent');
      } catch (error: any) {
        console.error('❌ SMS notification failed:', error.message);
        results.errors.push(`SMS: ${error.message}`);
      }
    }

    // Send email to patient
    if (finalConfig.email?.enabled) {
      try {
        // Extract email from EPS or use a default pattern
        const patientEmail = this.extractEmailFromEPS(data.patientData.eps) || 
                           `${data.patientData.numeroDocumento}@paciente.temp`;
        
        const emailResult = await this.sendEmail({
          to: patientEmail,
          type: 'consent_confirmation',
          patientData: data.patientData,
          consentData: data.consentData
        });
        results.email = emailResult;
        console.log('✅ Email notification sent');
      } catch (error: any) {
        console.error('❌ Email notification failed:', error.message);
        results.errors.push(`Email: ${error.message}`);
      }
    }

    // Send notification to medical staff
    try {
      await this.notifyMedicalStaff(data);
      console.log('✅ Medical staff notified');
    } catch (error: any) {
      console.error('❌ Medical staff notification failed:', error.message);
      results.errors.push(`Staff notification: ${error.message}`);
    }

    return results;
  }

  private async sendSMS({ phoneNumber, message, patientData, config }: {
    phoneNumber: string;
    message: string;
    patientData: any;
    config: any;
  }) {
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: {
        phoneNumber: this.formatPhoneNumber(phoneNumber),
        message,
        patientData,
        providerConfig: config?.provider === 'webhook' ? {
          url: config.webhookUrl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': config.apiKey
          }
        } : undefined
      }
    });

    if (error) throw error;
    return data;
  }

  private async sendEmail({ to, type, patientData, consentData }: {
    to: string;
    type: string;
    patientData: any;
    consentData: any;
  }) {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        type,
        patientData,
        consentData
      }
    });

    if (error) throw error;
    return data;
  }

  private async notifyMedicalStaff(data: ConsentNotificationData) {
    // Send email to medical staff about new consent
    const adminEmail = 'admin@santamatilde.gov.co'; // Configure this
    
    await this.sendEmail({
      to: adminEmail,
      type: 'professional_notification',
      patientData: data.patientData,
      consentData: data.consentData
    });
  }

  private generateSMSMessage(data: ConsentNotificationData): string {
    const status = data.consentData.decision === 'aprobar' ? 'APROBADO' : 'DENEGADO';
    
    return `🏥 HOSPITAL PEDRO LEON ALVAREZ DIAZ DE LA MESA
    
Estimado/a ${data.patientData.nombre},

Su consentimiento informado ha sido ${status}.

📋 Documento: ${data.patientData.tipoDocumento} ${data.patientData.numeroDocumento}
📅 Fecha: ${new Date().toLocaleDateString('es-CO')}
⚕️ Estado: ${status}

Conserve este mensaje como comprobante.

Gracias por confiar en nosotros.`;
  }

  private formatPhoneNumber(phone: string): string {
    // Format Colombian phone numbers
    let formatted = phone.replace(/\D/g, ''); // Remove non-digits
    
    if (formatted.startsWith('57')) {
      return `+${formatted}`;
    } else if (formatted.startsWith('3')) {
      return `+57${formatted}`;
    } else if (formatted.length === 10) {
      return `+57${formatted}`;
    }
    
    return phone; // Return as-is if can't format
  }

  private extractEmailFromEPS(eps: string): string | null {
    // Try to extract email from EPS field if it contains one
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const match = eps.match(emailRegex);
    return match ? match[0] : null;
  }

  // Public method to send test notifications
  async sendTestNotifications() {
    const testData: ConsentNotificationData = {
      patientData: {
        nombre: 'Juan',
        apellidos: 'Pérez Test',
        tipoDocumento: 'CC',
        numeroDocumento: '12345678',
        telefono: '+573001234567',
        centroSalud: 'Hospital Pedro Leon Alvarez Diaz de la Mesa',
        eps: 'test@email.com'
      },
      consentData: {
        decision: 'aprobar',
        procedures: ['Examen de sangre', 'Electrocardiograma'],
        professionalName: 'Dr. Test',
        professionalDocument: '87654321'
      }
    };

    try {
      const results = await this.sendConsentNotifications(testData);
      toast.success('Notificaciones de prueba enviadas exitosamente');
      return results;
    } catch (error: any) {
      toast.error(`Error en notificaciones de prueba: ${error.message}`);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();