import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { PhoneNumberList } from "@/components/numbers/PhoneNumberList";
import { PhoneNumberDialog } from "@/components/numbers/PhoneNumberDialog";
import { SyncTwilioButton } from "@/components/numbers/SyncTwilioButton";

const Numbers = () => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold">Gerenciar Números</h1>
            <p className="text-muted-foreground mt-2">
              Configure seus números virtuais e webhooks para SMS e Voz
            </p>
          </div>
          
          <div className="flex gap-2">
            <SyncTwilioButton />
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Número
            </Button>
          </div>
        </div>

        <PhoneNumberList />
        
        <PhoneNumberDialog 
          open={dialogOpen} 
          onOpenChange={setDialogOpen}
        />
      </div>
    </div>
  );
};

export default Numbers;
