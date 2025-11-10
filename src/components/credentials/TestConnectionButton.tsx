import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Wifi } from "lucide-react";
import { useTestCredentialConnection } from "@/hooks/use-test-credential-connection";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TestConnectionButtonProps {
  credentialId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export function TestConnectionButton({ 
  credentialId, 
  variant = "outline",
  size = "sm",
  showLabel = true 
}: TestConnectionButtonProps) {
  const { mutate: testConnection, isPending, isSuccess, isError } = useTestCredentialConnection();

  const handleTest = () => {
    testConnection({ credentialId });
  };

  const getIcon = () => {
    if (isPending) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (isSuccess) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (isError) return <XCircle className="h-4 w-4 text-destructive" />;
    return <Wifi className="h-4 w-4" />;
  };

  const getLabel = () => {
    if (isPending) return "Testando...";
    if (isSuccess) return "Conectado";
    if (isError) return "Falhou";
    return "Testar Conexão";
  };

  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={handleTest}
      disabled={isPending}
      className="gap-2"
    >
      {getIcon()}
      {showLabel && <span className="text-xs">{getLabel()}</span>}
    </Button>
  );

  if (!showLabel) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent>
            <p>{getLabel()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}
