import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { TestResult } from "@/pages/ApiTest";

interface LogValidationParams {
  provider: 'twilio' | 'vonage';
  status: 'success' | 'error';
  latency: number;
  errorMessage?: string;
}

interface ValidationResult {
  vonage: "idle" | "loading" | "success" | "error";
  twilio: "idle" | "loading" | "success" | "error";
  vonageMessage?: string;
  twilioMessage?: string;
}

interface CredentialValidatorProps {
  onTestComplete: (result: TestResult) => void;
}

export const CredentialValidator = ({ onTestComplete }: CredentialValidatorProps) => {
  const [validation, setValidation] = useState<ValidationResult>({
    vonage: "idle",
    twilio: "idle",
  });

  const logValidation = async ({ provider, status, latency, errorMessage }: LogValidationParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('api_validation_logs').insert({
        user_id: user.id,
        provider,
        validation_type: 'credential_test',
        status,
        latency_ms: latency,
        error_message: errorMessage,
        tested_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Credential Validator] Failed to log validation:', error);
    }
  };

  const validateVonage = async () => {
    setValidation((prev) => ({ ...prev, vonage: "loading" }));
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke("send-voice-call", {
        body: {
          to: "+15555555555",
          from: "+442033222305",
          text: "Test",
          dryRun: true,
        },
      });

      const endTime = Date.now();
      const latency = endTime - startTime;
      const success = !error || !error.message.includes("authentication");

      // Salvar no histórico
      onTestComplete({
        id: `credential-vonage-${Date.now()}`,
        timestamp: new Date(),
        functionName: "Validação Vonage",
        status: success ? "success" : "error",
        request: {
          provider: "vonage",
          test_type: "credential_validation",
          dryRun: true
        },
        response: error || data,
        latency,
      });

      if (success) {
        await logValidation({ provider: 'vonage', status: 'success', latency });
        setValidation((prev) => ({
          ...prev,
          vonage: "success",
          vonageMessage: "Credenciais válidas",
        }));
        toast({
          title: "✅ Vonage Validado",
          description: "Credenciais estão corretas",
        });
      } else {
        await logValidation({ provider: 'vonage', status: 'error', latency, errorMessage: 'Credenciais inválidas' });
        setValidation((prev) => ({
          ...prev,
          vonage: "error",
          vonageMessage: "Credenciais inválidas",
        }));
        toast({
          title: "❌ Erro Vonage",
          description: "Verifique suas credenciais",
          variant: "destructive",
        });
      }
    } catch (err) {
      const endTime = Date.now();
      const latency = endTime - startTime;
      const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";

      await logValidation({ provider: 'vonage', status: 'error', latency, errorMessage: errorMsg });

      onTestComplete({
        id: `credential-vonage-${Date.now()}`,
        timestamp: new Date(),
        functionName: "Validação Vonage",
        status: "error",
        request: {
          provider: "vonage",
          test_type: "credential_validation",
        },
        response: errorMsg,
        latency,
      });

      setValidation((prev) => ({
        ...prev,
        vonage: "error",
        vonageMessage: "Erro ao validar",
      }));
      toast({
        title: "❌ Erro Vonage",
        description: "Erro ao validar credenciais",
        variant: "destructive",
      });
    }
  };

  const validateTwilio = async () => {
    setValidation((prev) => ({ ...prev, twilio: "loading" }));
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: {
          to: "+15555555555",
          from: "+15017122661",
          body: "Test",
          provider: "twilio",
          dryRun: true,
        },
      });

      const endTime = Date.now();
      const latency = endTime - startTime;
      const success = !error || !error.message.includes("authentication");

      // Salvar no histórico
      onTestComplete({
        id: `credential-twilio-${Date.now()}`,
        timestamp: new Date(),
        functionName: "Validação Twilio",
        status: success ? "success" : "error",
        request: {
          provider: "twilio",
          test_type: "credential_validation",
          dryRun: true
        },
        response: error || data,
        latency,
      });

      if (success) {
        await logValidation({ provider: 'twilio', status: 'success', latency });
        setValidation((prev) => ({
          ...prev,
          twilio: "success",
          twilioMessage: "Credenciais válidas",
        }));
        toast({
          title: "✅ Twilio Validado",
          description: "Credenciais estão corretas",
        });
      } else {
        await logValidation({ provider: 'twilio', status: 'error', latency, errorMessage: 'Credenciais inválidas' });
        setValidation((prev) => ({
          ...prev,
          twilio: "error",
          twilioMessage: "Credenciais inválidas",
        }));
        toast({
          title: "❌ Erro Twilio",
          description: "Verifique suas credenciais",
          variant: "destructive",
        });
      }
    } catch (err) {
      const endTime = Date.now();
      const latency = endTime - startTime;
      const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";

      await logValidation({ provider: 'twilio', status: 'error', latency, errorMessage: errorMsg });

      onTestComplete({
        id: `credential-twilio-${Date.now()}`,
        timestamp: new Date(),
        functionName: "Validação Twilio",
        status: "error",
        request: {
          provider: "twilio",
          test_type: "credential_validation",
        },
        response: errorMsg,
        latency,
      });

      setValidation((prev) => ({
        ...prev,
        twilio: "error",
        twilioMessage: "Erro ao validar",
      }));
      toast({
        title: "❌ Erro Twilio",
        description: "Erro ao validar credenciais",
        variant: "destructive",
      });
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "loading")
      return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
    if (status === "success")
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    if (status === "error") return <XCircle className="w-5 h-5 text-red-500" />;
    return <Shield className="w-5 h-5 text-muted-foreground" />;
  };

  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Validação de Credenciais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Vonage */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <StatusIcon status={validation.vonage} />
              <div>
                <p className="font-medium">Vonage API</p>
                <p className="text-sm text-muted-foreground">
                  {validation.vonageMessage || "Não testado"}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={validateVonage}
              disabled={validation.vonage === "loading"}
            >
              {validation.vonage === "loading" ? "Testando..." : "Testar"}
            </Button>
          </div>

          {/* Twilio */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <StatusIcon status={validation.twilio} />
              <div>
                <p className="font-medium">Twilio API</p>
                <p className="text-sm text-muted-foreground">
                  {validation.twilioMessage || "Não testado"}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={validateTwilio}
              disabled={validation.twilio === "loading"}
            >
              {validation.twilio === "loading" ? "Testando..." : "Testar"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
