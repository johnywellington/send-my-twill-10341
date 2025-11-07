import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApprovalEmailRequest {
  email: string;
  name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting approval email process...");
    
    const { email, name }: ApprovalEmailRequest = await req.json();

    if (!email) {
      console.error("Missing email in request");
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const userName = name || email.split('@')[0];
    console.log(`Sending approval email to: ${email}`);

    const emailResponse = await resend.emails.send({
      from: "SMS Sender <onboarding@resend.dev>",
      to: [email],
      subject: "Conta Aprovada - SMS Sender",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .container {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 10px;
                padding: 40px;
                color: white;
              }
              .content {
                background: white;
                color: #333;
                border-radius: 8px;
                padding: 30px;
                margin-top: 20px;
              }
              .button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 20px;
                font-weight: 600;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                color: #888;
                font-size: 12px;
              }
              h1 {
                margin-top: 0;
                font-size: 28px;
              }
              .highlight {
                color: #667eea;
                font-weight: 600;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🎉 Conta Aprovada!</h1>
              <div class="content">
                <p>Olá <strong>${userName}</strong>,</p>
                
                <p>Ótimas notícias! Sua conta no <span class="highlight">SMS Sender</span> foi aprovada pelo administrador.</p>
                
                <p>Você agora tem acesso completo à plataforma e pode começar a usar todos os recursos disponíveis:</p>
                
                <ul>
                  <li>📱 Enviar SMS em massa</li>
                  <li>📞 Realizar chamadas de voz</li>
                  <li>🎙️ Configurar sistemas IVR</li>
                  <li>📊 Acompanhar análises e relatórios</li>
                  <li>👥 Gerenciar contatos e grupos</li>
                </ul>
                
                <p>Clique no botão abaixo para fazer login e começar:</p>
                
                <a href="${Deno.env.get('VITE_SUPABASE_URL')}/auth/v1/verify" class="button">
                  Acessar Plataforma
                </a>
                
                <p style="margin-top: 30px;">Se você tiver alguma dúvida, não hesite em nos contatar.</p>
                
                <p>Bem-vindo(a) à nossa plataforma!</p>
                
                <p style="margin-top: 20px;">
                  <strong>Equipe SMS Sender</strong>
                </p>
              </div>
            </div>
            
            <div class="footer">
              <p>Este é um email automático. Por favor, não responda diretamente.</p>
              <p>© ${new Date().getFullYear()} SMS Sender. Todos os direitos reservados.</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email enviado com sucesso",
        id: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-approval-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Erro ao enviar email de aprovação" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
