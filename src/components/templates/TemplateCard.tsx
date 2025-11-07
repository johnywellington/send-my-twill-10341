import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageTemplate } from '@/hooks/use-templates';
import { FileText, Copy, Edit, Trash2, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TemplateCardProps {
  template: MessageTemplate;
  onUse: (template: MessageTemplate) => void;
  onEdit: (template: MessageTemplate) => void;
  onDuplicate: (template: MessageTemplate) => void;
  onDelete: (id: string) => void;
}

export const TemplateCard = ({ 
  template, 
  onUse, 
  onEdit, 
  onDuplicate, 
  onDelete 
}: TemplateCardProps) => {
  const typeColors = {
    sms: 'bg-blue-500',
    voice: 'bg-green-500',
    ura: 'bg-purple-500'
  };

  const typeLabels = {
    sms: 'SMS',
    voice: 'Voice',
    ura: 'URA'
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">{template.name}</h3>
            {template.is_favorite && (
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            )}
          </div>
          <Badge className={typeColors[template.type]}>
            {typeLabels[template.type]}
          </Badge>
        </div>

        {template.category && (
          <Badge variant="outline" className="mb-2">
            {template.category}
          </Badge>
        )}

        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {template.content}
        </p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            Usado {template.usage_count} {template.usage_count === 1 ? 'vez' : 'vezes'}
          </span>
          <span>
            {formatDistanceToNow(new Date(template.updated_at), { 
              addSuffix: true,
              locale: ptBR 
            })}
          </span>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 pt-0">
        <Button 
          onClick={() => onUse(template)} 
          size="sm" 
          className="flex-1"
        >
          Usar
        </Button>
        <Button 
          onClick={() => onEdit(template)} 
          size="sm" 
          variant="outline"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button 
          onClick={() => onDuplicate(template)} 
          size="sm" 
          variant="outline"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button 
          onClick={() => onDelete(template.id)} 
          size="sm" 
          variant="outline"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};
