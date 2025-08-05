import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WebhookConfig {
  id?: string;
  name: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string>;
  events: string[];
  active: boolean;
  platform: 'n8n' | 'zapier' | 'make' | 'power_automate' | 'generic';
  description?: string;
}

export interface AutomationEvent {
  consent: {
    created: 'consent.created';
    updated: 'consent.updated';
    approved: 'consent.approved';
    denied: 'consent.denied';
  };
  patient: {
    registered: 'patient.registered';
    updated: 'patient.updated';
  };
  system: {
    backup: 'system.backup';
    alert: 'system.alert';
  };
}

class AutomationService {
  private readonly AVAILABLE_EVENTS = [
    'consent.created',
    'consent.updated', 
    'consent.approved',
    'consent.denied',
    'patient.registered',
    'patient.updated',
    'system.backup',
    'system.alert'
  ];

  private readonly PLATFORM_TEMPLATES = {
    n8n: {
      name: 'n8n Workflow',
      method: 'POST' as const,
      headers: { 'Content-Type': 'application/json' },
      description: 'Conecta con workflows de n8n para automatizaciones complejas'
    },
    zapier: {
      name: 'Zapier Zap',
      method: 'POST' as const,
      headers: { 'Content-Type': 'application/json' },
      description: 'Integra con Zapier para conectar 5000+ aplicaciones'
    },
    make: {
      name: 'Make.com Scenario',
      method: 'POST' as const,
      headers: { 'Content-Type': 'application/json' },
      description: 'Automatización visual con Make.com (ex-Integromat)'
    },
    power_automate: {
      name: 'Power Automate Flow',
      method: 'POST' as const,
      headers: { 'Content-Type': 'application/json' },
      description: 'Integración con Microsoft Power Automate'
    },
    generic: {
      name: 'Webhook Genérico',
      method: 'POST' as const,
      headers: { 'Content-Type': 'application/json' },
      description: 'Webhook personalizado para cualquier sistema'
    }
  };

  async triggerEvent(event: string, data: any, metadata?: any) {
    try {
      console.log(`🎯 Triggering automation event: ${event}`);

      const { data: result, error } = await supabase.functions.invoke('trigger-webhooks', {
        body: {
          event,
          data,
          metadata: {
            ...metadata,
            triggeredAt: new Date().toISOString(),
            userAgent: navigator.userAgent
          }
        }
      });

      if (error) {
        console.error('Webhook trigger error:', error);
        throw error;
      }

      console.log('✅ Automation triggered successfully:', result);
      return result;

    } catch (error: any) {
      console.error('❌ Failed to trigger automation:', error.message);
      throw error;
    }
  }

  // Predefined event triggers
  async onConsentCreated(consentData: any, patientData: any) {
    return await this.triggerEvent('consent.created', {
      consent: consentData,
      patient: patientData,
      summary: {
        patientName: `${patientData.nombre} ${patientData.apellidos}`,
        documentNumber: patientData.numeroDocumento,
        decision: consentData.decision,
        procedures: consentData.selectedProcedures || [],
        professionalName: consentData.professionalName,
        healthcareCenter: patientData.centroSalud,
        timestamp: new Date().toISOString()
      }
    });
  }

  async onConsentApproved(consentData: any, patientData: any) {
    return await this.triggerEvent('consent.approved', {
      consent: consentData,
      patient: patientData,
      approvalDetails: {
        approvedBy: consentData.professionalName,
        approvedAt: new Date().toISOString(),
        procedures: consentData.selectedProcedures || []
      }
    });
  }

  async onPatientRegistered(patientData: any) {
    return await this.triggerEvent('patient.registered', {
      patient: patientData,
      registrationInfo: {
        source: 'consent_system',
        timestamp: new Date().toISOString()
      }
    });
  }

  async onSystemAlert(alertType: string, details: any) {
    return await this.triggerEvent('system.alert', {
      alertType,
      details,
      severity: details.severity || 'info',
      timestamp: new Date().toISOString()
    });
  }

  // Configuration helpers
  generateWebhookConfig(platform: keyof typeof this.PLATFORM_TEMPLATES, webhookUrl: string, events: string[] = ['*']): WebhookConfig {
    const template = this.PLATFORM_TEMPLATES[platform];
    
    return {
      name: template.name,
      url: webhookUrl,
      method: template.method,
      headers: { ...template.headers },
      events,
      active: true,
      platform,
      description: template.description
    };
  }

