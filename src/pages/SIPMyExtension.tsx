import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Copy, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SIPMyExtension() {
  const [showPassword, setShowPassword] = useState(false);

  const { data: sipUser, isLoading } = useQuery({
    queryKey: ['my-sip-extension'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('sip_users')
        .select('*')
        .eq('user_id', user.id)
        .single();

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
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!sipUser) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Ramal SIP não configurado</CardTitle>
            <CardDescription>
              Você ainda não possui um ramal SIP. Entre em contato com o administrador.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const sipUri = `sip:${sipUser.sip_username}@${sipUser.sip_domain}`;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Phone className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Meu Ramal SIP</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Informações do Ramal</CardTitle>
            <Badge className="bg-green-500">Online</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* SIP URI */}
          <div className="space-y-2">
            <label className="font-semibold">SIP URI</label>
            <div className="flex gap-2">
              <code className="flex-1 p-3 bg-muted rounded-lg font-mono">{sipUri}</code>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => copyToClipboard(sipUri, 'SIP URI')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Username */}
          <div className="space-y-2">
            <label className="font-semibold">Username</label>
            <div className="flex gap-2">
              <code className="flex-1 p-3 bg-muted rounded-lg font-mono">{sipUser.sip_username}</code>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => copyToClipboard(sipUser.sip_username, 'Username')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="font-semibold">Password</label>
            <div className="flex gap-2">
              <code className="flex-1 p-3 bg-muted rounded-lg font-mono">
                {showPassword ? sipUser.sip_password : '••••••••••••'}
              </code>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => copyToClipboard(sipUser.sip_password, 'Password')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Extension */}
          <div className="space-y-2">
            <label className="font-semibold">Extension</label>
            <code className="block p-3 bg-muted rounded-lg font-mono text-xl">
              {sipUser.extension}
            </code>
          </div>

          {/* Provider */}
          <div className="space-y-2">
            <label className="font-semibold">Provider</label>
            <Badge variant={sipUser.provider === 'twilio' ? 'default' : 'secondary'} className="text-lg p-2">
              {sipUser.provider.toUpperCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Como Configurar</CardTitle>
          <CardDescription>Instruções para apps SIP populares</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Zoiper</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Abra Zoiper e vá em Settings → Accounts</li>
              <li>Adicione nova conta SIP</li>
              <li>Cole o SIP URI no campo Domain</li>
              <li>Insira Username e Password</li>
            </ol>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Linphone</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Abra Linphone → Assistente</li>
              <li>Selecione "Use SIP account"</li>
              <li>Cole as credenciais acima</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}