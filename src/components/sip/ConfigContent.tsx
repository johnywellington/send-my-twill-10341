import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Settings } from "lucide-react";
import { useSIPConfig } from "@/hooks/use-sip-config";

export function ConfigContent() {
  const { configs, isLoading, isTwilioConfigured, isVonageConfigured, setupProviders, isSettingUp } = useSIPConfig();
  
  const [twilioFriendlyName, setTwilioFriendlyName] = useState('Araujo SIP Domain');
  const [twilioDomainName, setTwilioDomainName] = useState('araujo-lab.sip.twilio.com');
  const [vonageAppName, setVonageAppName] = useState('araujo-sip-app');

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const baseUrl = `https://${projectId}.supabase.co/functions/v1`;

  const handleSetupBoth = () => {
    setupProviders({
      provider: 'both',
      twilioConfig: {
        friendlyName: twilioFriendlyName,
        domainName: twilioDomainName,
      },
      vonageConfig: {
        name: vonageAppName,
        answerUrl: `${baseUrl}/ivr-webhook-v2`,
        eventUrl: `${baseUrl}/ivr-webhook-v2-events`,
      },
    });
  };

  const handleSetupTwilio = () => {
    setupProviders({
      provider: 'twilio',
      twilioConfig: {
        friendlyName: twilioFriendlyName,
        domainName: twilioDomainName,
      },
    });
  };

  const handleSetupVonage = () => {
    setupProviders({
      provider: 'vonage',
      vonageConfig: {
        name: vonageAppName,
        answerUrl: `${baseUrl}/ivr-webhook-v2`,
        eventUrl: `${baseUrl}/ivr-webhook-v2-events`,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Twilio SIP Configuration
              </CardTitle>
              <CardDescription>Configure seu domínio SIP Twilio</CardDescription>
            </div>
            <Badge variant={isTwilioConfigured ? "default" : "secondary"}>
              {isTwilioConfigured ? '🟢 Configurado' : '🔴 Não Configurado'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isTwilioConfigured ? (
            <div className="space-y-2">
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <p className="text-sm"><strong>SIP Domain:</strong> {configs?.twilio?.sip_domain}</p>
                <p className="text-sm"><strong>Domain SID:</strong> {configs?.twilio?.sip_domain_sid}</p>
              </div>
              <Button variant="outline" onClick={handleSetupTwilio} disabled={isSettingUp}>
                {isSettingUp && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reconfigurar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="twilio-friendly">Friendly Name</Label>
                <Input
                  id="twilio-friendly"
                  value={twilioFriendlyName}
                  onChange={(e) => setTwilioFriendlyName(e.target.value)}
                  placeholder="Ex: Araujo SIP Domain"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twilio-domain">Domain Name</Label>
                <Input
                  id="twilio-domain"
                  value={twilioDomainName}
                  onChange={(e) => setTwilioDomainName(e.target.value)}
                  placeholder="Ex: araujo-lab.sip.twilio.com"
                />
              </div>
              <Button onClick={handleSetupTwilio} disabled={isSettingUp}>
                {isSettingUp && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Configurar Twilio
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Vonage SIP Configuration
              </CardTitle>
              <CardDescription>Configure sua aplicação SIP Vonage</CardDescription>
            </div>
            <Badge variant={isVonageConfigured ? "default" : "secondary"}>
              {isVonageConfigured ? '🟢 Configurado' : '🔴 Não Configurado'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isVonageConfigured ? (
            <div className="space-y-2">
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <p className="text-sm"><strong>App ID:</strong> {configs?.vonage?.app_id}</p>
                <p className="text-sm"><strong>App Name:</strong> {configs?.vonage?.app_name}</p>
                <p className="text-sm"><strong>SIP Domain:</strong> {configs?.vonage?.sip_domain}</p>
              </div>
              <Button variant="outline" onClick={handleSetupVonage} disabled={isSettingUp}>
                {isSettingUp && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reconfigurar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vonage-name">Application Name</Label>
                <Input
                  id="vonage-name"
                  value={vonageAppName}
                  onChange={(e) => setVonageAppName(e.target.value)}
                  placeholder="Ex: araujo-sip-app"
                />
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>Answer URL:</strong> {baseUrl}/ivr-webhook-v2</p>
                <p><strong>Event URL:</strong> {baseUrl}/ivr-webhook-v2-events</p>
              </div>
              <Button onClick={handleSetupVonage} disabled={isSettingUp}>
                {isSettingUp && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Configurar Vonage
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {!isTwilioConfigured && !isVonageConfigured && (
        <Card>
          <CardHeader>
            <CardTitle>Setup Automático Completo</CardTitle>
            <CardDescription>Configure ambos os providers de uma vez</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSetupBoth} size="lg" disabled={isSettingUp}>
              {isSettingUp && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              🚀 Configurar Tudo Automaticamente
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
