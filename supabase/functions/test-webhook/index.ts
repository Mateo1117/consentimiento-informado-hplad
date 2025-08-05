import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webhookUrl, platform, testData } = await req.json();

    if (!webhookUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Webhook URL is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`Testing webhook: ${webhookUrl} for platform: ${platform}`);

    // Make the webhook request from the server side to avoid CORS
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Hospital-Santa-Matilde-Test/1.0'
      },
      body: JSON.stringify(testData)
    });

    const responseText = await response.text();
    const isSuccess = response.ok;

    console.log(`Webhook test result: ${isSuccess ? 'SUCCESS' : 'FAILED'} - Status: ${response.status}`);

    return new Response(
      JSON.stringify({
        success: isSuccess,
        status: response.status,
        response: responseText,
        headers: Object.fromEntries(response.headers.entries())
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Webhook test error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to test webhook' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});