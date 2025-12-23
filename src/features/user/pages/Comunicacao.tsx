import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { SmsForm } from "@/components/SmsForm";
import { VoiceCallForm } from "@/components/VoiceCallForm";
import { IVRMenuFormV2 } from "@/components/IVRMenuFormV2";
import { ReceivedSmsViewer } from "@/components/ReceivedSmsViewer";
import { ReceivedCallsViewer } from "@/components/ReceivedCallsViewer";
import { MessageSquare, Phone, PhoneForwarded, Inbox, PhoneIncoming } from "lucide-react";

// Página principal de comunicação: SMS, Voice e URA
const Comunicacao = () => {
  const [activeTab, setActiveTab] = useState<"sms" | "voice" | "ivr" | "receive-sms" | "receive-calls">("sms");

  const tabConfig = {
    sms: {
      title: "Enviar SMS",
      description: "Envie mensagens SMS de forma simples e segura",
      icon: MessageSquare,
    },
    voice: {
      title: "Chamada de Voz",
      description: "Faça chamadas de voz usando o provedor selecionado",
      icon: Phone,
    },
    ivr: {
      title: "Sistema URA",
      description: "Sistema URA com redirecionamento e captura de DTMF",
      icon: PhoneForwarded,
    },
    "receive-sms": {
      title: "SMS Recebidos",
      description: "Visualize e filtre os SMS recebidos nos seus números",
      icon: Inbox,
    },
    "receive-calls": {
      title: "Chamadas Recebidas",
      description: "Monitore e analise chamadas recebidas em tempo real",
      icon: PhoneIncoming,
    },
  } as const;

  const currentTab = tabConfig[activeTab];
  const IconComponent = currentTab.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <IconComponent className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">{currentTab.title}</h1>
        </div>
        <p className="text-muted-foreground ml-14">{currentTab.description}</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 h-auto p-1">
          <TabsTrigger value="sms" className="flex flex-col gap-1 py-3">
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs">SMS</span>
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex flex-col gap-1 py-3">
            <Phone className="w-4 h-4" />
            <span className="text-xs">Voice</span>
          </TabsTrigger>
          <TabsTrigger value="ivr" className="flex flex-col gap-1 py-3">
            <PhoneForwarded className="w-4 h-4" />
            <span className="text-xs">URA</span>
          </TabsTrigger>
          <TabsTrigger value="receive-sms" className="flex flex-col gap-1 py-3">
            <Inbox className="w-4 h-4" />
            <span className="text-xs">Rec. SMS</span>
          </TabsTrigger>
          <TabsTrigger value="receive-calls" className="flex flex-col gap-1 py-3">
            <PhoneIncoming className="w-4 h-4" />
            <span className="text-xs">Rec. Calls</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sms" className="mt-6">
          <SmsForm />
        </TabsContent>

        <TabsContent value="voice" className="mt-6">
          <VoiceCallForm />
        </TabsContent>

        <TabsContent value="ivr" className="mt-6">
          <IVRMenuFormV2 />
        </TabsContent>

        <TabsContent value="receive-sms" className="mt-6">
          <ReceivedSmsViewer />
        </TabsContent>

        <TabsContent value="receive-calls" className="mt-6">
          <ReceivedCallsViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Comunicacao;
