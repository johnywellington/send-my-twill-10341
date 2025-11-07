import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProvider } from "@/contexts/ProviderContext";
import { Loader2, Radio } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ProviderSelector() {
  const { provider, setProvider, isLoading } = useProvider();

  const handleProviderChange = (newProvider: 'twilio' | 'vonage') => {
    if (newProvider === provider) return;
    
    setProvider(newProvider);
    toast.success(`Provedor alterado para ${newProvider === 'twilio' ? 'Twilio' : 'Vonage'}`, {
      description: 'Todas as APIs agora usarão este provedor',
      duration: 3000,
    });
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card/50">
      <Radio className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs font-medium text-muted-foreground">API:</span>
      
      <div className="flex gap-1">
        <Button
          size="sm"
          variant={provider === 'twilio' ? 'default' : 'ghost'}
          onClick={() => handleProviderChange('twilio')}
          disabled={isLoading}
          className={cn(
            "h-7 px-3 text-xs font-medium transition-all",
            provider === 'twilio' && "bg-primary text-primary-foreground"
          )}
        >
          {isLoading && provider === 'twilio' ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : null}
          Twilio
        </Button>
        
        <Button
          size="sm"
          variant={provider === 'vonage' ? 'default' : 'ghost'}
          onClick={() => handleProviderChange('vonage')}
          disabled={isLoading}
          className={cn(
            "h-7 px-3 text-xs font-medium transition-all",
            provider === 'vonage' && "bg-primary text-primary-foreground"
          )}
        >
          {isLoading && provider === 'vonage' ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : null}
          Vonage
        </Button>
      </div>
      
      <Badge 
        variant="outline" 
        className={cn(
          "ml-1 text-[10px] px-1.5 py-0",
          provider === 'twilio' ? "border-blue-500 text-blue-500" : "border-green-500 text-green-500"
        )}
      >
        ATIVO
      </Badge>
    </div>
  );
}
