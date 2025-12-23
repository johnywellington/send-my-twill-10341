import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, RefreshCw, BookOpen } from "lucide-react";
import { TestCard } from "@/components/api-test/TestCard";
import { CredentialValidator } from "@/components/api-test/CredentialValidator";
import { RateLimitMonitor } from "@/components/api-test/RateLimitMonitor";
import { TestHistory } from "@/components/api-test/TestHistory";
import { AccountStatusCard } from "@/components/api-test/AccountStatusCard";
import { ValidationHistory } from "@/components/api-test/ValidationHistory";
import type { TestResult } from "@/features/user/types/api-test";

const ApiTest = () => {
  const navigate = useNavigate();
  const [testHistory, setTestHistory] = useState<TestResult[]>(() => {
    const saved = localStorage.getItem("api-test-history");
    return saved ? JSON.parse(saved) : [];
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTestComplete = (result: TestResult) => {
    const updatedHistory = [result, ...testHistory].slice(0, 20);
    setTestHistory(updatedHistory);
    localStorage.setItem("api-test-history", JSON.stringify(updatedHistory));
  };

  const handleClearHistory = () => {
    setTestHistory([]);
    localStorage.removeItem("api-test-history");
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold">API Testing & Debug</h1>
              <p className="text-muted-foreground">
                Teste e valide suas integrações em tempo real
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/docs")}
              className="gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Documentação
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* 1. Validação de Credenciais */}
        <div className="mb-6">
          <CredentialValidator 
            key={refreshKey} 
            onTestComplete={handleTestComplete}
          />
        </div>

        {/* 2. Status das Contas */}
        <div className="mb-6">
          <div className="grid gap-4 md:grid-cols-2">
            <AccountStatusCard provider="twilio" />
            <AccountStatusCard provider="vonage" />
          </div>
        </div>

        {/* 3. Rate Limit Monitor */}
        <div className="mb-6">
          <RateLimitMonitor key={refreshKey} />
        </div>

        {/* Test Cards */}
        <Tabs defaultValue="sms" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sms">SMS</TabsTrigger>
            <TabsTrigger value="voice">Voice Call</TabsTrigger>
            <TabsTrigger value="ivr">IVR Básico</TabsTrigger>
            <TabsTrigger value="ivr-v2">IVR Avançado</TabsTrigger>
          </TabsList>

          <TabsContent value="sms" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <TestCard
                title="Testar SMS (Vonage)"
                functionName="send-sms"
                defaultParams={{
                  to: "",
                  from: "",
                  body: "Teste de SMS",
                  provider: "vonage"
                }}
                fields={[
                  { name: "to", label: "Para (To)", type: "text", placeholder: "+5511999999999" },
                  { name: "from", label: "De (From)", type: "text", placeholder: "+442033222305" },
                  { name: "body", label: "Mensagem", type: "textarea", placeholder: "Texto do SMS" },
                  { name: "provider", label: "Provider", type: "select", options: ["vonage", "twilio"] }
                ]}
                onTestComplete={handleTestComplete}
              />
              <TestCard
                title="Testar SMS (Twilio)"
                functionName="send-sms"
                defaultParams={{
                  to: "",
                  from: "",
                  body: "Teste de SMS",
                  provider: "twilio"
                }}
                fields={[
                  { name: "to", label: "Para (To)", type: "text", placeholder: "+5511999999999" },
                  { name: "from", label: "De (From)", type: "text", placeholder: "+15017122661" },
                  { name: "body", label: "Mensagem", type: "textarea", placeholder: "Texto do SMS" },
                  { name: "provider", label: "Provider", type: "select", options: ["vonage", "twilio"] }
                ]}
                onTestComplete={handleTestComplete}
              />
            </div>
          </TabsContent>

          <TabsContent value="voice" className="space-y-6">
            <TestCard
              title="Testar Chamada de Voz"
              functionName="send-voice-call"
              defaultParams={{
                to: "",
                from: "",
                text: "Olá, esta é uma chamada de teste.",
                language: "pt-BR",
                style: 0,
                premium: false,
                voiceName: "Camila"
              }}
              fields={[
                { name: "to", label: "Para (To)", type: "text", placeholder: "+5511999999999" },
                { name: "from", label: "De (From)", type: "text", placeholder: "+442033222305" },
                { name: "text", label: "Texto", type: "textarea", placeholder: "Mensagem de voz" },
                { name: "voiceName", label: "Voz", type: "text", placeholder: "Camila" },
                { name: "language", label: "Idioma", type: "text", placeholder: "pt-BR" },
                { name: "style", label: "Estilo", type: "number", placeholder: "0" },
                { name: "premium", label: "Premium", type: "checkbox" }
              ]}
              onTestComplete={handleTestComplete}
            />
          </TabsContent>

          <TabsContent value="ivr" className="space-y-6">
            <TestCard
              title="Testar IVR Básico"
              functionName="send-ivr-call"
              defaultParams={{
                to: "",
                from: "",
                template: "custom",
                ncco: [
                  {
                    action: "talk",
                    text: "Pressione 1 para continuar",
                    language: "pt-BR"
                  },
                  {
                    action: "input",
                    maxDigits: 1,
                    timeOut: 10
                  }
                ]
              }}
              fields={[
                { name: "to", label: "Para (To)", type: "text", placeholder: "+5511999999999" },
                { name: "from", label: "De (From)", type: "text", placeholder: "+442033222305" },
                { name: "template", label: "Template", type: "text", placeholder: "custom" },
                { name: "ncco", label: "NCCO (JSON)", type: "json", placeholder: "[]" }
              ]}
              onTestComplete={handleTestComplete}
            />
          </TabsContent>

          <TabsContent value="ivr-v2" className="space-y-6">
            <TestCard
              title="Testar IVR Avançado (com Transferência)"
              functionName="send-ivr-call-v2"
              defaultParams={{
                to: "",
                from: "",
                assistantNumber: "",
                transferTimeout: 30,
                template: "bank-security-v2",
                language: "pt-PT",
                style: 2,
                premium: false,
                voiceName: "Inês",
                ncco: [
                  {
                    action: "talk",
                    text: "Está a falar com o serviço de segurança. Prima 1 para continuar ou 2 para falar com assistente.",
                    language: "pt-PT",
                    style: 2,
                    bargeIn: true
                  },
                  {
                    action: "input",
                    type: ["dtmf"],
                    dtmf: {
                      maxDigits: 1,
                      timeOut: 10,
                      submitOnHash: false
                    }
                  }
                ]
              }}
              fields={[
                { name: "to", label: "Para (To)", type: "text", placeholder: "+351911019866" },
                { name: "from", label: "De (From)", type: "text", placeholder: "+442033222305" },
                { name: "assistantNumber", label: "Número do Assistente", type: "text", placeholder: "+351912345678" },
                { name: "transferTimeout", label: "Timeout Transferência (s)", type: "number", placeholder: "30" },
                { name: "template", label: "Template", type: "text", placeholder: "bank-security-v2" },
                { name: "voiceName", label: "Voz", type: "text", placeholder: "Inês" },
                { name: "language", label: "Idioma", type: "text", placeholder: "pt-PT" },
                { name: "style", label: "Estilo", type: "number", placeholder: "2" },
                { name: "premium", label: "Premium", type: "checkbox" },
                { name: "ncco", label: "NCCO (JSON)", type: "json", placeholder: "[]" }
              ]}
              onTestComplete={handleTestComplete}
            />
          </TabsContent>
        </Tabs>

        {/* 4. Histórico de Validações */}
        <div className="mt-8">
          <ValidationHistory />
        </div>

        {/* 5. Histórico de Testes */}
        <div className="mt-6">
          <TestHistory
            history={testHistory}
            onClearHistory={handleClearHistory}
          />
        </div>
      </div>
    </div>
  );
};

export default ApiTest;
