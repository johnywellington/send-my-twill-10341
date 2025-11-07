import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, Settings, Star, MoreVertical, Plus } from "lucide-react";
import { useSIPConfig } from "@/hooks/use-sip-config";

export function ConfigContent() {
  const { 
    configs, 
    isLoading, 
    hasTwilioConfigs,
    hasVonageConfigs,
    createDomain, 
    deleteDomain, 
    setAsDefault, 
    toggleActive,
    isCreating,
  } = useSIPConfig();
  
  const [twilioDialogOpen, setTwilioDialogOpen] = useState(false);
  const [vonageDialogOpen, setVonageDialogOpen] = useState(false);
  
  const [twilioFriendlyName, setTwilioFriendlyName] = useState('');
  const [twilioDisplayName, setTwilioDisplayName] = useState('');
  const [twilioDomainName, setTwilioDomainName] = useState('');
  
  const [vonageAppName, setVonageAppName] = useState('');
  const [vonageDisplayName, setVonageDisplayName] = useState('');

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const baseUrl = `https://${projectId}.supabase.co/functions/v1`;

  const handleCreateTwilio = () => {
    createDomain({
      provider: 'twilio',
      setAsDefault: !hasTwilioConfigs,
      twilioConfig: {
        friendlyName: twilioFriendlyName,
        domainName: twilioDomainName,
        displayName: twilioDisplayName || twilioFriendlyName,
      },
    });
    setTwilioDialogOpen(false);
    setTwilioFriendlyName('');
    setTwilioDisplayName('');
    setTwilioDomainName('');
  };

  const handleCreateVonage = () => {
    createDomain({
      provider: 'vonage',
      setAsDefault: !hasVonageConfigs,
      vonageConfig: {
        name: vonageAppName,
        displayName: vonageDisplayName || vonageAppName,
        answerUrl: `${baseUrl}/ivr-webhook-v2`,
        eventUrl: `${baseUrl}/ivr-webhook-v2-events`,
      },
    });
    setVonageDialogOpen(false);
    setVonageAppName('');
    setVonageDisplayName('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Twilio Domains Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Twilio SIP Domains
              </CardTitle>
              <CardDescription>Gerencie múltiplos domínios SIP Twilio</CardDescription>
            </div>
            <Button onClick={() => setTwilioDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Novo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {configs?.twilio && configs.twilio.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Domínio</TableHead>
                  <TableHead>SID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.twilio.map((domain) => (
                  <TableRow key={domain.domain_group_id}>
                    <TableCell className="font-medium">
                      {domain.is_default && <Star className="inline h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />}
                      {domain.friendly_name}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{domain.sip_domain}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {domain.sip_domain_sid}
                    </TableCell>
                    <TableCell>
                      <Badge variant={domain.is_active ? "default" : "secondary"}>
                        {domain.is_active ? '🟢 Ativo' : '🔴 Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!domain.is_default && (
                            <DropdownMenuItem 
                              onClick={() => setAsDefault({ 
                                provider: 'twilio', 
                                domainGroupId: domain.domain_group_id 
                              })}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Definir como Padrão
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => toggleActive({ 
                              domainGroupId: domain.domain_group_id,
                              isActive: domain.is_active 
                            })}
                          >
                            {domain.is_active ? '🔴 Desativar' : '🟢 Ativar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => {
                              if (confirm('Tem certeza que deseja deletar este domínio?')) {
                                deleteDomain(domain.domain_group_id);
                              }
                            }}
                          >
                            🗑️ Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum domínio Twilio configurado
            </p>
          )}
        </CardContent>
      </Card>

      {/* Vonage Applications Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Vonage SIP Applications
              </CardTitle>
              <CardDescription>Gerencie múltiplas aplicações SIP Vonage</CardDescription>
            </div>
            <Button onClick={() => setVonageDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Novo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {configs?.vonage && configs.vonage.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>App ID</TableHead>
                  <TableHead>App Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.vonage.map((app) => (
                  <TableRow key={app.domain_group_id}>
                    <TableCell className="font-medium">
                      {app.is_default && <Star className="inline h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />}
                      {app.friendly_name}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{app.app_id}</TableCell>
                    <TableCell className="font-mono text-sm">{app.app_name}</TableCell>
                    <TableCell>
                      <Badge variant={app.is_active ? "default" : "secondary"}>
                        {app.is_active ? '🟢 Ativo' : '🔴 Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!app.is_default && (
                            <DropdownMenuItem 
                              onClick={() => setAsDefault({ 
                                provider: 'vonage', 
                                domainGroupId: app.domain_group_id 
                              })}
                            >
                              <Star className="h-4 w-4 mr-2" />
                              Definir como Padrão
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => toggleActive({ 
                              domainGroupId: app.domain_group_id,
                              isActive: app.is_active 
                            })}
                          >
                            {app.is_active ? '🔴 Desativar' : '🟢 Ativar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => {
                              if (confirm('Tem certeza que deseja deletar esta aplicação?')) {
                                deleteDomain(app.domain_group_id);
                              }
                            }}
                          >
                            🗑️ Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma aplicação Vonage configurada
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog para criar Twilio */}
      <Dialog open={twilioDialogOpen} onOpenChange={setTwilioDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Domínio Twilio</DialogTitle>
            <DialogDescription>
              Configure um novo domínio SIP no Twilio
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="twilio-display">Nome de Exibição</Label>
              <Input
                id="twilio-display"
                value={twilioDisplayName}
                onChange={(e) => setTwilioDisplayName(e.target.value)}
                placeholder="Ex: Domínio Principal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twilio-friendly">Friendly Name (Twilio)</Label>
              <Input
                id="twilio-friendly"
                value={twilioFriendlyName}
                onChange={(e) => setTwilioFriendlyName(e.target.value)}
                placeholder="Ex: Main SIP Domain"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twilio-domain">Domain Name</Label>
              <Input
                id="twilio-domain"
                value={twilioDomainName}
                onChange={(e) => setTwilioDomainName(e.target.value)}
                placeholder="Ex: company.sip.twilio.com"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setTwilioDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateTwilio} 
                disabled={!twilioFriendlyName || !twilioDomainName || isCreating}
              >
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Domínio
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para criar Vonage */}
      <Dialog open={vonageDialogOpen} onOpenChange={setVonageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Nova Aplicação Vonage</DialogTitle>
            <DialogDescription>
              Configure uma nova aplicação SIP no Vonage
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vonage-display">Nome de Exibição</Label>
              <Input
                id="vonage-display"
                value={vonageDisplayName}
                onChange={(e) => setVonageDisplayName(e.target.value)}
                placeholder="Ex: Aplicação Principal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vonage-name">Application Name (Vonage)</Label>
              <Input
                id="vonage-name"
                value={vonageAppName}
                onChange={(e) => setVonageAppName(e.target.value)}
                placeholder="Ex: main-sip-app"
              />
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Answer URL:</strong> {baseUrl}/ivr-webhook-v2</p>
              <p><strong>Event URL:</strong> {baseUrl}/ivr-webhook-v2-events</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setVonageDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateVonage} 
                disabled={!vonageAppName || isCreating}
              >
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Aplicação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}