import { supabase } from "@/integrations/supabase/client";

export type DeliveryMethod = 'email' | 'sms' | 'whatsapp' | 'qr' | 'link_copied' | 'email_client' | 'sms_client';
export type DeliveryStatus = 'sent' | 'failed' | 'pending';

export interface DeliveryLog {
  id: string;
  consent_id: string;
  delivery_method: DeliveryMethod;
  recipient: string | null;
  status: DeliveryStatus;
  error_message: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

class DeliveryLogService {
  async logDelivery(
    consentId: string,
    method: DeliveryMethod,
    recipient?: string,
    status: DeliveryStatus = 'sent',
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('consent_delivery_logs')
        .insert({
          consent_id: consentId,
          delivery_method: method,
          recipient: recipient || null,
          status,
          error_message: errorMessage || null,
          metadata: metadata || {},
          created_by: user.user?.id || null
        });

      if (error) {
        console.error('Error logging delivery:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in logDelivery:', error);
      return false;
    }
  }

  async getDeliveryLogs(consentId: string): Promise<DeliveryLog[]> {
    try {
      const { data, error } = await supabase
        .from('consent_delivery_logs')
        .select('*')
        .eq('consent_id', consentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching delivery logs:', error);
        return [];
      }

      return data as DeliveryLog[];
    } catch (error) {
      console.error('Error in getDeliveryLogs:', error);
      return [];
    }
  }

  getMethodLabel(method: DeliveryMethod): string {
    const labels: Record<DeliveryMethod, string> = {
      email: 'Email (servidor)',
      sms: 'SMS (servidor)',
      whatsapp: 'WhatsApp',
      qr: 'Código QR',
      link_copied: 'Enlace copiado',
      email_client: 'Email (cliente)',
      sms_client: 'SMS (cliente)'
    };
    return labels[method] || method;
  }

  getMethodIcon(method: DeliveryMethod): string {
    const icons: Record<DeliveryMethod, string> = {
      email: '📧',
      sms: '📱',
      whatsapp: '💬',
      qr: '📷',
      link_copied: '📋',
      email_client: '✉️',
      sms_client: '📲'
    };
    return icons[method] || '📤';
  }
}

export const deliveryLogService = new DeliveryLogService();
