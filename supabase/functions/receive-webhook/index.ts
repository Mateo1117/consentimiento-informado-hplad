import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface WebhookPayload {
  event: string;
  data: any;
  metadata?: any;
  source?: string;
  timestamp?: string;
}

interface WebhookRecord {
  source: string;
  event_type: string;
  payload: any;
  headers: any;
  processed: boolean;
  error_message?: string;
  processing_attempts: number;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Get headers for processing
    const headers = Object.fromEntries(req.headers.entries());
    console.log('Webhook received from:', headers['user-agent'] || 'Unknown');
    console.log('Headers:', headers);

    // Parse the webhook payload
    let payload: WebhookPayload;
    try {
      payload = await req.json();
    } catch (error) {
      console.error('Failed to parse JSON payload:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    console.log('Webhook payload:', payload);

    // Determine source from headers or payload
    const source = payload.source || 
                  headers['x-webhook-source'] || 
                  headers['user-agent'] || 
                  'unknown';

    // Store webhook in database first
    const webhookRecord: WebhookRecord = {
      source,
      event_type: payload.event || 'unknown',
      payload,
      headers,
      processed: false,
      processing_attempts: 0
    };

    const { data: savedWebhook, error: saveError } = await supabase
      .from('webhook_logs')
      .insert(webhookRecord)
      .select()
      .single();

    if (saveError) {
      console.error('Failed to save webhook:', saveError);
      // Continue processing even if save fails
    }

    // Process the webhook based on event type
    const processingResult = await processWebhook(payload, source, supabase);

    // Update webhook record with processing result
    if (savedWebhook) {
      await supabase
        .from('webhook_logs')
        .update({
          processed: processingResult.success,
          error_message: processingResult.error,
          processing_attempts: 1
        })
        .eq('id', savedWebhook.id);
    }

    if (processingResult.success) {
      return new Response(
        JSON.stringify({ 
          message: 'Webhook processed successfully',
          result: processingResult.data 
        }),
        { 
          status: 200, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          error: 'Processing failed', 
          details: processingResult.error 
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

async function processWebhook(payload: WebhookPayload, source: string, supabase: any) {
  try {
    console.log(`Processing webhook from ${source}, event: ${payload.event}`);

    switch (payload.event) {
      case 'patient.created':
        return await handlePatientCreated(payload.data, supabase);
      
      case 'consent.updated':
        return await handleConsentUpdated(payload.data, supabase);
      
      case 'appointment.scheduled':
        return await handleAppointmentScheduled(payload.data, supabase);
      
      case 'integration.test':
        return await handleIntegrationTest(payload.data);
      
      case 'system.notification':
        return await handleSystemNotification(payload.data, supabase);
      
      default:
        console.log(`Unhandled event type: ${payload.event}`);
        return {
          success: true,
          data: { message: `Event ${payload.event} logged but not processed` }
        };
    }
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function handlePatientCreated(data: any, supabase: any) {
  console.log('Processing patient creation:', data);
  
  // Example: Create or update patient record
  const patientData = {
    patient_name: data.name || data.firstName,
    patient_surname: data.lastName || data.surname,
    document_number: data.documentNumber || data.id,
    document_type: data.documentType || 'CC',
    phone: data.phone,
    eps: data.insurance || data.eps,
    address: data.address,
    birth_date: data.birthDate,
    healthcare_center: data.healthcareCenter || 'External System'
  };

  // You could insert into consent_forms or create a separate patients table
  return {
    success: true,
    data: { message: 'Patient data processed', patient: patientData }
  };
}

async function handleConsentUpdated(data: any, supabase: any) {
  console.log('Processing consent update:', data);
  
  if (data.consentId) {
    const { error } = await supabase
      .from('consent_forms')
      .update({
        consent_decision: data.decision,
        additional_info: data.notes || null
      })
      .eq('id', data.consentId);

    if (error) {
      throw new Error(`Failed to update consent: ${error.message}`);
    }
  }

  return {
    success: true,
    data: { message: 'Consent updated successfully' }
  };
}

async function handleAppointmentScheduled(data: any, supabase: any) {
  console.log('Processing appointment scheduling:', data);
  
  // Example: Log appointment information
  return {
    success: true,
    data: { 
      message: 'Appointment processed',
      appointment: {
        patientId: data.patientId,
        date: data.date,
        time: data.time,
        type: data.type
      }
    }
  };
}

async function handleIntegrationTest(data: any) {
  console.log('Processing integration test:', data);
  
  return {
    success: true,
    data: { 
      message: 'Integration test successful',
      timestamp: new Date().toISOString(),
      receivedData: data
    }
  };
}

async function handleSystemNotification(data: any, supabase: any) {
  console.log('Processing system notification:', data);
  
  // Example: Handle system-wide notifications
  return {
    success: true,
    data: { 
      message: 'System notification processed',
      notification: data
    }
  };
}

serve(handler);