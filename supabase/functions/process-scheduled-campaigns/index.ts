import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[process-scheduled-campaigns] Checking for scheduled campaigns...");

    // Buscar campanhas agendadas que devem ser processadas
    const { data: scheduledRuns, error: fetchError } = await supabase
      .from("campaign_runs")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .limit(5);

    if (fetchError) {
      console.error("[process-scheduled-campaigns] Error fetching:", fetchError);
      throw fetchError;
    }

    if (!scheduledRuns || scheduledRuns.length === 0) {
      console.log("[process-scheduled-campaigns] No scheduled campaigns to process");
      return new Response(
        JSON.stringify({ message: "No scheduled campaigns", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[process-scheduled-campaigns] Found ${scheduledRuns.length} campaigns to process`);

    // Marcar como 'running' para evitar processamento duplicado
    for (const run of scheduledRuns) {
      await supabase
        .from("campaign_runs")
        .update({ 
          status: "running", 
          started_at: new Date().toISOString() 
        })
        .eq("id", run.id);

      console.log(`[process-scheduled-campaigns] Started processing run ${run.id}`);
      
      // TODO: Implementar lógica de envio aqui
      // Por enquanto, apenas marca como concluído para demonstração
      await supabase
        .from("campaign_runs")
        .update({ 
          status: "completed", 
          completed_at: new Date().toISOString(),
          successful_sends: run.total_contacts,
          pending_sends: 0
        })
        .eq("id", run.id);
    }

    return new Response(
      JSON.stringify({ 
        message: "Processed scheduled campaigns", 
        processed: scheduledRuns.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[process-scheduled-campaigns] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
