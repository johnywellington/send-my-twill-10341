import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface RequestViewerProps {
  title: string;
  data: any;
}

export const RequestViewer = ({ title, data }: RequestViewerProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleCopy = () => {
    const jsonString = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(jsonString);
    toast({
      title: "Copiado!",
      description: "JSON copiado para a área de transferência",
    });
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
        <span className="text-sm font-medium">{title}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 gap-1"
          >
            <Copy className="w-3 h-3" />
            Copiar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 gap-1"
          >
            {isExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>
      {isExpanded && (
        <pre className="p-3 text-xs overflow-x-auto bg-muted/20 max-h-64 overflow-y-auto">
          <code>{JSON.stringify(data, null, 2)}</code>
        </pre>
      )}
    </div>
  );
};
