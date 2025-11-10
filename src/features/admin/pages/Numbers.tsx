import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, AlertCircle } from "lucide-react";
import { PhoneNumberList } from "@/components/numbers/PhoneNumberList";
import { PhoneNumberDialog } from "@/components/numbers/PhoneNumberDialog";
import { SyncTwilioButton } from "@/components/numbers/SyncTwilioButton";
import { SyncVonageButton } from "@/components/numbers/SyncVonageButton";
import { OrphanedNumbersDialog } from "@/components/numbers/OrphanedNumbersDialog";
import { useDeletePhoneNumber } from "@/hooks/use-phone-numbers";
import { useProviderCredentials } from "@/hooks/use-provider-credentials";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

interface OrphanedNumber {
  id: string;
  phone_number: string;
  friendly_name: string | null;
  provider: string;
}

const Numbers = () => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [orphanedDialog, setOrphanedDialog] = useState<{
    open: boolean;
    provider: 'twilio' | 'vonage';
    orphanedNumbers: OrphanedNumber[];
  } | null>(null);
  
  const deleteMutation = useDeletePhoneNumber();
  const { data: credentials = [], isLoading: loadingCredentials } = useProviderCredentials();
  
  const hasCredentials = credentials.length > 0;

  const handleCleanupOrphans = async (selectedIds: string[]) => {
    try {
      for (const numberId of selectedIds) {
        await deleteMutation.mutateAsync(numberId);
      }
      
      toast.success(`${selectedIds.length} número(s) órfão(s) removido(s)!`);
      setOrphanedDialog(null);
    } catch (error) {
      toast.error('Erro ao remover números órfãos');
    }
  };

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
          
          <div className="flex flex-wrap gap-2">
            <SyncTwilioButton 
              onOrphansDetected={(orphaned) => {
                setOrphanedDialog({
                  open: true,
                  provider: 'twilio',
                  orphanedNumbers: orphaned,
                });
              }}
            />
            <SyncVonageButton 
              onOrphansDetected={(orphaned) => {
                setOrphanedDialog({
                  open: true,
                  provider: 'vonage',
                  orphanedNumbers: orphaned,
                });
              }}
            />
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Número
            </Button>
          </div>
        </div>

        {!loadingCredentials && !hasCredentials && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Credenciais não configuradas</AlertTitle>
            <AlertDescription>
              É necessário configurar credenciais do Twilio ou Vonage antes de adicionar ou sincronizar números.
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/credentials')}
                className="mt-2"
              >
                Ir para Credenciais
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <PhoneNumberList />
        
        <PhoneNumberDialog 
          open={dialogOpen} 
          onOpenChange={setDialogOpen}
        />

        {orphanedDialog && (
          <OrphanedNumbersDialog
            open={orphanedDialog.open}
            onOpenChange={(open) => !open && setOrphanedDialog(null)}
            provider={orphanedDialog.provider}
            orphanedNumbers={orphanedDialog.orphanedNumbers}
            onCleanup={handleCleanupOrphans}
            isLoading={deleteMutation.isPending}
          />
        )}
      </div>
    </div>
  );
};

export default Numbers;
