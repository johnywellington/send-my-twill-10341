import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ValidationResult {
  vonage: "idle" | "loading" | "success" | "error";
  twilio: "idle" | "loading" | "success" | "error";
  vonageMessage?: string;
  twilioMessage?: string;
}

export const CredentialValidator = () => {
  const [validation, setValidation] = useState<ValidationResult>({
    vonage: "idle",
    twilio: "idle",
  });

  const validateVonage = async () => {
    setValidation((prev) => ({ ...prev, vonage: "loading" }));
    try {
      // Tenta fazer uma chamada simples para verificar as credenciais
      const { data, error } = await supabase.functions.invoke("send-voice-call", {
        body: {
          to: "+15555555555", // Número de teste que não será chamado
          from: "+442033222305",
          text: "Test",
          dryRun: true, // Flag para não enviar de verdade
        },
      });

      // Se chegou aqui sem erro de autenticação, as credenciais estão válidas
      if (error && error.message.includes("authentication")) {
        setValidation((prev) => ({
          ...prev,
          vonage: "error",
          vonageMessage: "Credenciais inválidas",
        }));
      } else {
        setValidation((prev) => ({
          ...prev,
          vonage: "success",
          vonageMessage: "Credenciais válidas",
        }));
      }
    } catch (err) {
      setValidation((prev) => ({
        ...prev,
        vonage: "error",
        vonageMessage: "Erro ao validar",
      }));
    }
  };

  const validateTwilio = async () => {
    setValidation((prev) => ({ ...prev, twilio: "loading" }));
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

      if (error && error.message.includes("authentication")) {
        setValidation((prev) => ({
          ...prev,
          twilio: "error",
          twilioMessage: "Credenciais inválidas",
        }));
      } else {
        setValidation((prev) => ({
          ...prev,
          twilio: "success",
          twilioMessage: "Credenciais válidas",
        }));
      }
    } catch (err) {
      setValidation((prev) => ({
        ...prev,
        twilio: "error",
        twilioMessage: "Erro ao validar",
      }));
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
