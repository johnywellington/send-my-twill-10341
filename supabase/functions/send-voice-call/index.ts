import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VoiceCallRequest {
  to: string;
  from: string;
  text: string;
  language?: string;
  style?: number;
  premium?: boolean;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, from, text, language = "en-US", style = 0, premium = false }: VoiceCallRequest = await req.json();

    // Validate required fields
    if (!to || !from || !text) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: to, from, and text are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get Vonage credentials from environment variables
    const VONAGE_API_KEY = Deno.env.get('VONAGE_API_KEY');
    const VONAGE_API_SECRET = Deno.env.get('VONAGE_API_SECRET');

    if (!VONAGE_API_KEY || !VONAGE_API_SECRET) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Vonage credentials not configured",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Making voice call from ${from} to ${to}`);

    // Prepare Vonage Voice API request
    const vonageUrl = 'https://api.nexmo.com/v1/calls';
    const vonagePayload = {
      to: [{
        type: "phone",
        number: to
      }],
      from: {
        type: "phone",
        number: from
      },
      ncco: [{
        action: "talk",
        text: text,
        language: language,
        style: style,
        premium: premium
      }]
    };

    // Use Basic Auth with API Key and Secret
    const authHeader = `Basic ${btoa(`${VONAGE_API_KEY}:${VONAGE_API_SECRET}`)}`;

    const response = await fetch(vonageUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(vonagePayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Vonage API error:', responseData);
      return new Response(
        JSON.stringify({
          success: false,
          provider: "vonage",
          error: responseData.title || responseData.detail || "Failed to make call",
          code: responseData.type,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Call initiated successfully:', responseData.uuid);

    return new Response(
      JSON.stringify({
        success: true,
        uuid: responseData.uuid,
        status: responseData.status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error making voice call:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
      );
  }
});