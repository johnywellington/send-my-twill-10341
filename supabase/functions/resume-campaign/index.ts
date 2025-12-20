import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CampaignRunMetadata {
  campaign_name?: string;
  message_template?: string;
  lead_list_id?: string;
  credential_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { runId } = await req.json();

    if (!runId) {
      return new Response(
        JSON.stringify({ error: "runId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[resume-campaign] Resuming campaign run ${runId}`);

    // Buscar a campanha pausada
    const { data: run, error: fetchError } = await supabase
      .from("campaign_runs")
      .select("*")
      .eq("id", runId)
      .eq("status", "paused")
      .single();

    if (fetchError || !run) {
      console.error("[resume-campaign] Campaign not found or not paused:", fetchError);
      return new Response(
        JSON.stringify({ error: "Campaign not found or not in paused state" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const metadata = run.metadata as CampaignRunMetadata;
    const messageTemplate = metadata?.message_template;
    const credentialId = metadata?.credential_id;

    if (!messageTemplate) {
      return new Response(
        JSON.stringify({ error: "Missing message_template in metadata" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar contatos pendentes da tabela campaign_run_details
    const { data: pendingDetails, error: detailsError } = await supabase
      .from("campaign_run_details")
      .select("phone_number, contact_name")
      .eq("run_id", runId)
      .eq("status", "pending");

    if (detailsError) {
      console.error("[resume-campaign] Error fetching pending details:", detailsError);
      throw new Error(`Error fetching pending contacts: ${detailsError.message}`);
    }

    if (!pendingDetails || pendingDetails.length === 0) {
      // Não há contatos pendentes, marcar como concluído
      await supabase
        .from("campaign_runs")
        .update({ 
          status: "completed", 
          completed_at: new Date().toISOString(),
          pending_sends: 0
        })
        .eq("id", runId);

      console.log(`[resume-campaign] No pending contacts for run ${runId}, marked as completed`);
      return new Response(
        JSON.stringify({ success: true, message: "No pending contacts, campaign completed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[resume-campaign] Found ${pendingDetails.length} pending contacts for run ${runId}`);

    // Marcar como running
    await supabase
      .from("campaign_runs")
      .update({ 
        status: "running",
        updated_at: new Date().toISOString()
      })
      .eq("id", runId);

    let successCount = run.successful_sends || 0;
    let failCount = run.failed_sends || 0;
    let processedCount = 0;
    let wasPaused = false;
    const failedNumbers: Array<{ phone_number: string; contact_name?: string; error: string }> = 
      (run.failed_numbers as Array<{ phone_number: string; contact_name?: string; error: string }>) || [];

    // Processar cada contato pendente
    for (const contact of pendingDetails) {
      // A cada 5 envios, verificar se a campanha foi pausada novamente
      if (processedCount > 0 && processedCount % 5 === 0) {
        const { data: currentRun } = await supabase
          .from("campaign_runs")
          .select("status")
          .eq("id", runId)
          .single();
        
        if (currentRun?.status === 'paused') {
          console.log(`[resume-campaign] Run ${runId} was paused again by user`);
          wasPaused = true;
          break;
        }
      }

      try {
        const smsPayload = {
          to: contact.phone_number,
          from: run.from_number,
          body: messageTemplate,
          provider: run.provider,
          credentialId: credentialId,
        };

        console.log(`[resume-campaign] Sending SMS to ${contact.phone_number}`);

        const smsResponse = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify(smsPayload),
        });

        const smsResult = await smsResponse.json();

        if (smsResult.success) {
          successCount++;
          
          await supabase
            .from("campaign_run_details")
            .update({ 
              status: "sent", 
              sent_at: new Date().toISOString(),
              external_id: smsResult.messageId,
              provider: run.provider
            })
            .eq("run_id", runId)
            .eq("phone_number", contact.phone_number);
        } else {
          failCount++;
          const errorMsg = smsResult.error || "Unknown error";
          failedNumbers.push({
            phone_number: contact.phone_number,
            contact_name: contact.contact_name || undefined,
            error: errorMsg
          });
          
          await supabase
            .from("campaign_run_details")
            .update({ 
              status: "failed", 
              error_message: errorMsg 
            })
            .eq("run_id", runId)
            .eq("phone_number", contact.phone_number);
        }

        processedCount++;

        // Atualizar contadores incrementalmente a cada 10 envios
        if (processedCount % 10 === 0) {
          const remainingPending = pendingDetails.length - processedCount;
          await supabase
            .from("campaign_runs")
            .update({ 
              successful_sends: successCount,
              failed_sends: failCount,
              pending_sends: remainingPending,
              failed_numbers: failedNumbers
            })
            .eq("id", runId);
        }

        // Delay entre envios
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (sendError) {
        failCount++;
        processedCount++;
        const errorMsg = sendError instanceof Error ? sendError.message : "Send error";
        failedNumbers.push({
          phone_number: contact.phone_number,
          contact_name: contact.contact_name || undefined,
          error: errorMsg
        });
        
        await supabase
          .from("campaign_run_details")
          .update({ 
            status: "failed", 
            error_message: errorMsg 
          })
          .eq("run_id", runId)
          .eq("phone_number", contact.phone_number);
      }
    }

    // Atualização final
    if (wasPaused) {
      const remainingPending = pendingDetails.length - processedCount;
      await supabase
        .from("campaign_runs")
        .update({ 
          successful_sends: successCount,
          failed_sends: failCount,
          pending_sends: remainingPending,
          failed_numbers: failedNumbers
        })
        .eq("id", runId);
      
      console.log(`[resume-campaign] Run ${runId} paused again: ${successCount} success, ${failCount} failed, ${remainingPending} pending`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Campaign paused again",
          processed: processedCount,
          remaining: remainingPending
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Campanha concluída
    const finalStatus = failCount === run.total_contacts ? "failed" : "completed";
    
    await supabase
      .from("campaign_runs")
      .update({ 
        status: finalStatus, 
        completed_at: new Date().toISOString(),
        successful_sends: successCount,
        failed_sends: failCount,
        pending_sends: 0,
        failed_numbers: failedNumbers
      })
      .eq("id", runId);

    console.log(`[resume-campaign] Run ${runId} completed: ${successCount} success, ${failCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Campaign completed",
        successCount,
        failCount,
        status: finalStatus
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[resume-campaign] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
