import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useSIPConfig } from "@/hooks/use-sip-config";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SIPConfig() {
  const { 
    configs, 
    isLoading, 
    isTwilioConfigured, 
    isVonageConfigured,
    setupProviders,
    isSettingUp,
  } = useSIPConfig();

  const [twilioName, setTwilioName] = useState("Araujo SIP Domain");
  const [twilioDomain, setTwilioDomain] = useState("araujo-lab.sip.twilio.com");
  const [vonageName, setVonageName] = useState("araujo-sip-app");

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const baseUrl = `https://${projectId}.supabase.co/functions/v1`;

  const handleSetupBoth = () => {
    setupProviders({
      provider: 'both',
      twilioConfig: {
        friendlyName: twilioName,
        domainName: twilioDomain,
      },
      vonageConfig: {
        name: vonageName,
        answerUrl: `${baseUrl}/ivr-webhook-v2`,
        eventUrl: `${baseUrl}/ivr-webhook-v2-events`,
      },
    });
  };

  const handleSetupTwilio = () => {
    setupProviders({
      provider: 'twilio',
      twilioConfig: {
        friendlyName: twilioName,
        domainName: twilioDomain,
      },
    });
  };

  const handleSetupVonage = () => {
    setupProviders({
      provider: 'vonage',
      vonageConfig: {
        name: vonageName,
        answerUrl: `${baseUrl}/ivr-webhook-v2`,
        eventUrl: `${baseUrl}/ivr-webhook-v2-events`,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Configuração SIP</h1>
      </div>

      <Alert>
        <AlertDescription>
          Configure os domínios SIP e aplicações automaticamente via API. Os webhooks serão gerados automaticamente.
        </AlertDescription>
      </Alert>

      {/* Twilio Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                📞 Twilio SIP Configuration
              </CardTitle>
              <CardDescription>Criar domínio SIP via API Twilio</CardDescription>
            </div>
            {isTwilioConfigured ? (
              <Badge className="bg-green-500">
                <CheckCircle className="h-4 w-4 mr-1" />
                Configurado
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="h-4 w-4 mr-1" />
                Não Configurado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isTwilioConfigured ? (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div className="flex justify-between">
                <span className="font-semibold">SIP Domain:</span>
                <span className="font-mono">{configs?.twilio?.sip_domain}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Domain SID:</span>
                <span className="font-mono text-sm">{configs?.twilio?.sip_domain_sid}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="twilio-name">Friendly Name</Label>
                <Input
                  id="twilio-name"
                  value={twilioName}
                  onChange={(e) => setTwilioName(e.target.value)}
                  placeholder="Araujo SIP Domain"
                />
              </div>
              <div>
                <Label htmlFor="twilio-domain">Domain Name</Label>
                <Input
                  id="twilio-domain"
                  value={twilioDomain}
                  onChange={(e) => setTwilioDomain(e.target.value)}
                  placeholder="araujo-lab.sip.twilio.com"
                />
              </div>
              <Button 
                onClick={handleSetupTwilio}
                disabled={isSettingUp}
              >
                {isSettingUp && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Domínio Twilio
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vonage Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                📱 Vonage SIP Configuration
              </CardTitle>
              <CardDescription>Criar aplicação SIP via API Vonage</CardDescription>
            </div>
            {isVonageConfigured ? (
              <Badge className="bg-green-500">
                <CheckCircle className="h-4 w-4 mr-1" />
                Configurado
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="h-4 w-4 mr-1" />
                Não Configurado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isVonageConfigured ? (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div className="flex justify-between">
                <span className="font-semibold">App ID:</span>
                <span className="font-mono">{configs?.vonage?.app_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">App Name:</span>
                <span>{configs?.vonage?.app_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">SIP Domain:</span>
                <span className="font-mono">{configs?.vonage?.sip_domain}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="vonage-name">Application Name</Label>
                <Input
                  id="vonage-name"
                  value={vonageName}
                  onChange={(e) => setVonageName(e.target.value)}
                  placeholder="araujo-sip-app"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Webhooks (gerados automaticamente):</p>
                <p className="font-mono text-xs mt-1">Answer: {baseUrl}/ivr-webhook-v2</p>
                <p className="font-mono text-xs">Event: {baseUrl}/ivr-webhook-v2-events</p>
              </div>
              <Button 
                onClick={handleSetupVonage}
                disabled={isSettingUp}
              >
                {isSettingUp && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Aplicação Vonage
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Everything */}
      {!isTwilioConfigured && !isVonageConfigured && (
        <Card>
          <CardHeader>
            <CardTitle>⚙️ Setup Automático Completo</CardTitle>
            <CardDescription>
              Configure Twilio e Vonage de uma vez
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              size="lg"
              onClick={handleSetupBoth}
              disabled={isSettingUp}
              className="w-full"
            >
              {isSettingUp && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              🚀 Configurar Tudo Automaticamente
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}