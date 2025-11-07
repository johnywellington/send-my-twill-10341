import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface ValidationRequest {
  phoneNumber: string;
  level?: 'basic' | 'standard' | 'advanced';
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { phoneNumber, level = 'standard' } = await req.json() as ValidationRequest;

    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    const apiKey = Deno.env.get('VONAGE_API_KEY');
    const apiSecret = Deno.env.get('VONAGE_API_SECRET');

    if (!apiKey || !apiSecret) {
      throw new Error('Vonage credentials not configured');
    }

    // Vonage Number Insight API
    const url = `https://api.nexmo.com/ni/${level}/json?api_key=${apiKey}&api_secret=${apiSecret}&number=${encodeURIComponent(phoneNumber)}`;
    
    console.log(`Validating phone number: ${phoneNumber} with level: ${level}`);
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 0) {
      console.error('Vonage API error:', data);
      return new Response(
        JSON.stringify({
          success: false,
          valid: false,
          error: data.error_text || 'Validation failed',
          status: data.status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse validation result
    const validationResult = {
      success: true,
      valid: data.status === 0 && data.reachable !== 'undeliverable',
      phoneNumber: data.international_format_number || phoneNumber,
      nationalFormat: data.national_format_number,
      countryCode: data.country_code,
      countryName: data.country_name,
      carrier: data.current_carrier?.name || data.original_carrier?.name,
      lineType: data.current_carrier?.network_type || 'unknown',
      reachable: data.reachable,
      validNumber: data.valid_number,
      ported: data.ported === 'assumed_ported' || data.ported === 'ported',
      roaming: data.roaming?.status || 'unknown',
      callerName: data.caller_name,
      callerType: data.caller_type,
      lookupOutcome: data.lookup_outcome,
      lookupOutcomeMessage: data.lookup_outcome_message,
      rawData: data
    };

    console.log('Validation result:', {
      phoneNumber: validationResult.phoneNumber,
      valid: validationResult.valid,
      carrier: validationResult.carrier,
      lineType: validationResult.lineType
    });

    return new Response(
      JSON.stringify(validationResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error validating phone number:', error);
    return new Response(
      JSON.stringify({
        success: false,
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});