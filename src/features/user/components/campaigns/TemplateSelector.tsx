import { useState } from "react";
import { Search, FileText, Star, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useTemplates, type MessageTemplate } from "@/features/user/hooks/use-templates";

interface TemplateSelectorProps {
  selectedTemplateId: string | null;
  customMessage: string;
  onSelectTemplate: (template: MessageTemplate | null) => void;
  onCustomMessageChange: (message: string) => void;
}

export function TemplateSelector({
  selectedTemplateId,
  customMessage,
  onSelectTemplate,
  onCustomMessageChange,
}: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [mode, setMode] = useState<"template" | "custom">(
    selectedTemplateId ? "template" : customMessage ? "custom" : "template"
  );
  
  const { data: templates, isLoading } = useTemplates("sms");

  const filteredTemplates = templates?.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleModeChange = (value: string) => {
    setMode(value as "template" | "custom");
    if (value === "custom") {
      onSelectTemplate(null);
    } else {
      onCustomMessageChange("");
    }
  };

  const handleSelectTemplate = (template: MessageTemplate) => {
    onSelectTemplate(template);
    onCustomMessageChange(template.content);
  };

  return (
    <div className="space-y-4">
      <RadioGroup value={mode} onValueChange={handleModeChange} className="flex gap-4">
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="template" id="mode-template" />
          <Label htmlFor="mode-template" className="cursor-pointer">
            Usar Template Salvo
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="custom" id="mode-custom" />
          <Label htmlFor="mode-custom" className="cursor-pointer">
            Escrever Nova Mensagem
          </Label>
        </div>
      </RadioGroup>

      {mode === "template" ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando templates...
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                {templates?.length === 0
                  ? "Nenhum template SMS encontrado."
                  : "Nenhum template corresponde à busca."}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione "Escrever Nova Mensagem" para criar uma mensagem personalizada.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-2">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all",
                      selectedTemplateId === template.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">{template.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {template.is_favorite && (
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        )}
                        {template.usage_count > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {template.usage_count}x
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                      {template.content}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="customMessage">Mensagem</Label>
          <Textarea
            id="customMessage"
            placeholder="Digite a mensagem da campanha..."
            value={customMessage}
            onChange={(e) => onCustomMessageChange(e.target.value)}
            rows={5}
            className="resize-none"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Use {"{{nome}}"} para personalizar com o nome do contato</span>
            <span className={customMessage.length > 160 ? "text-destructive" : ""}>
              {customMessage.length}/160
            </span>
          </div>
        </div>
      )}

      {/* Preview */}
      {customMessage && (
        <div className="p-3 rounded-lg bg-muted/50 border">
          <p className="text-xs font-medium text-muted-foreground mb-1">Prévia:</p>
          <p className="text-sm">{customMessage}</p>
        </div>
      )}
    </div>
  );
}
