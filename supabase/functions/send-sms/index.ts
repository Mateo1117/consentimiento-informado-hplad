import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
      phoneNumber, 
      message, 
      providerConfig,
      patientData 
    } = await req.json();

    console.log('📱 SMS Request:', { phoneNumber, message: message.substring(0, 50) + '...' });

    // Default provider configurations
    const defaultConfigs = {
      twilio: {
        url: `https://api.twilio.com/2010-04-01/Accounts/${Deno.env.get('TWILIO_ACCOUNT_SID')}/Messages.json`,
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${Deno.env.get('TWILIO_ACCOUNT_SID')}:${Deno.env.get('TWILIO_AUTH_TOKEN')}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        bodyFormat: (phone: string, text: string) => 
          `From=${Deno.env.get('TWILIO_PHONE_NUMBER')}&To=${phone}&Body=${encodeURIComponent(text)}`
      },
      generic: {
        url: Deno.env.get('SMS_PROVIDER_URL'),
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SMS_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        bodyFormat: (phone: string, text: string) => JSON.stringify({
          to: phone,
          message: text,
          from: Deno.env.get('SMS_FROM_NUMBER') || 'Hospital'
        })
      },
      webhook: {
        url: Deno.env.get('SMS_WEBHOOK_URL'),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': Deno.env.get('SMS_WEBHOOK_KEY')
        },
        bodyFormat: (phone: string, text: string) => JSON.stringify({
          phone: phone,
          message: text,
          patient: patientData,
          timestamp: new Date().toISOString(),
          source: 'hospital_consent_system'
        })
      }
    };

    // Use provided config or default
    const config = providerConfig || defaultConfigs.generic;
    
    if (!config.url) {
      throw new Error('No SMS provider configured. Please set SMS_PROVIDER_URL or provide providerConfig.');
    }

    // Prepare request
    const requestOptions: RequestInit = {
      method: config.method || 'POST',
      headers: config.headers || {},
    };

    // Format body based on provider
    if (typeof config.bodyFormat === 'function') {
      requestOptions.body = config.bodyFormat(phoneNumber, message);
    } else {
      requestOptions.body = JSON.stringify({
        to: phoneNumber,
        message: message,
        ...config.bodyFormat
      });
    }

    console.log('📤 Sending SMS to provider:', config.url);

    // Send SMS
    const response = await fetch(config.url, requestOptions);
    const responseData = await response.text();

    console.log('📨 SMS Provider Response:', response.status, responseData);

    if (!response.ok) {
      throw new Error(`SMS provider error: ${response.status} - ${responseData}`);
    }

    // Log successful SMS
    console.log('✅ SMS sent successfully to:', phoneNumber);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'SMS sent successfully',
      providerResponse: responseData,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ SMS Error:', error.message);
    
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