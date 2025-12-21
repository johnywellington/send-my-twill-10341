import { useMemo } from "react";
import { MessageSquare, Eye } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { replaceVariablesForPreview, extractVariables } from "@/shared/lib/template-utils";

interface MessageEditorWithPreviewProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

export function MessageEditorWithPreview({
  value,
  onChange,
  rows = 4,
}: MessageEditorWithPreviewProps) {
  const charCount = value.length;
  const smsCount = Math.ceil(charCount / 160) || 1;
  const detectedVariables = useMemo(() => extractVariables(value), [value]);
  const messagePreview = useMemo(() => replaceVariablesForPreview(value), [value]);

  // Color indicator based on SMS count
  const getCharCountColor = () => {
    if (charCount === 0) return "text-muted-foreground";
    if (charCount <= 160) return "text-green-600 dark:text-green-400";
    if (charCount <= 320) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="space-y-3">
      {/* Message Input */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Mensagem
        </Label>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Digite a mensagem..."
          rows={rows}
          className="resize-none"
        />
        
        {/* Character Counter & Variables */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className={getCharCountColor()}>
              {charCount}/160 caracteres
            </span>
            <Badge 
              variant={smsCount > 2 ? "destructive" : smsCount > 1 ? "secondary" : "outline"}
              className="text-xs"
            >
              {smsCount} SMS
            </Badge>
          </div>
          
          {detectedVariables.length > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <span>Variáveis:</span>
              {detectedVariables.map((v) => (
                <Badge key={v} variant="outline" className="text-xs font-mono">
                  {`{{${v}}}`}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      {value.trim() && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-muted-foreground">
            <Eye className="h-4 w-4" />
            Preview
          </Label>
          <div className="p-3 rounded-lg bg-muted/50 border text-sm whitespace-pre-wrap">
            {messagePreview}
          </div>
        </div>
      )}
    </div>
  );
}
