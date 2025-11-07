import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Save, Info } from "lucide-react";
import { useCreatePhoneNumber, useUpdatePhoneNumber, type PhoneNumber } from "@/hooks/use-phone-numbers";

interface PhoneNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPhone?: PhoneNumber | null;
  onSuccess?: (phone: PhoneNumber) => void;
}

export const PhoneNumberDialog = ({ open, onOpenChange, editingPhone, onSuccess }: PhoneNumberDialogProps) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [friendlyName, setFriendlyName] = useState("");
  const [countryCode, setCountryCode] = useState("UK");
  const [provider, setProvider] = useState<'vonage' | 'twilio'>('vonage');
  const [supportsSms, setSupportsSms] = useState(true);
  const [supportsVoice, setSupportsVoice] = useState(true);
  const [supportsMms, setSupportsMms] = useState(false);
  const [notes, setNotes] = useState("");

  const createMutation = useCreatePhoneNumber();
  const updateMutation = useUpdatePhoneNumber();

  useEffect(() => {
    if (editingPhone) {
      setPhoneNumber(editingPhone.phone_number);
      setFriendlyName(editingPhone.friendly_name || "");
      setCountryCode(editingPhone.country_code);
      setProvider(editingPhone.provider);
      setSupportsSms(editingPhone.supports_sms);
      setSupportsVoice(editingPhone.supports_voice);
      setSupportsMms(editingPhone.supports_mms);
      setNotes(editingPhone.notes || "");
    } else {
      setPhoneNumber("");
      setFriendlyName("");
      setCountryCode("UK");
      setProvider('vonage');
      setSupportsSms(true);
      setSupportsVoice(true);
      setSupportsMms(false);
      setNotes("");
    }
  }, [editingPhone, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const phoneData = {
      phone_number: phoneNumber,
      friendly_name: friendlyName || null,
      country_code: countryCode,
      provider,
      supports_sms: supportsSms,
      supports_voice: supportsVoice,
      supports_mms: supportsMms,
      is_active: true,
      is_verified: false,
      webhook_configured: false,
      notes: notes || null,
    };

    if (editingPhone) {
      const updated = await updateMutation.mutateAsync({
        id: editingPhone.id,
        updates: phoneData,
      });
      if (onSuccess && updated) {
        onSuccess(updated as PhoneNumber);
      }
    } else {
      const created = await createMutation.mutateAsync(phoneData);
      if (onSuccess && created) {
        onSuccess(created as PhoneNumber);
      }
    }

    onOpenChange(false);
  };

  const loading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingPhone ? 'Editar Número' : 'Adicionar Número'}
          </DialogTitle>
          <DialogDescription>
            Configure um número virtual para enviar/receber SMS e chamadas
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Provider</Label>
            <Select value={provider} onValueChange={(value) => setProvider(value as 'vonage' | 'twilio')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vonage">
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Vonage</Badge>
                  </div>
                </SelectItem>
                <SelectItem value="twilio">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Twilio</Badge>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Código do País</Label>
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UK">🇬🇧 UK (+44)</SelectItem>
                  <SelectItem value="US">🇺🇸 US (+1)</SelectItem>
                  <SelectItem value="BR">🇧🇷 BR (+55)</SelectItem>
                  <SelectItem value="PT">🇵🇹 PT (+351)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Número de Telefone</Label>
              <Input 
                placeholder="447418373592"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formato: sem espaços ou caracteres especiais
              </p>
            </div>
          </div>

          <div>
            <Label>Nome (Opcional)</Label>
            <Input 
              placeholder="Ex: Número Principal UK"
              value={friendlyName}
              onChange={(e) => setFriendlyName(e.target.value)}
            />
          </div>

          <div>
            <Label>Capacidades</Label>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="supports_sms" 
                  checked={supportsSms}
                  onCheckedChange={(checked) => setSupportsSms(checked as boolean)}
                />
                <Label htmlFor="supports_sms" className="cursor-pointer">📱 SMS</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="supports_voice" 
                  checked={supportsVoice}
                  onCheckedChange={(checked) => setSupportsVoice(checked as boolean)}
                />
                <Label htmlFor="supports_voice" className="cursor-pointer">📞 Voice</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="supports_mms" 
                  checked={supportsMms}
                  onCheckedChange={(checked) => setSupportsMms(checked as boolean)}
                />
                <Label htmlFor="supports_mms" className="cursor-pointer">🖼️ MMS</Label>
              </div>
            </div>
          </div>

          <div>
            <Label>Notas (Opcional)</Label>
            <Textarea 
              placeholder="Informações adicionais sobre este número..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Próximo Passo</AlertTitle>
            <AlertDescription>
              Após salvar, você verá as URLs de webhook que precisa configurar no 
              {provider === 'vonage' ? ' Vonage Dashboard' : ' Twilio Console'}.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" />Salvar</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
