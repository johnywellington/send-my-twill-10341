import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";

interface TroubleshootingSectionProps {
  commonErrors: [string, { count: number; function: string }][];
}

const getSolution = (error: string): { title: string; solution: string; severity: "error" | "warning" } => {
  const errorLower = error.toLowerCase();
  
  if (errorLower.includes("authentication") || errorLower.includes("credentials")) {
    return {
      title: "Erro de Autenticação",
      solution: "Verifique se suas credenciais (API Key, API Secret, Account SID ou Auth Token) estão corretas nas variáveis de ambiente. Use a página de testes para validar as credenciais.",
      severity: "error"
    };
  }
  
  if (errorLower.includes("invalid") && errorLower.includes("number")) {
    return {
      title: "Número Inválido",
      solution: "Use sempre o formato E.164 para números de telefone (ex: +5511999999999). Inclua o código do país (+55 para Brasil) e não use espaços, traços ou parênteses.",
      severity: "warning"
    };
  }
  
  if (errorLower.includes("rate limit") || errorLower.includes("429")) {
    return {
      title: "Limite de Taxa Excedido",
      solution: "Você atingiu o limite de requisições do provedor. Aguarde alguns minutos antes de tentar novamente ou distribua suas requisições ao longo do tempo usando rate limiting.",
      severity: "error"
    };
  }
  
  if (errorLower.includes("insufficient funds") || errorLower.includes("balance")) {
    return {
      title: "Saldo Insuficiente",
      solution: "Sua conta no provedor não possui saldo suficiente. Adicione créditos à sua conta Vonage ou Twilio para continuar enviando mensagens.",
      severity: "error"
    };
  }
  
  if (errorLower.includes("timeout")) {
    return {
      title: "Timeout",
      solution: "A requisição demorou muito para responder. Isso pode ser temporário. Tente novamente em alguns instantes. Se persistir, verifique a conexão com a internet e o status do provedor.",
      severity: "warning"
    };
  }
  
  return {
    title: "Erro Desconhecido",
    solution: "Verifique os logs detalhados na página de testes. Se o problema persistir, consulte a documentação do provedor ou entre em contato com o suporte.",
    severity: "warning"
  };
};

export const TroubleshootingSection = ({ commonErrors }: TroubleshootingSectionProps) => {
  return (
    <div className="space-y-6">
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Erros Comuns e Soluções</CardTitle>
          <CardDescription>
            Análise inteligente baseada no seu histórico de testes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {commonErrors.length > 0 ? (
            commonErrors.map(([errorMsg, data], index) => {
              const solution = getSolution(errorMsg);
              return (
                <Alert key={index} variant={solution.severity === "error" ? "destructive" : "default"}>
                  <div className="flex items-start gap-3">
                    {solution.severity === "error" ? (
                      <XCircle className="w-5 h-5 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <AlertTitle className="mb-2 flex items-center gap-2">
                        {solution.title}
                        <Badge variant="outline">{data.count}x</Badge>
                      </AlertTitle>
                      <AlertDescription className="space-y-2">
                        <p className="text-sm font-mono bg-muted/50 p-2 rounded">
                          {errorMsg}
                        </p>
                        <p className="text-sm">{solution.solution}</p>
                        <p className="text-xs text-muted-foreground">
                          Detectado em: <code>{data.function}</code>
                        </p>
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              );
            })
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 mx-auto text-primary mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhum erro registrado! Todos os seus testes foram executados com sucesso.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Guia Rápido de Resolução</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="border-l-4 border-primary pl-4">
              <h4 className="font-semibold mb-1">Erro 401 - Unauthorized</h4>
              <p className="text-sm text-muted-foreground">
                Credenciais inválidas. Verifique suas API Keys na página de validação.
              </p>
            </div>
            
            <div className="border-l-4 border-primary pl-4">
              <h4 className="font-semibold mb-1">Erro 400 - Bad Request</h4>
              <p className="text-sm text-muted-foreground">
                Parâmetros inválidos. Verifique se todos os campos obrigatórios estão preenchidos e no formato correto.
              </p>
            </div>
            
            <div className="border-l-4 border-primary pl-4">
              <h4 className="font-semibold mb-1">Erro 429 - Too Many Requests</h4>
              <p className="text-sm text-muted-foreground">
                Rate limit atingido. Aguarde antes de fazer novas requisições ou implemente throttling.
              </p>
            </div>
            
            <div className="border-l-4 border-primary pl-4">
              <h4 className="font-semibold mb-1">Formato de Número</h4>
              <p className="text-sm text-muted-foreground">
                Sempre use E.164: +[código_país][número]. Exemplo: +5511999999999
              </p>
            </div>
            
            <div className="border-l-4 border-primary pl-4">
              <h4 className="font-semibold mb-1">Modo Dry Run</h4>
              <p className="text-sm text-muted-foreground">
                Use <code className="bg-muted px-1 rounded">dryRun: true</code> para testar sem enviar mensagens reais e sem custos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
