import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChevronDown, Edit, Trash2, Plus, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDeletePhoneNumber, type PhoneNumber } from "@/hooks/use-phone-numbers";
import { PhoneNumberDialog } from "./PhoneNumberDialog";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PhoneNumberSelectorProps {
  value: string;
  onChange: (value: string) => void;
  filterType: 'sms' | 'voice' | 'all';
  label?: string;
  description?: string;
  className?: string;
}

export function PhoneNumberSelector({
  value,
  onChange,
  filterType,
  label = "Número de Origem",
  description,
  className
}: PhoneNumberSelectorProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [editingPhone, setEditingPhone] = useState<PhoneNumber | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const deleteMutation = useDeletePhoneNumber();

  // Query para buscar números ativos
  const { data: phoneNumbers, isLoading } = useQuery({
    queryKey: ['phone-numbers-active', filterType],
    queryFn: async () => {
      let query = supabase
        .from('phone_numbers')
        .select('*')
        .eq('is_active', true);
      
      if (filterType === 'sms') {
        query = query.eq('supports_sms', true);
      } else if (filterType === 'voice') {
        query = query.eq('supports_voice', true);
      }
      
      query = query.order('phone_number');
      
      const { data } = await query;
      return (data || []) as PhoneNumber[];
    }
  });

  const selectedNumber = phoneNumbers?.find(p => p.phone_number === value);

  const handleEdit = (phone: PhoneNumber, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPhone(phone);
    setEditDialogOpen(true);
    setIsOpen(false);
  };

  const handleDeleteClick = (phoneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteId(phoneId);
    setIsOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      const phoneToDelete = phoneNumbers?.find(p => p.id === deleteId);
      
      await deleteMutation.mutateAsync(deleteId);
      
      // Se o número deletado era o selecionado, limpar seleção
      if (phoneToDelete && phoneToDelete.phone_number === value) {
        onChange("");
      }
      
      setDeleteId(null);
    }
  };

  const handleSelect = (phoneNumber: string) => {
    onChange(phoneNumber);
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        <Label>{label}</Label>
        <div className="h-11 rounded-md border border-input bg-muted animate-pulse" />
      </div>
    );
  }

  if (!phoneNumbers || phoneNumbers.length === 0) {
    return (
      <div className={cn("space-y-2", className)}>
        <Label>{label}</Label>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhum número configurado.{' '}
            <Button 
              variant="link" 
              className="p-0 h-auto"
              onClick={() => navigate('/numbers')}
            >
              Adicionar número
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <div className={cn("space-y-2", className)}>
        <Label htmlFor="phone-selector">{label}</Label>
        
        <div className="relative">
          {/* Trigger Button */}
          <button
            type="button"
            id="phone-selector"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm transition-all hover:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:outline-none",
              !value && "text-muted-foreground"
            )}
          >
            {selectedNumber ? (
              <div className="flex items-center gap-2">
                <Badge variant={selectedNumber.provider === 'vonage' ? 'default' : 'secondary'} className="text-xs">
                  {selectedNumber.provider}
                </Badge>
                <span>{selectedNumber.phone_number}</span>
                {selectedNumber.friendly_name && (
                  <span className="text-muted-foreground text-xs">
                    ({selectedNumber.friendly_name})
                  </span>
                )}
              </div>
            ) : (
              <span>Escolha um número</span>
            )}
            <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
          </button>

          {/* Dropdown Content */}
          {isOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg animate-in fade-in-80 slide-in-from-top-2">
                <div className="p-1 max-h-[300px] overflow-y-auto">
                  {phoneNumbers.map((phone) => (
                    <div
                      key={phone.id}
                      onClick={() => handleSelect(phone.phone_number)}
                      className={cn(
                        "relative flex items-center gap-2 rounded-sm px-3 py-2.5 text-sm cursor-pointer transition-colors hover:bg-accent",
                        phone.phone_number === value && "bg-accent"
                      )}
                    >
                      {/* Indicador de seleção */}
                      <div className="w-4 flex-shrink-0">
                        {phone.phone_number === value && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>

                      {/* Conteúdo */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge 
                          variant={phone.provider === 'vonage' ? 'default' : 'secondary'} 
                          className="text-xs flex-shrink-0"
                        >
                          {phone.provider}
                        </Badge>
                        <span className="truncate">{phone.phone_number}</span>
                        {phone.friendly_name && (
                          <span className="text-muted-foreground text-xs truncate">
                            ({phone.friendly_name})
                          </span>
                        )}
                      </div>

                      {/* Botões de ação */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => handleEdit(phone, e)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDeleteClick(phone.id, e)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botão adicionar */}
                <div className="border-t p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setIsOpen(false);
                      setCreateDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar novo número
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Edit Dialog */}
      <PhoneNumberDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingPhone(null);
        }}
        editingPhone={editingPhone}
      />

      {/* Create Dialog */}
      <PhoneNumberDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        editingPhone={null}
        onSuccess={(newPhone) => {
          // Auto-selecionar o número recém-criado
          onChange(newPhone.phone_number);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este número? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
