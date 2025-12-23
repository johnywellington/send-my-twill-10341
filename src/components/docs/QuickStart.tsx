import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const QuickStart = () => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Código copiado para a área de transferência",
    });
  };

  const setupCode = `// 1. Instalar o cliente Supabase
npm install @supabase/supabase-js

// 2. Configurar o cliente
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_KEY'
)

// 3. Enviar SMS
const { data, error } = await supabase.functions.invoke('send-sms', {
  body: {
    provider: 'vonage',
    to: '+5511999999999',
    from: 'SeuApp',
    message: 'Olá! Esta é uma mensagem de teste.',
    dryRun: true // Modo de teste
  }
})`;

  const curlExample = `curl -X POST \\
  'YOUR_SUPABASE_URL/functions/v1/send-sms' \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "provider": "vonage",
    "to": "+5511999999999",
    "from": "SeuApp",
    "message": "Teste de SMS",
    "dryRun": true
  }'`;

  return (
    <div className="space-y-6">
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Começando em 3 Passos</CardTitle>
          <CardDescription>
            Configure sua integração em menos de 5 minutos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Configure suas Credenciais</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Adicione suas credenciais de API (Vonage ou Twilio) nas variáveis de ambiente:
                </p>
                <div className="space-y-2">
                  <Badge variant="outline">VONAGE_API_KEY</Badge>
                  <Badge variant="outline">VONAGE_API_SECRET</Badge>
                  <Badge variant="outline">TWILIO_ACCOUNT_SID</Badge>
                  <Badge variant="outline">TWILIO_AUTH_TOKEN</Badge>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Instale o Cliente</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Instale o cliente Supabase em seu projeto
                </p>
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-muted text-sm overflow-x-auto">
                    <code>npm install @supabase/supabase-js</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard("npm install @supabase/supabase-js")}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold shrink-0">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Faça sua Primeira Chamada</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Use o modo dryRun para testar sem custos
                </p>
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-muted text-sm overflow-x-auto max-h-64">
                    <code>{setupCode}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(setupCode)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Exemplo com cURL</CardTitle>
          <CardDescription>
            Para testar rapidamente via linha de comando
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="p-4 rounded-lg bg-muted text-sm overflow-x-auto">
              <code>{curlExample}</code>
            </pre>
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(curlExample)}
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-effect border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💡 Dica Pro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            Use sempre o parâmetro <code className="px-2 py-1 rounded bg-muted">dryRun: true</code> durante o desenvolvimento 
            para validar suas integrações sem custos e sem envios reais.
          </p>
          <Button variant="outline" onClick={() => window.open('/api-test', '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Abrir Interface de Testes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
