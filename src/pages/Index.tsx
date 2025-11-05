import { SmsForm } from "@/components/SmsForm";
import { MessageSquare } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-[var(--shadow-glow)] mb-4">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Twilio SMS Sender
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Envie mensagens SMS de forma simples e segura usando a API do Twilio
          </p>
        </div>
        
        <div className="flex justify-center">
          <SmsForm />
        </div>
      </div>
    </div>
  );
};

export default Index;
