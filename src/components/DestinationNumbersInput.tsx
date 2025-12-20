import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Trash2 } from "lucide-react";
import { CSVImportDialog } from "./CSVImportDialog";
import { LeadListSelector } from "./leads/LeadListSelector";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DestinationNumbersInputProps {
  value: string[];
  onChange: (numbers: string[]) => void;
  maxNumbers?: number;
  label?: string;
  required?: boolean;
  placeholder?: string;
  description?: string;
  className?: string;
}

export function DestinationNumbersInput({
  value,
  onChange,
  maxNumbers = 1000,
  label = "Números de Destino",
  required = true,
  placeholder = "351911019866",
  description = "Use formato internacional completo: +[código país][número] (mínimo 10 dígitos). Ou importe via CSV.",
  className
}: DestinationNumbersInputProps) {
  const [loadedListName, setLoadedListName] = useState<string | null>(null);
  
  const addNumber = () => {
    if (value.length < maxNumbers) {
      onChange([...value, ""]);
    }
  };

  const removeNumber = (index: number) => {
    if (value.length > 1) {
      onChange(value.filter((_, i) => i !== index));
    }
  };

  const updateNumber = (index: number, newValue: string) => {
    const updated = [...value];
    updated[index] = newValue;
    onChange(updated);
  };

  const handleCSVImport = (importedNumbers: string[]) => {
    // Limitar ao máximo permitido
    const available = maxNumbers - value.filter(n => n.trim()).length;
    const toAdd = importedNumbers.slice(0, available);
    
    // Adicionar aos números existentes (substituindo vazios primeiro)
    const newNumbers = [...value];
    let emptyIndex = newNumbers.findIndex(n => !n.trim());
    
    toAdd.forEach(num => {
      if (emptyIndex >= 0 && emptyIndex < newNumbers.length) {
        newNumbers[emptyIndex] = num;
        emptyIndex = newNumbers.findIndex((n, i) => i > emptyIndex && !n.trim());
      } else {
        newNumbers.push(num);
      }
    });
    
    onChange(newNumbers.slice(0, maxNumbers));
  };

  const handleLeadListSelect = (numbers: string[], listName: string) => {
    onChange(numbers);
    setLoadedListName(listName);
    toast.success(`${numbers.length} números carregados`, {
      description: `Lista: ${listName}`
    });
  };

  const clearLoadedList = () => {
    setLoadedListName(null);
    onChange([""]);
  };

  const clearAllNumbers = () => {
    setLoadedListName(null);
    onChange([""]);
  };

  const filledCount = value.filter(n => n.trim()).length;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">{filledCount} de {maxNumbers}</span>
          {filledCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAllNumbers}
              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Limpar Todos
            </Button>
          )}
        </div>
      </div>
      
      <div className="space-y-3">
        {value.map((number, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <Input
                type="tel"
                placeholder={`Ex: +${placeholder} ou +5511999999999`}
                value={number}
                onChange={(e) => updateNumber(index, e.target.value)}
                required={required && index === 0}
                className="h-11 transition-all duration-200 hover:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            
            {value.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeNumber(index)}
                className="h-11 w-11 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {value.length < maxNumbers && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addNumber}
            className="flex-1 border-dashed"
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Número ({filledCount}/{maxNumbers})
          </Button>
        )}
        
        <CSVImportDialog 
          onImport={handleCSVImport}
          currentCount={filledCount}
          maxCount={maxNumbers}
        />
        
        <LeadListSelector onSelect={handleLeadListSelect} />
      </div>
      
      {loadedListName && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            📋 {loadedListName}
            <button
              type="button"
              onClick={clearLoadedList}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        </div>
      )}
      
      {description && (
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
