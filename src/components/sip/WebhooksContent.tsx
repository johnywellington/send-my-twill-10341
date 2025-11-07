import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export function WebhooksContent() {
  const projectId = 'baowfhikujfppwmmhwcn';
  const baseUrl = `https://${projectId}.supabase.co/functions/v1`;

  const webhooks = {
    twilio: {
      registration: `${baseUrl}/twilio-sip-registration-webhook`,
      voice: `${baseUrl}/twilio-voice-webhook`,
    },
    vonage: {
      registration: `${baseUrl}/vonage-sip-registration-webhook`,
      voice: `${baseUrl}/vonage-voice-webhook`,
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copiada!');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Configuração de Webhooks</h2>

      {/* Twilio */}
      <Card>
        <CardHeader>
          <CardTitle>Twilio Webhooks</CardTitle>
          <CardDescription>Configure estas URLs no dashboard do Twilio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">🔔 SIP Registration Events</h4>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded text-xs">
                {webhooks.twilio.registration}
              </code>
              <Button variant="outline" size="sm" onClick={() => copyUrl(webhooks.twilio.registration)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Configure em: Twilio Console → SIP → Domains → [Seu Domínio] → Registration Webhook
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">📞 Voice Status Callback</h4>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded text-xs">
                {webhooks.twilio.voice}
              </code>
              <Button variant="outline" size="sm" onClick={() => copyUrl(webhooks.twilio.voice)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button variant="outline" className="w-full" asChild>
            <a href="https://console.twilio.com/us1/develop/voice/manage/sip-domains" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir Twilio Console
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Vonage */}
      <Card>
        <CardHeader>
          <CardTitle>Vonage Webhooks</CardTitle>
          <CardDescription>Configure estas URLs no dashboard da Vonage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">🔔 SIP Registration Events</h4>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded text-xs">
                {webhooks.vonage.registration}
              </code>
              <Button variant="outline" size="sm" onClick={() => copyUrl(webhooks.vonage.registration)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Configure em: Vonage Dashboard → Applications → [Sua App] → Capabilities → Voice → Event URL
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">📞 Voice Event Callback</h4>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded text-xs">
                {webhooks.vonage.voice}
              </code>
              <Button variant="outline" size="sm" onClick={() => copyUrl(webhooks.vonage.voice)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button variant="outline" className="w-full" asChild>
            <a href="https://dashboard.nexmo.com/applications" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir Vonage Dashboard
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
