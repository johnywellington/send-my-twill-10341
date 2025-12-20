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

    const processedResults: Array<{ runId: string; success: boolean; error?: string }> = [];

    for (const run of scheduledRuns) {
      console.log(`[process-scheduled-campaigns] Processing run ${run.id}`);
      
      try {
        // Marcar como 'running' para evitar processamento duplicado
        await supabase
          .from("campaign_runs")
          .update({ 
            status: "running", 
            started_at: new Date().toISOString() 
          })
          .eq("id", run.id);

        const metadata = run.metadata as CampaignRunMetadata;
        const leadListId = metadata?.lead_list_id;
        const messageTemplate = metadata?.message_template;
        const credentialId = metadata?.credential_id;

        if (!leadListId || !messageTemplate) {
          throw new Error("Missing lead_list_id or message_template in metadata");
        }

        // Buscar contatos da lista de leads
        const { data: contacts, error: contactsError } = await supabase
          .from("lead_list_contacts")
          .select("phone_number, name")
          .eq("lead_list_id", leadListId);

        if (contactsError) {
          throw new Error(`Error fetching contacts: ${contactsError.message}`);
        }

        if (!contacts || contacts.length === 0) {
          throw new Error("No contacts found in lead list");
        }

        console.log(`[process-scheduled-campaigns] Found ${contacts.length} contacts for run ${run.id}`);

        // Inserir detalhes dos contatos na tabela campaign_run_details
        const details = contacts.map(contact => ({
          run_id: run.id,
          phone_number: contact.phone_number,
          contact_name: contact.name,
          status: "pending"
        }));

        await supabase.from("campaign_run_details").insert(details);

        let successCount = 0;
        let failCount = 0;
        const failedNumbers: Array<{ phone_number: string; contact_name?: string; error: string }> = [];

        // Processar cada contato
        for (const contact of contacts) {
          try {
            // Chamar a edge function send-sms para cada contato
            const smsPayload = {
              to: contact.phone_number,
              from: run.from_number,
              body: messageTemplate,
              provider: run.provider,
              credentialId: credentialId,
            };

            console.log(`[process-scheduled-campaigns] Sending SMS to ${contact.phone_number}`);

            // Fazer chamada HTTP para a edge function send-sms
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
              
              // Atualizar status do detalhe para 'sent'
              await supabase
                .from("campaign_run_details")
                .update({ 
                  status: "sent", 
                  sent_at: new Date().toISOString(),
                  external_id: smsResult.messageId,
                  provider: run.provider
                })
                .eq("run_id", run.id)
                .eq("phone_number", contact.phone_number);
            } else {
              failCount++;
              const errorMsg = smsResult.error || "Unknown error";
              failedNumbers.push({
                phone_number: contact.phone_number,
                contact_name: contact.name,
                error: errorMsg
              });
              
              // Atualizar status do detalhe para 'failed'
              await supabase
                .from("campaign_run_details")
                .update({ 
                  status: "failed", 
                  error_message: errorMsg 
                })
                .eq("run_id", run.id)
                .eq("phone_number", contact.phone_number);
            }

            // Delay entre envios para respeitar rate limits
            await new Promise(resolve => setTimeout(resolve, 200));
            
          } catch (sendError) {
            failCount++;
            const errorMsg = sendError instanceof Error ? sendError.message : "Send error";
            failedNumbers.push({
              phone_number: contact.phone_number,
              contact_name: contact.name,
              error: errorMsg
            });
            
            await supabase
              .from("campaign_run_details")
              .update({ 
                status: "failed", 
                error_message: errorMsg 
              })
              .eq("run_id", run.id)
              .eq("phone_number", contact.phone_number);
          }
        }

        // Atualizar run como completed
        const finalStatus = failCount === contacts.length ? "failed" : "completed";
        
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
          .eq("id", run.id);

        console.log(`[process-scheduled-campaigns] Run ${run.id} completed: ${successCount} success, ${failCount} failed`);
        
        processedResults.push({ runId: run.id, success: true });

      } catch (runError) {
        const errorMsg = runError instanceof Error ? runError.message : "Unknown error";
        console.error(`[process-scheduled-campaigns] Error processing run ${run.id}:`, errorMsg);
        
        await supabase
          .from("campaign_runs")
          .update({ 
            status: "failed", 
            completed_at: new Date().toISOString(),
            metadata: { ...run.metadata, error: errorMsg }
          })
          .eq("id", run.id);
          
        processedResults.push({ runId: run.id, success: false, error: errorMsg });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Processed scheduled campaigns", 
        processed: scheduledRuns.length,
        results: processedResults
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[process-scheduled-campaigns] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
