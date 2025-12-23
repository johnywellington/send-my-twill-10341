import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Info, Zap } from "lucide-react";

export const BestPractices = () => {
  return (
    <div className="space-y-6">
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Desenvolvimento e Testes</CardTitle>
          <CardDescription>
            Práticas recomendadas para ambiente de desenvolvimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">Use Dry Run Durante Desenvolvimento</h4>
              <p className="text-sm text-muted-foreground">
                Sempre configure <code className="bg-muted px-1 rounded">dryRun: true</code> em ambiente 
                de desenvolvimento para validar integrações sem custos e sem envios reais.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">Valide Credenciais Primeiro</h4>
              <p className="text-sm text-muted-foreground">
                Use a interface de validação de credenciais antes de iniciar integrações. 
                Isso garante que suas API Keys estão corretas e economiza tempo de debug.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">Monitore o Histórico de Testes</h4>
              <p className="text-sm text-muted-foreground">
                Acompanhe latência e taxa de sucesso dos seus testes. Padrões de erro 
                podem indicar problemas de configuração ou limitações dos provedores.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Produção e Performance</CardTitle>
          <CardDescription>
            Otimizações para ambiente de produção
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">Implemente Rate Limiting</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Respeite os limites dos provedores para evitar bloqueios:
              </p>
              <div className="space-y-1 ml-4">
                <p className="text-sm">
                  <Badge variant="outline">Vonage</Badge> 10-20 req/s
                </p>
                <p className="text-sm">
                  <Badge variant="outline">Twilio</Badge> 100-500 req/s
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">Use Retry com Backoff Exponencial</h4>
              <p className="text-sm text-muted-foreground">
                Em caso de falhas temporárias (5xx), implemente retry automático com 
                backoff exponencial: 1s, 2s, 4s, 8s antes de desistir.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">Monitore Custos</h4>
              <p className="text-sm text-muted-foreground">
                Acompanhe o volume de envios e custos nos dashboards dos provedores. 
                Configure alertas de saldo baixo para evitar interrupções.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
          <CardDescription>
            Proteja suas credenciais e dados sensíveis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">Nunca Exponha Credenciais no Frontend</h4>
              <p className="text-sm text-muted-foreground">
                Sempre use Edge Functions ou backend para fazer chamadas aos provedores. 
                Nunca inclua API Keys diretamente no código JavaScript do cliente.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">Valide Números no Backend</h4>
              <p className="text-sm text-muted-foreground">
                Implemente validação de formato E.164 no servidor para evitar 
                custos desnecessários com números inválidos.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">Configure Rate Limiting por Usuário</h4>
              <p className="text-sm text-muted-foreground">
                Limite o número de mensagens que cada usuário pode enviar para 
                prevenir abuso e controlar custos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Qualidade de Entrega</CardTitle>
          <CardDescription>
            Maximize a taxa de entrega das suas mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">Formato de Número E.164</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Sempre use o formato internacional correto:
              </p>
              <code className="text-sm bg-muted px-2 py-1 rounded block">
                +[código_país][código_área][número]
              </code>
              <p className="text-sm text-muted-foreground mt-1">
                Exemplo: +5511999999999 (Brasil)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">Mensagens SMS Concisas</h4>
              <p className="text-sm text-muted-foreground">
                Mantenha mensagens SMS com até 160 caracteres para evitar segmentação 
                e cobranças extras. Use links encurtados quando necessário.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">Horários Apropriados</h4>
              <p className="text-sm text-muted-foreground">
                Evite enviar mensagens entre 22h e 8h para respeitar os usuários 
                e aumentar a taxa de engajamento. Configure agendamento se necessário.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold mb-1">Escolha a Voz Adequada para TTS</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Para chamadas de voz, use vozes no idioma correto:
              </p>
              <div className="space-y-1 ml-4">
                <p className="text-sm">
                  <Badge variant="outline">pt-BR</Badge> Camila, Ricardo
                </p>
                <p className="text-sm">
                  <Badge variant="outline">en-US</Badge> Salli, Joey, Matthew
                </p>
                <p className="text-sm">
                  <Badge variant="outline">es-ES</Badge> Lucia, Enrique
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-effect border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💡 Checklist de Produção
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              "✅ Credenciais validadas e configuradas",
              "✅ Rate limiting implementado",
              "✅ Retry logic com backoff exponencial",
              "✅ Validação de números no backend",
              "✅ Logs e monitoramento configurados",
              "✅ Alertas de erro e saldo baixo ativos",
              "✅ Webhooks configurados para status de entrega",
              "✅ Testes em produção realizados com dry run",
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                {item}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
