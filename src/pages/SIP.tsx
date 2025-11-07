import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone } from "lucide-react";
import { MyExtensionContent } from "@/components/sip/MyExtensionContent";
import { MakeCallContent } from "@/components/sip/MakeCallContent";
import { CallsHistoryContent } from "@/components/sip/CallsHistoryContent";
import { QRCodeContent } from "@/components/sip/QRCodeContent";
import { DiagnosticContent } from "@/components/sip/DiagnosticContent";

export default function SIP() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'ramal';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Phone className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Módulo SIP</h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="ramal">🔑 Meu Ramal</TabsTrigger>
          <TabsTrigger value="diagnostico">🔍 Diagnóstico</TabsTrigger>
          <TabsTrigger value="qrcode">📱 QR Code</TabsTrigger>
          <TabsTrigger value="chamada">📞 Fazer Chamada</TabsTrigger>
          <TabsTrigger value="historico">📋 Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="ramal" className="mt-6">
          <MyExtensionContent />
        </TabsContent>

        <TabsContent value="diagnostico" className="mt-6">
          <DiagnosticContent />
        </TabsContent>

        <TabsContent value="qrcode" className="mt-6">
          <QRCodeContent />
        </TabsContent>

        <TabsContent value="chamada" className="mt-6">
          <MakeCallContent />
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          <CallsHistoryContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
