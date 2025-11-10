import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Plus, RefreshCw, Server, List, User } from "lucide-react";
import { useSIPConfig } from "@/hooks/use-sip-config";
import { useSIPUsers } from "@/hooks/use-sip-users";
import { useProvider } from "@/contexts/ProviderContext";
import { SyncTwilioDomainsButton } from "./SyncTwilioDomainsButton";
import { Loader2 } from "lucide-react";

export function DomainsManagement() {
  const { selectedCredentialId } = useProvider();
  const { configs, isLoading: loadingConfigs } = useSIPConfig(selectedCredentialId);
  const { users, isLoading: loadingUsers } = useSIPUsers();
  
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());

  const toggleDomain = (domainGroupId: string) => {
    const newExpanded = new Set(expandedDomains);
    if (newExpanded.has(domainGroupId)) {
      newExpanded.delete(domainGroupId);
    } else {
      newExpanded.add(domainGroupId);
    }
    setExpandedDomains(newExpanded);
  };

  const toggleList = (credlistSid: string) => {
    const newExpanded = new Set(expandedLists);
    if (newExpanded.has(credlistSid)) {
      newExpanded.delete(credlistSid);
    } else {
      newExpanded.add(credlistSid);
    }
    setExpandedLists(newExpanded);
  };

  // Agrupar usuários por domain_group_id e depois por credlist
  const getUsersByDomain = (domainGroupId: string) => {
    return users?.filter(u => u.domain_group_id === domainGroupId && u.provider === 'twilio') || [];
  };

  const getCredentialListsForDomain = (domainGroupId: string) => {
    const domainUsers = getUsersByDomain(domainGroupId);
    const credListMap = new Map<string, any[]>();
    
    domainUsers.forEach(user => {
      if (user.twilio_credlist_sid) {
        if (!credListMap.has(user.twilio_credlist_sid)) {
          credListMap.set(user.twilio_credlist_sid, []);
        }
        credListMap.get(user.twilio_credlist_sid)!.push(user);
      }
    });
    
    return Array.from(credListMap.entries()).map(([sid, users]) => ({
      sid,
      users,
      name: `CredentialList (${users.length} usuário${users.length !== 1 ? 's' : ''})`,
    }));
  };

  if (loadingConfigs || loadingUsers) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const twilioDomains = configs?.twilio || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Hierarquia SIP Twilio
              </CardTitle>
              <CardDescription>
                Domains → Credential Lists → Credentials (Usuários)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <SyncTwilioDomainsButton />
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Novo Domain
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {twilioDomains.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum SIP Domain configurado</p>
              <p className="text-sm">Clique em "Novo Domain" para começar</p>
            </div>
          ) : (
            <div className="space-y-2">
              {twilioDomains.map((domain) => {
                const credLists = getCredentialListsForDomain(domain.domain_group_id);
                const isExpanded = expandedDomains.has(domain.domain_group_id);
                
                return (
                  <Collapsible
                    key={domain.domain_group_id}
                    open={isExpanded}
                    onOpenChange={() => toggleDomain(domain.domain_group_id)}
                  >
                    <div className="border rounded-lg">
                      {/* Domain Level */}
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <Server className="h-5 w-5 text-blue-600" />
                            <div className="text-left">
                              <p className="font-semibold">{domain.friendly_name}</p>
                              <p className="text-sm text-muted-foreground font-mono">
                                {domain.sip_domain}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {domain.is_default && (
                              <Badge variant="default">Padrão</Badge>
                            )}
                            <Badge variant={domain.is_active ? "default" : "secondary"}>
                              {domain.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                            <Badge variant="outline">
                              {credLists.length} lista{credLists.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        {credLists.length === 0 ? (
                          <div className="p-4 pl-12 text-sm text-muted-foreground border-t">
                            Nenhuma Credential List associada a este domínio
                          </div>
                        ) : (
                          <div className="border-t">
                            {credLists.map((credList) => {
                              const isListExpanded = expandedLists.has(credList.sid);
                              
                              return (
                                <Collapsible
                                  key={credList.sid}
                                  open={isListExpanded}
                                  onOpenChange={() => toggleList(credList.sid)}
                                >
                                  {/* Credential List Level */}
                                  <CollapsibleTrigger className="w-full">
                                    <div className="flex items-center justify-between p-3 pl-12 hover:bg-muted/30 transition-colors">
                                      <div className="flex items-center gap-3">
                                        {isListExpanded ? (
                                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                        ) : (
                                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                        )}
                                        <List className="h-4 w-4 text-purple-600" />
                                        <div className="text-left">
                                          <p className="text-sm font-medium">{credList.name}</p>
                                          <p className="text-xs text-muted-foreground font-mono">
                                            SID: {credList.sid.substring(0, 12)}...
                                          </p>
                                        </div>
                                      </div>
                                      <Badge variant="outline" className="text-xs">
                                        {credList.users.length} credential{credList.users.length !== 1 ? 's' : ''}
                                      </Badge>
                                    </div>
                                  </CollapsibleTrigger>

                                  <CollapsibleContent>
                                    {/* Credentials (Users) Level */}
                                    <div className="bg-muted/20">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead className="pl-20">Usuário</TableHead>
                                            <TableHead>Ramal</TableHead>
                                            <TableHead>SIP URI</TableHead>
                                            <TableHead>Credential SID</TableHead>
                                            <TableHead>Status</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {credList.users.map((user) => (
                                            <TableRow key={user.id}>
                                              <TableCell className="pl-20">
                                                <div className="flex items-center gap-2">
                                                  <User className="h-3 w-3 text-green-600" />
                                                  <div>
                                                    <p className="font-medium text-sm">
                                                      {user.display_name || user.sip_username}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                      {user.sip_username}
                                                    </p>
                                                  </div>
                                                </div>
                                              </TableCell>
                                              <TableCell>
                                                <Badge variant="outline">{user.extension}</Badge>
                                              </TableCell>
                                              <TableCell className="font-mono text-xs">
                                                {user.sip_username}@{user.sip_domain.split('.')[0]}...
                                              </TableCell>
                                              <TableCell className="font-mono text-xs text-muted-foreground">
                                                {user.twilio_credential_sid?.substring(0, 12)}...
                                              </TableCell>
                                              <TableCell>
                                                <Badge variant={user.is_active ? "default" : "secondary"}>
                                                  {user.is_active ? 'Ativo' : 'Inativo'}
                                                </Badge>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              );
                            })}
                          </div>
                        )}
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
