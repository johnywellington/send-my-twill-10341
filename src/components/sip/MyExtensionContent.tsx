import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function MyExtensionContent() {
  const [showPassword, setShowPassword] = useState(false);

  const { data: extension, isLoading } = useQuery({
    queryKey: ['my-sip-extension'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('sip_users')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!extension) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ramal Não Configurado</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Você ainda não tem um ramal SIP configurado. Entre em contato com o administrador.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Minhas Credenciais SIP</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">SIP URI</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded text-sm">
                {extension.sip_username}@{extension.sip_domain}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(`${extension.sip_username}@${extension.sip_domain}`, 'SIP URI')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Usuário</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded text-sm">
                {extension.sip_username}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(extension.sip_username, 'Usuário')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Senha</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded text-sm">
                {showPassword ? extension.sip_password : '••••••••'}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(extension.sip_password, 'Senha')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Ramal</p>
              <p className="text-2xl font-bold">{extension.extension}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Provider</p>
              <Badge variant="outline">{extension.provider}</Badge>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              const credentials = `SIP URI: ${extension.sip_username}@${extension.sip_domain}
Usuário: ${extension.sip_username}
Senha: ${extension.sip_password}
Ramal: ${extension.extension}
Provider: ${extension.provider}`;
              
              navigator.clipboard.writeText(credentials);
              toast.success('Credenciais completas copiadas!');
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copiar Todas as Credenciais
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurar Aplicativo SIP</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Zoiper</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Abra o Zoiper e vá em Configurações → Contas</li>
              <li>Adicione uma nova conta SIP</li>
              <li>Nome de usuário: {extension.sip_username}</li>
              <li>Senha: {showPassword ? extension.sip_password : '••••••••'}</li>
              <li>Domínio: {extension.sip_domain}</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Linphone</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Abra o Linphone e vá em Assistente</li>
              <li>Escolha "Usar conta SIP"</li>
              <li>Nome de usuário: {extension.sip_username}</li>
              <li>Senha: {showPassword ? extension.sip_password : '••••••••'}</li>
              <li>Domínio: {extension.sip_domain}</li>
              <li>Protocolo de transporte: UDP</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