  async testWebhook(webhookUrl: string, platform: string = 'generic') {
    try {
      const testData = {
        test: true,
        message: 'Prueba de conexión desde Hospital Pedro Leon Alvarez Diaz de la Mesa',
        timestamp: new Date().toISOString(),
        platform,
        patient: {
          nombre: 'Juan',
          apellidos: 'Pérez Test',
          numeroDocumento: '12345678'
        },
        consent: {
          decision: 'aprobar',
          procedures: ['Examen de prueba']
        }
      };

      // Use Supabase edge function to avoid CORS issues
      const { data: result, error } = await supabase.functions.invoke('test-webhook', {
        body: {
          webhookUrl,
          platform,
          testData
        }
      });

      if (error) {
        console.error('Webhook test error:', error);
        toast.error(`❌ Error en prueba de webhook: ${error.message}`);
        return { success: false, error: error.message };
      }

      if (result?.success) {
        toast.success(`✅ Webhook de prueba exitoso (${result.status})`);
        return { success: true, status: result.status, response: result.response };
      } else {
        toast.error(`❌ Webhook de prueba falló (${result?.status || 'Unknown'})`);
        return { success: false, status: result?.status, response: result?.response || result?.error };
      }

    } catch (error: any) {
      console.error('Webhook test error:', error);
      toast.error(`❌ Error en prueba de webhook: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  getAvailableEvents() {
    return this.AVAILABLE_EVENTS.map(event => ({
      value: event,
      label: this.getEventLabel(event),
      description: this.getEventDescription(event)
    }));
  }

  private getEventLabel(event: string): string {
    const labels: Record<string, string> = {
      'consent.created': 'Nuevo Consentimiento',
      'consent.updated': 'Consentimiento Actualizado',
      'consent.approved': 'Consentimiento Aprobado',
      'consent.denied': 'Consentimiento Denegado',
      'patient.registered': 'Paciente Registrado',
      'patient.updated': 'Paciente Actualizado',
      'system.backup': 'Backup del Sistema',
      'system.alert': 'Alerta del Sistema'
    };
    return labels[event] || event;
  }

  private getEventDescription(event: string): string {
    const descriptions: Record<string, string> = {
      'consent.created': 'Se dispara cuando se crea un nuevo consentimiento informado',
      'consent.updated': 'Se dispara cuando se modifica un consentimiento existente',
      'consent.approved': 'Se dispara específicamente cuando un consentimiento es aprobado',
      'consent.denied': 'Se dispara específicamente cuando un consentimiento es denegado',
      'patient.registered': 'Se dispara cuando se registra un nuevo paciente',
      'patient.updated': 'Se dispara cuando se actualiza información de paciente',
      'system.backup': 'Se dispara durante procesos de backup automático',
      'system.alert': 'Se dispara para alertas del sistema'
    };
    return descriptions[event] || 'Evento personalizado del sistema';
  }

  getPlatformInstructions(platform: string): string {
    const instructions: Record<string, string> = {
      n8n: `1. En n8n, crea un nuevo workflow
2. Agrega un nodo "Webhook" 
3. Configura el método como POST
4. Copia la URL del webhook y pégala aquí
5. Los datos llegarán en formato JSON estándar`,

      zapier: `1. Ve a zapier.com y crea un nuevo Zap
2. Selecciona "Webhooks by Zapier" como trigger
3. Escoge "Catch Hook"  
4. Copia la webhook URL y pégala aquí
5. Los datos llegarán en formato plano optimizado para Zapier`,

      make: `1. En make.com, crea un nuevo escenario
2. Agrega un módulo "Webhooks" > "Custom webhook"
3. Copia la URL generada y pégala aquí
4. Los datos llegarán con estructura trigger/payload`,

      power_automate: `1. En Power Automate, crea un nuevo flujo
2. Selecciona "When a HTTP request is received" como trigger
3. Copia la URL HTTP POST y pégala aquí
4. Los datos seguirán el formato de eventos de Azure`,

      generic: `1. Configura tu endpoint para recibir POST requests
2. Acepta JSON en el body con estructura:
   {
     "event": "consent.created",
     "timestamp": "2025-01-01T00:00:00Z", 
     "data": {...},
     "metadata": {...}
   }
3. Responde con status 200 para confirmar recepción`
    };

    return instructions[platform] || instructions.generic;
  }
}

export const automationService = new AutomationService();