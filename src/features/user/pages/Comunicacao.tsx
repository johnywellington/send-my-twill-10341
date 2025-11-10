import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SmsForm } from "@/components/SmsForm";
import { VoiceCallForm } from "@/components/VoiceCallForm";
import { IVRMenuFormV2 } from "@/components/IVRMenuFormV2";
import { ReceivedSmsViewer } from "@/components/ReceivedSmsViewer";
import { ReceivedCallsViewer } from "@/components/ReceivedCallsViewer";

// Página principal de comunicação: SMS, Voice e URA
const Comunicacao = () => {
  const [activeTab, setActiveTab] = useState<"sms" | "voice" | "ivr" | "receive-sms" | "receive-calls">("sms");

  const tabConfig = {
    sms: {
      title: "Enviar SMS",
      description: "Envie mensagens SMS de forma simples e segura",
    },
    voice: {
      title: "Chamada de Voz",
      description: "Faça chamadas de voz usando o provedor selecionado",
    },
    ivr: {
      title: "URA",
      description: "Sistema URA com redirecionamento e captura de DTMF",
    },
    "receive-sms": {
      title: "SMS Recebidos",
      description: "Visualize e filtre os SMS recebidos nos seus números",
    },
    "receive-calls": {
      title: "Chamadas Recebidas",
      description: "Monitore e analise chamadas recebidas em tempo real",
    },
  } as const;

  const title = tabConfig[activeTab].title;
  const description = tabConfig[activeTab].description;

  return (
    <main className="min-h-screen">
      <section className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground mt-1">{description}</p>
        </header>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="sms">SMS</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
            <TabsTrigger value="ivr">URA</TabsTrigger>
            <TabsTrigger value="receive-sms">Rec. SMS</TabsTrigger>
            <TabsTrigger value="receive-calls">Rec. Chamadas</TabsTrigger>
          </TabsList>

          <TabsContent value="sms">
            <SmsForm />
          </TabsContent>

          <TabsContent value="voice">
            <VoiceCallForm />
          </TabsContent>

          <TabsContent value="ivr">
            <IVRMenuFormV2 />
          </TabsContent>

          <TabsContent value="receive-sms">
            <ReceivedSmsViewer />
          </TabsContent>

          <TabsContent value="receive-calls">
            <ReceivedCallsViewer />
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
};

export default Comunicacao;
