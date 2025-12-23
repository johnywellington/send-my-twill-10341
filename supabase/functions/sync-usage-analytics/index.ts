import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { startDate, endDate } = await req.json();

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    console.log(`Syncing analytics for user ${user.id} from ${start.toISOString()} to ${end.toISOString()}`);

    // Agregar dados do SMS
    const { data: smsData } = await supabase
      .from('sms_logs')
      .select('created_at, status, cost, provider')
      .eq('user_id', user.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    // Agregar dados de Voice
    const { data: voiceData } = await supabase
      .from('voice_logs')
      .select('created_at, status, cost, duration, provider')
      .eq('user_id', user.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    // Agregar dados de IVR
    const { data: ivrData } = await supabase
      .from('ivr_logs')
      .select('created_at, status, cost, duration, provider')
      .eq('user_id', user.id)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    // Agrupar por data
    const analyticsMap = new Map<string, any>();

    // Processar SMS
    smsData?.forEach(record => {
      const date = new Date(record.created_at).toISOString().split('T')[0];
      if (!analyticsMap.has(date)) {
        analyticsMap.set(date, {
          report_date: date,
          user_id: user.id,
          provider: record.provider || 'vonage',
          sms_sent: 0,
          sms_delivered: 0,
          sms_failed: 0,
          sms_cost: 0,
          voice_calls: 0,
          voice_minutes: 0,
          voice_cost: 0,
          ivr_calls: 0,
          ivr_minutes: 0,
          ivr_cost: 0,
          total_cost: 0
        });
      }
      const analytics = analyticsMap.get(date);
      analytics.sms_sent++;
      if (record.status === 'delivered') analytics.sms_delivered++;
      if (record.status === 'failed') analytics.sms_failed++;
      analytics.sms_cost += parseFloat(record.cost || '0');
      analytics.total_cost += parseFloat(record.cost || '0');
    });

    // Processar Voice
    voiceData?.forEach(record => {
      const date = new Date(record.created_at).toISOString().split('T')[0];
      if (!analyticsMap.has(date)) {
        analyticsMap.set(date, {
          report_date: date,
          user_id: user.id,
          provider: record.provider || 'vonage',
          sms_sent: 0,
          sms_delivered: 0,
          sms_failed: 0,
          sms_cost: 0,
          voice_calls: 0,
          voice_minutes: 0,
          voice_cost: 0,
          ivr_calls: 0,
          ivr_minutes: 0,
          ivr_cost: 0,
          total_cost: 0
        });
      }
      const analytics = analyticsMap.get(date);
      analytics.voice_calls++;
      analytics.voice_minutes += Math.ceil((record.duration || 0) / 60);
      analytics.voice_cost += parseFloat(record.cost || '0');
      analytics.total_cost += parseFloat(record.cost || '0');
    });

    // Processar IVR
    ivrData?.forEach(record => {
      const date = new Date(record.created_at).toISOString().split('T')[0];
      if (!analyticsMap.has(date)) {
        analyticsMap.set(date, {
          report_date: date,
          user_id: user.id,
          provider: record.provider || 'vonage',
          sms_sent: 0,
          sms_delivered: 0,
          sms_failed: 0,
          sms_cost: 0,
          voice_calls: 0,
          voice_minutes: 0,
          voice_cost: 0,
          ivr_calls: 0,
          ivr_minutes: 0,
          ivr_cost: 0,
          total_cost: 0
        });
      }
      const analytics = analyticsMap.get(date);
      analytics.ivr_calls++;
      analytics.ivr_minutes += Math.ceil((record.duration || 0) / 60);
      analytics.ivr_cost += parseFloat(record.cost || '0');
      analytics.total_cost += parseFloat(record.cost || '0');
    });

    // Inserir ou atualizar analytics
    const analyticsRecords = Array.from(analyticsMap.values());
    
    for (const record of analyticsRecords) {
      await supabase
        .from('usage_analytics')
        .upsert(record, {
          onConflict: 'user_id,report_date,provider'
        });
    }

    console.log(`Synced ${analyticsRecords.length} analytics records`);

    return new Response(
      JSON.stringify({
        success: true,
        recordsSynced: analyticsRecords.length,
        dateRange: { start, end }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error syncing analytics:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});