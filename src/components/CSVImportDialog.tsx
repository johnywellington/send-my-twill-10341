import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CSVImportDialogProps {
  onImport: (numbers: string[]) => void;
  currentCount: number;
  maxCount: number;
}

export function CSVImportDialog({ onImport, currentCount, maxCount }: CSVImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewNumbers, setPreviewNumbers] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);

  const parseCSV = (text: string): string[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    
    // Detectar delimitador
    const firstLine = lines[0] || "";
    const delimiters = [',', ';', '\t', '|'];
    const delimiter = delimiters.find(d => firstLine.includes(d)) || ',';
    
    const numbers: string[] = [];
    const foundErrors: string[] = [];
    
    // Verificar se primeira linha é cabeçalho
    const hasHeader = /telefone|phone|numero|número|celular|mobile|contact/i.test(firstLine);
    const startIndex = hasHeader ? 1 : 0;
    
    // Encontrar índice da coluna de telefone
    let phoneColumnIndex = 0;
    if (hasHeader) {
      const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase());
      const phoneHeaders = ['telefone', 'phone', 'numero', 'número', 'celular', 'mobile', 'contact'];
      phoneColumnIndex = headers.findIndex(h => phoneHeaders.some(ph => h.includes(ph)));
      if (phoneColumnIndex === -1) phoneColumnIndex = 0;
    }
    
    // Processar linhas
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const columns = line.split(delimiter);
      let phoneValue = columns[phoneColumnIndex] || columns[0] || "";
      
      // Limpar formatação
      phoneValue = phoneValue
        .replace(/["\s()\-]/g, '') // Remove aspas, espaços, parênteses, hífens
        .replace(/^\+/, ''); // Remove + do início
      
      // Validar formato
      if (/^\d{10,15}$/.test(phoneValue)) {
        if (!numbers.includes(phoneValue)) {
          numbers.push(phoneValue);
        }
      } else if (phoneValue) {
        foundErrors.push(`Linha ${i + 1}: "${phoneValue}" não é um número válido`);
      }
    }
    
    setErrors(foundErrors);
    return numbers;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    // Validar tipo de arquivo
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error("Por favor, selecione um arquivo CSV");
      return;
    }
    
    setFile(selectedFile);
    setParsing(true);
    setPreviewNumbers([]);
    setErrors([]);
    
    try {
      const text = await selectedFile.text();
      const numbers = parseCSV(text);
      setPreviewNumbers(numbers);
      
      if (numbers.length === 0) {
        toast.error("Nenhum número válido encontrado no arquivo");
      } else {
        toast.success(`${numbers.length} números válidos encontrados`);
      }
    } catch (error) {
      toast.error("Erro ao ler arquivo CSV");
      console.error(error);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = () => {
    const available = maxCount - currentCount;
    
    if (previewNumbers.length === 0) {
      toast.error("Nenhum número para importar");
      return;
    }
    
    if (available <= 0) {
      toast.error(`Limite de ${maxCount} números já atingido`);
      return;
    }
    
    const toImport = previewNumbers.slice(0, available);
    onImport(toImport);
    
    if (toImport.length < previewNumbers.length) {
      toast.warning(
        `Importados ${toImport.length} de ${previewNumbers.length} números (limite: ${maxCount})`
      );
    } else {
      toast.success(`✅ ${toImport.length} números importados com sucesso!`);
    }
    
    // Reset e fechar
    setOpen(false);
    setFile(null);
    setPreviewNumbers([]);
    setErrors([]);
  };

  const resetDialog = () => {
    setFile(null);
    setPreviewNumbers([]);
    setErrors([]);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-dashed">
          <Upload className="mr-2 h-4 w-4" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Números via CSV</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV contendo números de telefone
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* File Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-center w-full">
              <label htmlFor="csv-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/80 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Clique para fazer upload</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Arquivo CSV (max 5MB)</p>
                </div>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span>{file.name}</span>
                <span className="text-xs">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>

          {/* Status */}
          {parsing && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Processando arquivo...</AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {previewNumbers.length > 0 && (
            <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">
                    {previewNumbers.length} números válidos encontrados
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Disponível: {Math.max(0, maxCount - currentCount)}/{maxCount}
                </span>
              </div>
              
              <ScrollArea className="flex-1 border rounded-lg p-3 bg-muted/50">
                <div className="space-y-1">
                  {previewNumbers.map((number, index) => (
                    <div key={index} className="text-xs font-mono flex items-center gap-2">
                      <span className="text-muted-foreground">{index + 1}.</span>
                      <span>+{number}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-semibold">{errors.length} erro(s) encontrado(s):</p>
                  <ScrollArea className="max-h-24">
                    <ul className="text-xs space-y-1 pl-4 list-disc">
                      {errors.slice(0, 10).map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                      {errors.length > 10 && <li>... e mais {errors.length - 10}</li>}
                    </ul>
                  </ScrollArea>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Info */}
          <div className="text-xs text-muted-foreground space-y-1 border-t pt-3">
            <p className="font-semibold">Formato aceito:</p>
            <ul className="pl-4 space-y-1 list-disc">
              <li>CSV com ou sem cabeçalho</li>
              <li>Números no formato E.164 (351911019866) ou com +</li>
              <li>Delimitadores: vírgula, ponto-vírgula, tab ou pipe</li>
              <li>10-15 dígitos por número</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleImport}
            disabled={previewNumbers.length === 0 || parsing}
          >
            Adicionar {Math.min(previewNumbers.length, maxCount - currentCount)} números
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
