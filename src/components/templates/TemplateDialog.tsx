import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { extractVariables, validateVariables, replaceVariablesForPreview, TEMPLATE_CATEGORIES } from '@/lib/template-utils';
import { MessageTemplate } from '@/hooks/use-templates';
import { AlertCircle, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (template: any) => void;
  template?: MessageTemplate | null;
  defaultType?: 'sms' | 'voice' | 'ivr';
  defaultContent?: string;
}

export const TemplateDialog = ({ 
  open, 
  onOpenChange, 
  onSave, 
  template,
  defaultType = 'sms',
  defaultContent = ''
}: TemplateDialogProps) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'sms' | 'voice' | 'ivr'>(defaultType);
  const [content, setContent] = useState(defaultContent);
  const [category, setCategory] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const isEditing = !!template;
  const maxChars = type === 'sms' ? 1000 : 5000;
  const variables = extractVariables(content);
  const validation = validateVariables(content);
  const preview = replaceVariablesForPreview(content);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setType(template.type);
      setContent(template.content);
      setCategory(template.category || '');
      setIsFavorite(template.is_favorite);
    } else {
      setContent(defaultContent);
      setType(defaultType);
    }
  }, [template, defaultContent, defaultType]);

  useEffect(() => {
    setErrors(validation.errors);
  }, [content]);

  const handleSave = () => {
    if (!name.trim()) {
      setErrors(['Nome do template é obrigatório']);
      return;
    }
    if (!content.trim()) {
      setErrors(['Conteúdo do template é obrigatório']);
      return;
    }
    if (!validation.valid) {
      return;
    }

    onSave({
      ...(isEditing && { id: template.id }),
      name: name.trim(),
      type,
      content: content.trim(),
      variables,
      category: category || null,
      is_favorite: isFavorite
    });

    handleClose();
  };

  const handleClose = () => {
    setName('');
    setType('sms');
    setContent('');
    setCategory('');
    setIsFavorite(false);
    setErrors([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Template' : 'Novo Template'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome */}
          <div>
            <Label htmlFor="name">Nome do Template *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Lembrete de Consulta"
              maxLength={100}
            />
          </div>

          {/* Tipo */}
          <div>
            <Label>Tipo *</Label>
            <RadioGroup 
              value={type} 
              onValueChange={(v) => setType(v as any)}
              disabled={isEditing}
              className="flex gap-4 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sms" id="sms" />
                <Label htmlFor="sms" className="cursor-pointer">SMS</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="voice" id="voice" />
                <Label htmlFor="voice" className="cursor-pointer">Voice</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ivr" id="ivr" />
                <Label htmlFor="ivr" className="cursor-pointer">IVR</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Categoria */}
          <div>
            <Label htmlFor="category">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar categoria..." />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conteúdo */}
          <div>
            <Label htmlFor="content">Mensagem *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Use {{variavel}} para campos dinâmicos. Ex: Olá {{nome}}, sua consulta é às {{hora}}."
              className="min-h-[120px]"
              maxLength={maxChars}
            />
            <div className="flex justify-between text-sm text-muted-foreground mt-1">
              <span>Variáveis: nome, telefone, email, data, hora</span>
              <span>{content.length}/{maxChars}</span>
            </div>
          </div>

          {/* Variáveis detectadas */}
          {variables.length > 0 && (
            <div>
              <Label>Variáveis Detectadas</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {variables.map((v) => (
                  <Badge key={v} variant="secondary">
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Erros de validação */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errors.map((error, i) => (
                  <div key={i}>{error}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {content && validation.valid && (
            <div>
              <Label className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Preview (com dados de exemplo)
              </Label>
              <Card className="p-4 mt-2 bg-muted">
                <p className="text-sm whitespace-pre-wrap">{preview}</p>
              </Card>
            </div>
          )}

          {/* Favorito */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="favorite"
              checked={isFavorite}
              onCheckedChange={(checked) => setIsFavorite(checked as boolean)}
            />
            <Label htmlFor="favorite" className="cursor-pointer">
              ⭐ Marcar como favorito
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!name.trim() || !content.trim() || !validation.valid}
          >
            {isEditing ? 'Salvar Alterações' : 'Criar Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
