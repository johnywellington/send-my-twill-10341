import { useState, useCallback } from "react";
import { Users, Loader2, Trash2, Save, Ban, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { LeadUploadZone } from "@/components/leads/LeadUploadZone";
import { LeadReviewCard } from "@/components/leads/LeadReviewCard";
import { RecurringDetailsModal } from "@/components/leads/RecurringDetailsModal";

import { extractNumbersFromCSV, sanitizeNumbers, SanitizedNumber } from "@/shared/lib/phone-sanitizer";
import { useVerifyRecurring, RecurringInfo } from "@/shared/hooks/use-verify-recurring";
import { useLeadLists, useCreateLeadList, useDeleteLeadList } from "@/shared/hooks/use-lead-lists";

export default function Leads() {
  const [listName, setListName] = useState("");
  const [listDescription, setListDescription] = useState("");
  const [processedNumbers, setProcessedNumbers] = useState<SanitizedNumber[]>([]);
  const [cleanNumbers, setCleanNumbers] = useState<string[]>([]);
  const [recurringNumbers, setRecurringNumbers] = useState<RecurringInfo[]>([]);
  const [duplicatesRemoved, setDuplicatesRemoved] = useState(0);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: leadLists, isLoading: loadingLists } = useLeadLists();
  const createLeadList = useCreateLeadList();
  const deleteLeadList = useDeleteLeadList();
  const verifyRecurring = useVerifyRecurring();

  const handleFileLoad = useCallback(async (content: string, fileName: string) => {
    setIsProcessing(true);
    try {
      // Extrair números do CSV
      const rawNumbers = extractNumbersFromCSV(content);
      if (rawNumbers.length === 0) {
        toast.error("Nenhum número encontrado no arquivo");
        setIsProcessing(false);
        return;
      }

      // Sanitizar números (formato Portugal)
      const sanitizeResult = sanitizeNumbers(rawNumbers);
      setProcessedNumbers(sanitizeResult.numbers);
      setDuplicatesRemoved(sanitizeResult.duplicatesRemoved);

      // Verificar recorrentes no banco
      const validNumbers = sanitizeResult.numbers
        .filter(n => n.isValid)
        .map(n => n.sanitized);

      const verifyResult = await verifyRecurring.mutateAsync(validNumbers);
      setCleanNumbers(verifyResult.cleanNumbers);
      setRecurringNumbers(verifyResult.recurringNumbers);

      // Auto-preencher nome da lista
      if (!listName) {
        const baseName = fileName.replace(/\.csv$/i, "");
        setListName(baseName);
      }

      toast.success(`${validNumbers.length} números processados`);
    } catch (error: any) {
      toast.error("Erro ao processar arquivo", { description: error.message });
    } finally {
      setIsProcessing(false);
    }
  }, [listName, verifyRecurring]);

  const handleSaveList = async (includeRecurring: boolean) => {
    if (!listName.trim()) {
      toast.error("Digite um nome para a lista");
      return;
    }

    const numbersToSave = includeRecurring
      ? [...cleanNumbers, ...recurringNumbers.map(r => r.phone_number)]
      : cleanNumbers;

    if (numbersToSave.length === 0) {
      toast.error("Nenhum número para salvar");
      return;
    }

    const contacts = numbersToSave.map(phone => {
      const recurring = recurringNumbers.find(r => r.phone_number === phone);
      return {
        phone_number: phone,
        is_recurring: !!recurring,
        last_campaign_name: recurring?.last_campaign_name || undefined,
        last_campaign_date: recurring?.last_campaign_date || undefined,
      };
    });

    await createLeadList.mutateAsync({
      name: listName,
      description: listDescription || undefined,
      contacts,
    });

    // Limpar estado
    setListName("");
    setListDescription("");
    setProcessedNumbers([]);
    setCleanNumbers([]);
    setRecurringNumbers([]);
    setDuplicatesRemoved(0);
  };

  const totalProcessed = processedNumbers.filter(n => n.isValid).length;
  const invalidCount = processedNumbers.filter(n => !n.isValid).length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Gestão de Leads
          </h1>
          <p className="text-muted-foreground mt-1">
            Importe e gerencie listas de contatos para campanhas SMS
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload e Processamento */}
        <div className="lg:col-span-2 space-y-6">
          {/* Nome da Lista */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Nova Lista de Leads</CardTitle>
              <CardDescription>
                Faça upload de um CSV com números de telefone
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="listName">Nome da Lista *</Label>
                  <Input
                    id="listName"
                    placeholder="Ex: Campanha Natal 2024"
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="listDescription">Descrição (opcional)</Label>
                  <Input
                    id="listDescription"
                    placeholder="Breve descrição..."
                    value={listDescription}
                    onChange={(e) => setListDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Upload Zone */}
              <LeadUploadZone 
                onFileLoad={handleFileLoad} 
                isProcessing={isProcessing} 
              />
            </CardContent>
          </Card>

          {/* Resumo do Processamento */}
          {totalProcessed > 0 && (
            <>
              <LeadReviewCard
                totalProcessed={totalProcessed}
                cleanCount={cleanNumbers.length}
                recurringCount={recurringNumbers.length}
                duplicatesRemoved={duplicatesRemoved}
                invalidCount={invalidCount}
                onViewRecurring={() => setShowRecurringModal(true)}
              />

              {/* Ações */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => handleSaveList(true)}
                      disabled={createLeadList.isPending}
                      className="gap-2"
                    >
                      {createLeadList.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Salvar Todos ({totalProcessed})
                    </Button>

                    {recurringNumbers.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => handleSaveList(false)}
                        disabled={createLeadList.isPending}
                        className="gap-2"
                      >
                        <Ban className="h-4 w-4" />
                        Remover Recorrentes e Salvar ({cleanNumbers.length})
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Preview dos números */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Preview dos Números</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Número Original</TableHead>
                          <TableHead>Formatado</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {processedNumbers.slice(0, 50).map((num, idx) => {
                          const isRecurring = recurringNumbers.some(
                            r => r.phone_number === num.sanitized
                          );
                          return (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-muted-foreground">
                                {num.original}
                              </TableCell>
                              <TableCell className="font-mono">
                                {num.sanitized}
                              </TableCell>
                              <TableCell>
                                {!num.isValid ? (
                                  <Badge variant="destructive">Inválido</Badge>
                                ) : isRecurring ? (
                                  <Badge variant="outline" className="text-amber-600">
                                    Recorrente
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-green-600">
                                    Novo
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {processedNumbers.length > 50 && (
                      <p className="text-center text-sm text-muted-foreground py-2">
                        Mostrando 50 de {processedNumbers.length} números
                      </p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Listas Salvas */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Listas Salvas</CardTitle>
              <CardDescription>
                {leadLists?.length || 0} listas disponíveis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLists ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : !leadLists?.length ? (
                <p className="text-center text-muted-foreground py-4">
                  Nenhuma lista salva ainda
                </p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {leadLists.map((list) => (
                      <Card key={list.id} className="bg-muted/30">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{list.name}</p>
                              {list.description && (
                                <p className="text-sm text-muted-foreground">
                                  {list.description}
                                </p>
                              )}
                              <div className="flex gap-2 mt-2">
                                <Badge variant="secondary">
                                  {list.total_contacts} contatos
                                </Badge>
                                {list.recurring_contacts > 0 && (
                                  <Badge variant="outline" className="text-amber-600">
                                    {list.recurring_contacts} recorr.
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                {format(new Date(list.created_at), "dd/MM/yyyy HH:mm", {
                                  locale: ptBR,
                                })}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteLeadList.mutate(list.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Recorrentes */}
      <RecurringDetailsModal
        open={showRecurringModal}
        onOpenChange={setShowRecurringModal}
        recurringNumbers={recurringNumbers}
      />
    </div>
  );
}
