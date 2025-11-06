import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { parseCSV, CSVContact } from "@/lib/csv-parser";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ImportCSVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  groups?: Array<{ id: string; name: string }>;
}

export function ImportCSVDialog({ open, onOpenChange, onSuccess, groups = [] }: ImportCSVDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<CSVContact[]>([]);
  const [errors, setErrors] = useState<Array<{ row: number; error: string }>>([]);
  const [progress, setProgress] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState<string>("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "Tamanho máximo: 5MB",
        variant: "destructive"
      });
      return;
    }

    setFile(selectedFile);
    
    try {
      const result = await parseCSV(selectedFile);
      setPreview(result.contacts.slice(0, 5));
      setErrors(result.errors);
    } catch (error: any) {
      toast({
        title: "Erro ao processar CSV",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const result = await parseCSV(file);
      const total = result.contacts.length;
      let imported = 0;
      let failed = 0;

      for (let i = 0; i < result.contacts.length; i++) {
        const contact = result.contacts[i];
        
        const { data: inserted, error } = await supabase
          .from("contacts")
          .insert({
            ...contact,
            user_id: user.id
          })
          .select()
          .single();

        if (error) {
          failed++;
        } else {
          imported++;
          
          // Add to group if selected
          if (selectedGroup && inserted) {
            await supabase
              .from("contact_group_members")
              .insert({
                group_id: selectedGroup,
                contact_id: inserted.id
              });
          }
        }

        setProgress(((i + 1) / total) * 100);
      }

      toast({
        title: "Importação concluída",
        description: `${imported} contatos importados, ${failed} falharam`
      });

      onSuccess();
      onOpenChange(false);
      resetState();
    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setPreview([]);
    setErrors([]);
    setProgress(0);
    setSelectedGroup("");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetState();
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Contatos via CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="csv-file">Arquivo CSV</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={loading}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Formato: nome,telefone,email,tags
            </p>
          </div>

          {groups.length > 0 && (
            <div>
              <Label htmlFor="group">Adicionar a um grupo (opcional)</Label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertDescription>
                {errors.length} erro(s) encontrado(s). Primeiros erros:
                <ul className="list-disc list-inside mt-2">
                  {errors.slice(0, 3).map((err, i) => (
                    <li key={i}>Linha {err.row}: {err.error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {preview.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Preview (primeiras 5 linhas):</h4>
              <div className="border rounded-md p-2 max-h-48 overflow-auto">
                {preview.map((contact, i) => (
                  <div key={i} className="text-sm py-1 border-b last:border-0">
                    <strong>{contact.name}</strong> - {contact.phone_number}
                    {contact.email && ` - ${contact.email}`}
                    {contact.tags && contact.tags.length > 0 && (
                      <span className="text-muted-foreground"> ({contact.tags.join(", ")})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div>
              <Label>Progresso: {Math.round(progress)}%</Label>
              <Progress value={progress} className="mt-2" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!file || loading}>
            {loading ? "Importando..." : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
