import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Code, Lightbulb, AlertTriangle } from "lucide-react";
import { QuickStart } from "@/components/docs/QuickStart";
import { EndpointSection } from "@/components/docs/EndpointSection";
import { TroubleshootingSection } from "@/components/docs/TroubleshootingSection";
import { BestPractices } from "@/components/docs/BestPractices";
import type { TestResult } from "@/features/user/types/api-test";

const ApiDocs = () => {
  const navigate = useNavigate();
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("api-test-history");
    if (saved) {
      setTestHistory(JSON.parse(saved));
    }
  }, []);

  // Agrupar exemplos por função
  const getExamplesByFunction = (functionName: string) => {
    return testHistory
      .filter(test => test.functionName === functionName && test.status === "success")
      .slice(0, 3);
  };

  // Agrupar erros comuns
  const getCommonErrors = () => {
    const errors = testHistory
      .filter(test => test.status === "error")
      .reduce((acc, test) => {
        const errorMsg = typeof test.response === "string" 
          ? test.response 
          : test.response?.error || test.response?.message || "Unknown error";
        
        if (!acc[errorMsg]) {
          acc[errorMsg] = { count: 0, function: test.functionName };
        }
        acc[errorMsg].count++;
        return acc;
      }, {} as Record<string, { count: number; function: string }>);

    return Object.entries(errors)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
  };

  const stats = {
    totalTests: testHistory.length,
    successRate: testHistory.length > 0 
      ? Math.round((testHistory.filter(t => t.status === "success").length / testHistory.length) * 100)
      : 0,
    avgLatency: testHistory.length > 0
      ? Math.round(testHistory.reduce((sum, t) => sum + t.latency, 0) / testHistory.length)
      : 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/api-test")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Documentação da API
              </h1>
              <p className="text-muted-foreground mt-2">
                Documentação interativa auto-gerada com exemplos reais
              </p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Testes Realizados</p>
              <p className="text-2xl font-bold">{stats.totalTests}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
              <p className="text-2xl font-bold text-primary">{stats.successRate}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Latência Média</p>
              <p className="text-2xl font-bold text-accent">{stats.avgLatency}ms</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="quickstart" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="quickstart" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Quick Start
            </TabsTrigger>
            <TabsTrigger value="endpoints" className="gap-2">
              <Code className="w-4 h-4" />
              Endpoints
            </TabsTrigger>
            <TabsTrigger value="troubleshooting" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Troubleshooting
            </TabsTrigger>
            <TabsTrigger value="best-practices" className="gap-2">
              <Lightbulb className="w-4 h-4" />
              Best Practices
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quickstart" className="space-y-6">
            <QuickStart />
          </TabsContent>

          <TabsContent value="endpoints" className="space-y-6">
            <EndpointSection
              title="Envio de SMS"
              functionName="send-sms"
              description="Envie mensagens SMS através dos provedores Vonage ou Twilio"
              endpoint="/functions/v1/send-sms"
              method="POST"
              examples={getExamplesByFunction("send-sms")}
              parameters={[
                { name: "provider", type: "string", required: true, description: "Provedor (vonage ou twilio)" },
                { name: "to", type: "string", required: true, description: "Número do destinatário (formato E.164)" },
                { name: "message", type: "string", required: true, description: "Mensagem de texto" },
                { name: "from", type: "string", required: true, description: "Número/ID do remetente" },
                { name: "dryRun", type: "boolean", required: false, description: "Modo de teste (sem envio real)" },
              ]}
            />

            <EndpointSection
              title="Chamada de Voz"
              functionName="send-voice-call"
              description="Realize chamadas de voz com texto convertido em áudio (TTS)"
              endpoint="/functions/v1/send-voice-call"
              method="POST"
              examples={getExamplesByFunction("send-voice-call")}
              parameters={[
                { name: "provider", type: "string", required: true, description: "Provedor (vonage ou twilio)" },
                { name: "to", type: "string", required: true, description: "Número do destinatário" },
                { name: "text", type: "string", required: true, description: "Texto a ser falado" },
                { name: "from", type: "string", required: true, description: "Número do remetente" },
                { name: "voice", type: "string", required: false, description: "Voz do TTS (ex: pt-BR-Camila)" },
                { name: "dryRun", type: "boolean", required: false, description: "Modo de teste" },
              ]}
            />

            <EndpointSection
              title="IVR Básico"
              functionName="send-ivr-call"
              description="Crie menus IVR interativos com opções de navegação"
              endpoint="/functions/v1/send-ivr-call"
              method="POST"
              examples={getExamplesByFunction("send-ivr-call")}
              parameters={[
                { name: "provider", type: "string", required: true, description: "Provedor" },
                { name: "to", type: "string", required: true, description: "Número do destinatário" },
                { name: "from", type: "string", required: true, description: "Número do remetente" },
                { name: "welcomeMessage", type: "string", required: true, description: "Mensagem de boas-vindas" },
                { name: "menuOptions", type: "array", required: true, description: "Opções do menu IVR" },
                { name: "dryRun", type: "boolean", required: false, description: "Modo de teste" },
              ]}
            />

            <EndpointSection
              title="IVR Avançado (V2)"
              functionName="send-ivr-call-v2"
              description="Sistema IVR avançado com múltiplos níveis e webhooks"
              endpoint="/functions/v1/send-ivr-call-v2"
              method="POST"
              examples={getExamplesByFunction("send-ivr-call-v2")}
              parameters={[
                { name: "provider", type: "string", required: true, description: "Provedor" },
                { name: "to", type: "string", required: true, description: "Número do destinatário" },
                { name: "from", type: "string", required: true, description: "Número do remetente" },
                { name: "welcomeMessage", type: "string", required: true, description: "Mensagem inicial" },
                { name: "menuOptions", type: "array", required: true, description: "Opções do menu com ações" },
                { name: "dryRun", type: "boolean", required: false, description: "Modo de teste" },
              ]}
            />
          </TabsContent>

          <TabsContent value="troubleshooting" className="space-y-6">
            <TroubleshootingSection commonErrors={getCommonErrors()} />
          </TabsContent>

          <TabsContent value="best-practices" className="space-y-6">
            <BestPractices />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ApiDocs;
