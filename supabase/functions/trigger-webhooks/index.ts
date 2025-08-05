import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookConfig {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  events: string[];
  active: boolean;
  name: string;
  platform?: 'n8n' | 'zapier' | 'make' | 'power_automate' | 'generic';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      event, 
      data, 
      webhookConfigs,
      metadata = {} 
    } = await req.json();

    console.log('🔗 Webhook trigger request:', { event, dataKeys: Object.keys(data || {}) });

    // Default webhook configurations if none provided
    const defaultWebhooks: WebhookConfig[] = [
      {
        name: 'Primary Automation',
        url: Deno.env.get('WEBHOOK_PRIMARY_URL') || '',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': Deno.env.get('WEBHOOK_API_KEY') || '',
          'User-Agent': 'Hospital-Santa-Matilde-System/1.0'
        },
        events: ['*'], // All events
        active: true,
        platform: 'generic'
      },
      {
        name: 'n8n Integration',
        url: Deno.env.get('N8N_WEBHOOK_URL') || '',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        events: ['consent.created', 'consent.updated'],
        active: !!Deno.env.get('N8N_WEBHOOK_URL'),
        platform: 'n8n'
      },
      {
        name: 'Zapier Integration',
        url: Deno.env.get('ZAPIER_WEBHOOK_URL') || '',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        events: ['consent.created'],
        active: !!Deno.env.get('ZAPIER_WEBHOOK_URL'),
        platform: 'zapier'
      }
    ];

    const webhooks = webhookConfigs || defaultWebhooks.filter(w => w.url && w.active);

    if (webhooks.length === 0) {
      console.log('⚠️ No active webhooks configured');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No webhooks configured',
        triggeredWebhooks: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results = [];
    const timestamp = new Date().toISOString();

    // Prepare universal payload
    const universalPayload = {
      event,
      timestamp,
      data,
      metadata: {
        source: 'hospital_santa_matilde',
        system: 'consent_management',
        version: '1.0',
        environment: Deno.env.get('ENVIRONMENT') || 'production',
        ...metadata
      }
    };

    // Send to all matching webhooks
    for (const webhook of webhooks) {
      // Check if webhook should receive this event
      if (!webhook.events.includes('*') && !webhook.events.includes(event)) {
        console.log(`⏭️ Skipping webhook ${webhook.name} - event ${event} not in allowed events`);
        continue;
      }

      try {
        // Customize payload based on platform
        let payload = universalPayload;
        
        if (webhook.platform === 'zapier') {
          // Zapier prefers flat structure
          payload = {
            ...universalPayload.data,
            event_type: event,
            timestamp,
            source: 'hospital_santa_matilde'
          };
        } else if (webhook.platform === 'make') {
          // Make.com (formerly Integromat) format
          payload = {
            trigger: event,
            timestamp,
            payload: universalPayload.data,
            metadata: universalPayload.metadata
          };
        } else if (webhook.platform === 'power_automate') {
          // Microsoft Power Automate format
          payload = {
            eventType: event,
            eventTime: timestamp,
            subject: `hospital/consent/${event}`,
            data: universalPayload.data,
            dataVersion: '1.0'
          };
        }

        console.log(`📤 Sending to ${webhook.name} (${webhook.platform}):`, webhook.url);

        const response = await fetch(webhook.url, {
          method: webhook.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...webhook.headers
          },
          body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        
        results.push({
          webhook: webhook.name,
          platform: webhook.platform,
          url: webhook.url,
          status: response.status,
          success: response.ok,
          response: responseText.substring(0, 200), // Limit response size
          timestamp
        });

        if (response.ok) {
          console.log(`✅ Webhook ${webhook.name} successful:`, response.status);
        } else {
          console.log(`❌ Webhook ${webhook.name} failed:`, response.status, responseText);
        }

      } catch (error: any) {
        console.error(`❌ Webhook ${webhook.name} error:`, error.message);
        results.push({
          webhook: webhook.name,
          platform: webhook.platform,
          url: webhook.url,
          success: false,
          error: error.message,
          timestamp
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    console.log(`🎯 Webhook summary: ${successCount}/${totalCount} successful`);

    return new Response(JSON.stringify({
      success: successCount > 0,
      message: `Triggered ${successCount}/${totalCount} webhooks successfully`,
      event,
      timestamp,
      triggeredWebhooks: totalCount,
      successfulWebhooks: successCount,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Webhook trigger error:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});