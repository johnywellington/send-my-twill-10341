import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import type { TestResult } from "@/features/user/types/api-test";
import { toast } from "@/hooks/use-toast";

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface EndpointSectionProps {
  title: string;
  functionName: string;
  description: string;
  endpoint: string;
  method: string;
  examples: TestResult[];
  parameters: Parameter[];
}

export const EndpointSection = ({
  title,
  functionName,
  description,
  endpoint,
  method,
  examples,
  parameters,
}: EndpointSectionProps) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Código copiado para a área de transferência",
    });
  };

  return (
    <Card className="glass-effect">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription className="mt-2">{description}</CardDescription>
          </div>
          <Badge variant="outline" className="font-mono">
            {method}
          </Badge>
        </div>
        <code className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-md inline-block mt-2">
          {endpoint}
        </code>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Parâmetros */}
        <div>
          <h3 className="font-semibold mb-3">Parâmetros</h3>
          <div className="space-y-2">
            {parameters.map((param) => (
              <div
                key={param.name}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-semibold">{param.name}</code>
                    <Badge variant={param.required ? "default" : "secondary"} className="text-xs">
                      {param.required ? "obrigatório" : "opcional"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {param.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {param.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exemplos Reais */}
        {examples.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              Exemplos Reais de Sucesso
              <Badge variant="secondary">{examples.length}</Badge>
            </h3>
            <div className="space-y-3">
              {examples.map((example, index) => (
                <div key={example.id} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 border-b flex items-center justify-between">
                    <span className="text-sm font-medium">Exemplo {index + 1}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{example.latency}ms</span>
                      <span>•</span>
                      <span>{new Date(example.timestamp).toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                  <div className="p-3 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Request</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(JSON.stringify(example.request, null, 2))}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                        <code>{JSON.stringify(example.request, null, 2)}</code>
                      </pre>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Response</span>
                      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto mt-2">
                        <code>{JSON.stringify(example.response, null, 2)}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {examples.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">
              Nenhum exemplo disponível ainda. Execute testes bem-sucedidos para gerar exemplos automáticos.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.open('/api-test', '_blank')}
            >
              Ir para Testes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
