import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Loader2, Settings, Star, MoreVertical, Plus, Shuffle, Eye, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { useSIPConfig } from "@/hooks/use-sip-config";
import { useDomainValidation } from "@/hooks/use-domain-validation";
import { useOrphanedDomains } from "@/hooks/use-orphaned-domains";
import { generateRandomSipName, generateRandomVonageName } from "@/lib/sip-name-generator";
import { useNavigate } from "react-router-dom";
import { SyncTwilioDomainsButton } from "./SyncTwilioDomainsButton";
import { SyncVonageApplicationsButton } from "./SyncVonageApplicationsButton";
import { EditDomainDialog } from "./EditDomainDialog";
import { DeleteDomainDialog } from "./DeleteDomainDialog";
import { OrphanedDomainsDialog } from "./OrphanedDomainsDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function ConfigContent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { 
    configs, 
    isLoading, 
    hasTwilioConfigs,
    hasVonageConfigs,
    createDomain, 
    deleteDomain, 
    setAsDefault, 
    toggleActive,
    updateDomain,
    isCreating,
    isUpdating,
  } = useSIPConfig();
  
  const { data: orphanedData } = useOrphanedDomains();
  const orphanedIds = orphanedData?.orphanedIds || new Set();
  
  const [twilioDialogOpen, setTwilioDialogOpen] = useState(false);
  const [vonageDialogOpen, setVonageDialogOpen] = useState(false);
  
  const [twilioFriendlyName, setTwilioFriendlyName] = useState('');
  const [twilioDisplayName, setTwilioDisplayName] = useState('');
  const [twilioDomainName, setTwilioDomainName] = useState('');
  
  const [vonageAppName, setVonageAppName] = useState('');
  const [vonageDisplayName, setVonageDisplayName] = useState('');

  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    domainGroupId: string;
    currentName: string;
    provider: 'twilio' | 'vonage';
  } | null>(null);

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    domainGroupId: string;
    domainName: string;
    provider: 'twilio' | 'vonage';
    isDefault: boolean;
  } | null>(null);

  const [orphanedDialog, setOrphanedDialog] = useState<{
    open: boolean;
    provider: 'twilio' | 'vonage';
    orphanedDomains: Array<{
      domain_group_id: string;
      domain_name: string;
      domain_sid?: string;
      friendly_name: string;
    }>;
  } | null>(null);

  const { data: validationData } = useDomainValidation(deleteDialog?.domainGroupId || null);

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

  const handleGenerateRandomTwilio = () => {
    const generated = generateRandomSipName('sip');
    
    createDomain({
      provider: 'twilio',
      setAsDefault: !hasTwilioConfigs,
      twilioConfig: {
        friendlyName: generated.friendlyName,
        domainName: generated.domainName,
        displayName: generated.displayName,
      },
    });
  };

  const handleGenerateRandomVonage = () => {
    const generated = generateRandomVonageName();
    
    createDomain({
      provider: 'vonage',
      setAsDefault: !hasVonageConfigs,
      vonageConfig: {
        name: generated.appName,
        displayName: generated.displayName,
        answerUrl: `${baseUrl}/ivr-webhook-v2`,
        eventUrl: `${baseUrl}/ivr-webhook-v2-events`,
      },
    });
  };

  const handleCleanupOrphans = async (selectedIds: string[]) => {
    try {
      for (const domainGroupId of selectedIds) {
        await deleteDomain(domainGroupId);
      }
      
      // Invalidar cache de órfãos
      queryClient.invalidateQueries({ queryKey: ['orphaned-domains'] });
      
      toast.success(`${selectedIds.length} registro(s) órfão(s) removido(s)!`);
      setOrphanedDialog(null);
    } catch (error) {
      toast.error('Erro ao remover registros órfãos');
    }
  };

  const isOrphan = (domainGroupId: string) => {
    return orphanedIds.has(domainGroupId);
  };

  const getOrphanDetails = (domainGroupId: string) => {
    return orphanedData?.orphanedDomains.find(
      (o) => o.domain_group_id === domainGroupId
    );
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
            <div className="flex gap-2">
              <SyncTwilioDomainsButton 
                onOrphansDetected={(orphaned) => {
                  setOrphanedDialog({
                    open: true,
                    provider: 'twilio',
                    orphanedDomains: orphaned,
                  });
                }}
              />
              <Button
                onClick={handleGenerateRandomTwilio} 
                size="sm" 
                variant="outline"
                disabled={isCreating}
              >
                <Shuffle className="h-4 w-4 mr-2" />
                Gerar Aleatório
              </Button>
              <Button onClick={() => setTwilioDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Novo
              </Button>
            </div>
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
                  <TableHead className="w-[120px]">Ações</TableHead>
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
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={domain.is_active ? "default" : "secondary"}>
                          {domain.is_active ? '🟢 Ativo' : '🔴 Inativo'}
                        </Badge>
                        
                        {isOrphan(domain.domain_group_id) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge 
                                  variant="destructive" 
                                  className="cursor-help animate-pulse"
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Órfão
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <div className="space-y-2">
                                  <p className="font-semibold text-sm">⚠️ Registro Órfão Detectado</p>
                                  <p className="text-xs">
                                    Este domínio foi deletado da Twilio mas ainda existe no banco de dados local.
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Detectado em: {getOrphanDetails(domain.domain_group_id) 
                                      ? new Date(getOrphanDetails(domain.domain_group_id)!.detected_at).toLocaleString('pt-BR')
                                      : 'N/A'
                                    }
                                  </p>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="w-full mt-2"
                                    onClick={() => {
                                      setOrphanedDialog({
                                        open: true,
                                        provider: 'twilio',
                                        orphanedDomains: orphanedData?.orphanedDomains.filter(o => o.provider === 'twilio') || [],
                                      });
                                    }}
                                  >
                                    Revisar e Remover
                                  </Button>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/admin/sip/domain/${domain.domain_group_id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Detalhes
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => setEditDialog({
                                open: true,
                                domainGroupId: domain.domain_group_id,
                                currentName: domain.friendly_name,
                                provider: 'twilio',
                              })}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar Nome
                            </DropdownMenuItem>
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setDeleteDialog({
                                open: true,
                                domainGroupId: domain.domain_group_id,
                                domainName: domain.friendly_name,
                                provider: 'twilio',
                                isDefault: domain.is_default,
                              })}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Deletar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
            <div className="flex gap-2">
              <SyncVonageApplicationsButton 
                onOrphansDetected={(orphaned) => {
                  setOrphanedDialog({
                    open: true,
                    provider: 'vonage',
                    orphanedDomains: orphaned,
                  });
                }}
              />
              <Button
                onClick={handleGenerateRandomVonage} 
                size="sm" 
                variant="outline"
                disabled={isCreating}
              >
                <Shuffle className="h-4 w-4 mr-2" />
                Gerar Aleatório
              </Button>
              <Button onClick={() => setVonageDialogOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Novo
              </Button>
            </div>
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
                  <TableHead className="w-[120px]">Ações</TableHead>
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
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={app.is_active ? "default" : "secondary"}>
                          {app.is_active ? '🟢 Ativo' : '🔴 Inativo'}
                        </Badge>
                        
                        {isOrphan(app.domain_group_id) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge 
                                  variant="destructive" 
                                  className="cursor-help animate-pulse"
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Órfão
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <div className="space-y-2">
                                  <p className="font-semibold text-sm">⚠️ Registro Órfão Detectado</p>
                                  <p className="text-xs">
                                    Esta aplicação foi deletada da Vonage mas ainda existe no banco de dados local.
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Detectado em: {getOrphanDetails(app.domain_group_id) 
                                      ? new Date(getOrphanDetails(app.domain_group_id)!.detected_at).toLocaleString('pt-BR')
                                      : 'N/A'
                                    }
                                  </p>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="w-full mt-2"
                                    onClick={() => {
                                      setOrphanedDialog({
                                        open: true,
                                        provider: 'vonage',
                                        orphanedDomains: orphanedData?.orphanedDomains.filter(o => o.provider === 'vonage') || [],
                                      });
                                    }}
                                  >
                                    Revisar e Remover
                                  </Button>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/admin/sip/domain/${app.domain_group_id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Detalhes
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => setEditDialog({
                                open: true,
                                domainGroupId: app.domain_group_id,
                                currentName: app.friendly_name,
                                provider: 'vonage',
                              })}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar Nome
                            </DropdownMenuItem>
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => setDeleteDialog({
                                open: true,
                                domainGroupId: app.domain_group_id,
                                domainName: app.friendly_name,
                                provider: 'vonage',
                                isDefault: app.is_default,
                              })}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Deletar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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

      {/* Dialog de Edição */}
      {editDialog && (
        <EditDomainDialog
          open={editDialog.open}
          onOpenChange={(open) => !open && setEditDialog(null)}
          domainGroupId={editDialog.domainGroupId}
          currentName={editDialog.currentName}
          provider={editDialog.provider}
          onSave={updateDomain}
          isLoading={isUpdating}
        />
      )}

      {/* Dialog de Deleção */}
      {deleteDialog && (
        <DeleteDomainDialog
          open={deleteDialog.open}
          onOpenChange={(open) => !open && setDeleteDialog(null)}
          domainName={deleteDialog.domainName}
          provider={deleteDialog.provider}
          isDefault={deleteDialog.isDefault}
          hasUsers={validationData?.hasUsers || false}
          hasRoutes={validationData?.hasRoutes || false}
          userCount={validationData?.userCount}
          routeCount={validationData?.routeCount}
          onConfirm={() => {
            deleteDomain(deleteDialog.domainGroupId);
            setDeleteDialog(null);
          }}
        />
      )}

      {/* Dialog de Registros Órfãos */}
      {orphanedDialog && (
        <OrphanedDomainsDialog
          open={orphanedDialog.open}
          onOpenChange={(open) => !open && setOrphanedDialog(null)}
          provider={orphanedDialog.provider}
          orphanedDomains={orphanedDialog.orphanedDomains}
          onCleanup={handleCleanupOrphans}
          isLoading={false}
        />
      )}
    </div>
  );
}