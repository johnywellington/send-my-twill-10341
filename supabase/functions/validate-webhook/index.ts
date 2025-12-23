import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidateRequest {
  phoneNumberId: string;
  phoneNumber: string;
  provider: 'vonage' | 'twilio';
  testType: 'sms' | 'voice';
  webhookUrl: string;
}

interface ValidationResult {
  success: boolean;
  responseTime: number;
  statusCode: number;
  validFormat: boolean;
  errorMessage?: string;
  responseBody?: any;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { phoneNumberId, phoneNumber, provider, testType, webhookUrl }: ValidateRequest = await req.json();

    console.log(`🧪 Testing ${testType} webhook for ${phoneNumber} (${provider})`);

    // Check rate limit (max 1 test per number per 60 seconds)
    const { data: recentTest } = await supabase
      .from('webhook_health_checks')
      .select('tested_at')
      .eq('phone_number_id', phoneNumberId)
      .eq('test_type', testType)
      .gte('tested_at', new Date(Date.now() - 60000).toISOString())
      .order('tested_at', { ascending: false })
      .limit(1)
      .single();

    if (recentTest) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please wait 60 seconds between tests.',
          remainingSeconds: 60 - Math.floor((Date.now() - new Date(recentTest.tested_at).getTime()) / 1000)
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: ValidationResult;

    try {
      if (testType === 'sms') {
        result = await testSmsWebhook(webhookUrl, phoneNumber, provider);
      } else {
        result = await testVoiceWebhook(webhookUrl, phoneNumber, provider);
      }
    } catch (error: any) {
      result = {
        success: false,
        responseTime: 0,
        statusCode: 0,
        validFormat: false,
        errorMessage: error.message || 'Network error or timeout',
      };
    }

    // Store result in database
    const { error: insertError } = await supabase
      .from('webhook_health_checks')
      .insert({
        user_id: user.id,
        phone_number_id: phoneNumberId,
        phone_number: phoneNumber,
        provider,
        test_type: testType,
        webhook_url: webhookUrl,
        success: result.success,
        status_code: result.statusCode,
        response_time_ms: result.responseTime,
        valid_format: result.validFormat,
        error_message: result.errorMessage,
        response_body: result.responseBody,
        test_mode: 'manual',
      });

    if (insertError) {
      console.error('Error storing health check:', insertError);
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in validate-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

async function testSmsWebhook(
  webhookUrl: string,
  phoneNumber: string,
  provider: 'vonage' | 'twilio'
): Promise<ValidationResult> {
  const startTime = Date.now();

  try {
    let response: Response;

    if (provider === 'twilio') {
      // Twilio uses POST with form data
      const testPayload = {
        MessageSid: 'TEST_' + Date.now(),
        AccountSid: 'TEST_ACCOUNT',
        From: '+15555555555',
        To: phoneNumber,
        Body: 'WEBHOOK_TEST_IGNORE',
        FromCountry: 'US',
        ToCountry: 'BR',
        SmsStatus: 'received',
      };

      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Test-Webhook': 'true',
        },
        body: new URLSearchParams(testPayload).toString(),
        signal: AbortSignal.timeout(5000),
      });
    } else {
      // Vonage uses GET with query params
      const testParams = new URLSearchParams({
        msisdn: '447700900000',
        to: phoneNumber.replace('+', ''),
        messageId: 'TEST_' + Date.now(),
        text: 'WEBHOOK_TEST_IGNORE',
        type: 'text',
        keyword: 'TEST',
        'message-timestamp': new Date().toISOString(),
      });

      response = await fetch(`${webhookUrl}?${testParams}`, {
        method: 'GET',
        headers: {
          'X-Test-Webhook': 'true',
        },
        signal: AbortSignal.timeout(5000),
      });
    }

    const responseTime = Date.now() - startTime;
    const validStatuses = [200, 201, 202, 204];
    const success = validStatuses.includes(response.status);

    return {
      success,
      responseTime,
      statusCode: response.status,
      validFormat: success, // SMS webhooks don't have strict format requirements
      responseBody: success ? await response.text().catch(() => null) : null,
    };

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      responseTime,
      statusCode: 0,
      validFormat: false,
      errorMessage: error.name === 'TimeoutError' ? 'Request timeout (>5s)' : error.message,
    };
  }
}

async function testVoiceWebhook(
  webhookUrl: string,
  phoneNumber: string,
  provider: 'vonage' | 'twilio'
): Promise<ValidationResult> {
  const startTime = Date.now();

  try {
    let response: Response;
    let validFormat = false;

    if (provider === 'twilio') {
      // Twilio uses POST with form data
      const testPayload = {
        CallSid: 'TEST_' + Date.now(),
        AccountSid: 'TEST_ACCOUNT',
        From: '+15555555555',
        To: phoneNumber,
        CallStatus: 'ringing',
        Direction: 'inbound',
      };

      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Test-Webhook': 'true',
        },
        body: new URLSearchParams(testPayload).toString(),
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const body = await response.text();
        // Check if it's valid TwiML
        validFormat = body.includes('<Response>') && body.includes('</Response>');

        return {
          success: true,
          responseTime,
          statusCode: response.status,
          validFormat,
          responseBody: body.substring(0, 500), // Store first 500 chars
        };
      }
    } else {
      // Vonage uses POST with JSON
      const testPayload = {
        from: '447700900000',
        to: phoneNumber,
        uuid: 'TEST_' + Date.now(),
        conversation_uuid: 'TEST_CONV_' + Date.now(),
        status: 'started',
        direction: 'inbound',
        timestamp: new Date().toISOString(),
      };

      response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Webhook': 'true',
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const body = await response.json();
        // Check if it's valid NCCO (array of action objects)
        validFormat = Array.isArray(body) && 
          body.every((action: any) => action.action && typeof action.action === 'string');

        return {
          success: true,
          responseTime,
          statusCode: response.status,
          validFormat,
          responseBody: body,
        };
      }
    }

    const responseTime = Date.now() - startTime;
    return {
      success: false,
      responseTime,
      statusCode: response.status,
      validFormat: false,
      errorMessage: `HTTP ${response.status}`,
    };

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      responseTime,
      statusCode: 0,
      validFormat: false,
      errorMessage: error.name === 'TimeoutError' ? 'Request timeout (>5s)' : error.message,
    };
  }
}

serve(handler);
