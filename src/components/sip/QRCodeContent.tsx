import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import QRCodeSVG from "react-qr-code";
import { Download, Smartphone, Copy, Info, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export function QRCodeContent() {
  const [selectedFormat, setSelectedFormat] = useState('basic');
  
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

  const generateURI = (format: string) => {
    if (!extension) return '';
    
    switch (format) {
      case 'basic':
        return `sip:${extension.sip_username}:${extension.sip_password}@${extension.sip_domain}`;
      
      case 'advanced':
        return `sip:${extension.sip_username}@${extension.sip_domain}?password=${extension.sip_password}&transport=udp`;
      
      case 'text':
        return `Username: ${extension.sip_username}
Password: ${extension.sip_password}
Domain: ${extension.sip_domain}
Extension: ${extension.extension}
Provider: ${extension.provider}`;
      
      default:
        return '';
    }
  };

  const downloadQRCode = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 300;
      canvas.height = 300;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 300, 300);
      }
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `sip-qrcode-${extension?.sip_username}-${selectedFormat}.png`;
          a.click();
          URL.revokeObjectURL(url);
          toast.success('QR Code baixado!');
        }
      });
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!extension) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ramal não configurado</CardTitle>
          <CardDescription>
            Você precisa ter um ramal SIP configurado para gerar QR Codes.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Smartphone className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Configuração via QR Code</h2>
      </div>

      <Alert className="border-destructive/50 bg-destructive/10">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <AlertTitle>Atenção - Segurança!</AlertTitle>
        <AlertDescription>
          Este QR Code contém sua senha SIP em texto plano. <strong>Não compartilhe</strong> com terceiros 
          e delete a imagem após configurar seu dispositivo.
        </AlertDescription>
      </Alert>

      <Card className="border-primary/20 bg-accent/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Como Usar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>1. Escolha o formato compatível com seu softphone</p>
          <p>2. Abra o aplicativo no celular e procure por "Escanear QR Code" ou "Importar Configuração"</p>
          <p>3. Aponte a câmera para o QR Code abaixo</p>
          <p>4. Suas credenciais serão configuradas automaticamente! ✨</p>
        </CardContent>
      </Card>

      <Tabs value={selectedFormat} onValueChange={setSelectedFormat}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">🔷 Básico</TabsTrigger>
          <TabsTrigger value="advanced">⚙️ Avançado</TabsTrigger>
          <TabsTrigger value="text">📝 Texto</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>QR Code - SIP URI Básico</CardTitle>
              <CardDescription>
                Compatível com: Zoiper, Linphone, Groundwire, Bria
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="bg-background p-6 rounded-lg border shadow-sm">
                <QRCodeSVG
                  id="qr-code-svg"
                  value={generateURI('basic')}
                  size={256}
                  level="H"
                />
              </div>
              
              <code className="text-xs bg-muted p-2 rounded max-w-full overflow-x-auto block">
                {generateURI('basic')}
              </code>

              <div className="flex gap-2">
                <Button onClick={downloadQRCode} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PNG
                </Button>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(generateURI('basic'));
                    toast.success('URI copiado!');
                  }}
                  variant="outline"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar URI
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>QR Code - SIP URI com Parâmetros</CardTitle>
              <CardDescription>
                Formato mais detalhado com configurações de transporte
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="bg-background p-6 rounded-lg border shadow-sm">
                <QRCodeSVG
                  id="qr-code-svg"
                  value={generateURI('advanced')}
                  size={256}
                  level="H"
                />
              </div>
              
              <code className="text-xs bg-muted p-2 rounded max-w-full overflow-x-auto break-all block">
                {generateURI('advanced')}
              </code>

              <div className="flex gap-2">
                <Button onClick={downloadQRCode} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PNG
                </Button>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(generateURI('advanced'));
                    toast.success('URI copiado!');
                  }}
                  variant="outline"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar URI
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="text" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>QR Code - Credenciais em Texto</CardTitle>
              <CardDescription>
                Para copiar manualmente ou apps que não suportam SIP URI
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="bg-background p-6 rounded-lg border shadow-sm">
                <QRCodeSVG
                  id="qr-code-svg"
                  value={generateURI('text')}
                  size={256}
                  level="H"
                />
              </div>
              
              <pre className="text-xs bg-muted p-4 rounded whitespace-pre-wrap break-words">
                {generateURI('text')}
              </pre>

              <div className="flex gap-2">
                <Button onClick={downloadQRCode} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PNG
                </Button>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(generateURI('text'));
                    toast.success('Credenciais copiadas!');
                  }}
                  variant="outline"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Texto
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>📱 Guia por Aplicativo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-semibold">📞 Zoiper</h4>
            <p className="text-sm text-muted-foreground">
              Use o formato <strong>Básico</strong>. No Zoiper, vá em Configurações → Adicionar Conta → Escanear QR Code.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-semibold">📱 Linphone</h4>
            <p className="text-sm text-muted-foreground">
              Use o formato <strong>Básico</strong> ou <strong>Texto</strong>. No Linphone, toque em Assistente → QR Code.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-semibold">🌐 Groundwire</h4>
            <p className="text-sm text-muted-foreground">
              Use o formato <strong>Avançado</strong>. Groundwire possui melhor suporte para parâmetros URI.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-semibold">📲 Bria</h4>
            <p className="text-sm text-muted-foreground">
              Use o formato <strong>Básico</strong>. Suporta importação via QR Code em todas as plataformas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
