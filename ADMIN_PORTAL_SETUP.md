# Admin Portal - Checklist de Setup

## Pré-requisitos
- [ ] Criar novo projeto Lovable chamado "Admin Portal"
- [ ] Conectar ao mesmo Supabase (mesmas credenciais)

---

## Fase 1: Estrutura Base

### 1.1 Arquivos de Configuração Raiz
```bash
# Copiar para raiz do projeto
index.html
tailwind.config.ts
vite.config.ts
eslint.config.js
.env.example
```

### 1.2 Arquivos Source Raiz
```bash
# Copiar para src/
src/App.css
src/main.tsx
src/index.css
src/vite-env.d.ts
```

---

## Fase 2: Pasta Shared (COPIAR INTEIRA)

```bash
# Copiar toda a estrutura
src/shared/
├── ui/           # 50+ componentes UI
├── hooks/        # 28 hooks compartilhados
└── lib/          # 14 utilitários
```

**Arquivos incluídos:**
- `src/shared/ui/index.ts` + todos componentes
- `src/shared/hooks/index.ts` + todos hooks
- `src/shared/lib/index.ts` + todas libs

---

## Fase 3: Integrações e Serviços

### 3.1 Supabase Client
```bash
src/integrations/
└── supabase/
    ├── client.ts    # Auto-gerado pelo Lovable Cloud
    └── types.ts     # Auto-gerado pelo Lovable Cloud
```
> ⚠️ **NOTA**: Estes arquivos serão gerados automaticamente ao conectar o Lovable Cloud

### 3.2 Serviços de Provider
```bash
src/services/
└── providers/
    ├── factory.ts
    ├── index.ts
    ├── twilio.ts
    ├── types.ts
    └── vonage.ts
```

### 3.3 Contextos
```bash
src/contexts/
└── ProviderContext.tsx
```

---

## Fase 4: Features Compartilhadas

```bash
src/features/shared/
├── components/
│   ├── AdminRoute.tsx
│   ├── ProtectedRoute.tsx
│   └── UserRoute.tsx
├── hooks/
│   ├── use-auth.ts
│   └── use-role.ts
├── layouts/
│   └── PublicLayout.tsx
└── pages/
    ├── ApiDocs.tsx
    ├── LandingPage.tsx
    ├── Login.tsx
    ├── NotFound.tsx
    └── Signup.tsx
```

---

## Fase 5: Features Admin (EXCLUSIVAS)

### 5.1 Hooks Admin
```bash
src/features/admin/hooks/
├── use-cleanup-orphaned-resources.ts
├── use-orphaned-domains.ts
├── use-orphaned-numbers.ts
├── use-recover-vonage-endpoints.ts
├── use-sync-all.ts
├── use-sync-logs.ts
├── use-sync-sip-endpoints.ts
├── use-sync-sip-routes.ts
├── use-sync-twilio-numbers.ts
├── use-sync-twilio-sip-domains.ts
├── use-sync-vonage-numbers.ts
├── use-sync-vonage-sip-applications.ts
├── use-user-activity.ts
├── use-users.ts
├── use-vonage-applications.ts
├── use-vonage-users.ts
└── use-webhook-health.ts
```

### 5.2 Layouts Admin
```bash
src/features/admin/layouts/
├── AdminLayout.tsx
└── AdminSidebar.tsx
```

### 5.3 Páginas Admin
```bash
src/features/admin/pages/
├── ActiveCalls.tsx
├── AdminDashboard.tsx
├── AdminUsers.tsx
├── Monitoring.tsx
├── Numbers.tsx
├── ProviderCredentials.tsx
├── SIP.tsx
├── SIPDomainDetails.tsx
├── SyncLogs.tsx
└── UserApprovals.tsx
```

---

## Fase 6: Componentes Admin

### 6.1 Componentes Admin Core
```bash
src/components/admin/
├── ApiBalancesDialog.tsx
├── BalanceCard.tsx
├── ChangeRoleDialog.tsx
├── SuspendUserDialog.tsx
├── UserActivityDialog.tsx
└── UserDialog.tsx
```

### 6.2 Componentes de Credenciais
```bash
src/components/credentials/
├── CredentialDialog.tsx
├── CredentialSecretsDialog.tsx
├── CredentialSelector.tsx
├── CredentialStatsCard.tsx
├── SecretsResultDialog.tsx
├── SubaccountDialog.tsx
└── TestConnectionButton.tsx
```

### 6.3 Componentes de Monitoramento
```bash
src/components/monitoring/
├── ActiveCallsCard.tsx
├── ActiveCallsTable.tsx
├── CallDetailsDialog.tsx
├── LiveMetricsCard.tsx
├── ProviderComparisonCard.tsx
├── RealtimeAlertsCard.tsx
└── SystemHealthCard.tsx
```

### 6.4 Componentes de Números
```bash
src/components/numbers/
├── OrphanedNumbersDialog.tsx
├── PhoneNumberDialog.tsx
├── PhoneNumberList.tsx
├── PhoneNumberSelector.tsx
├── SyncTwilioButton.tsx
├── SyncVonageButton.tsx
└── WebhookHealthDialog.tsx
```

### 6.5 Componentes SIP (35 arquivos)
```bash
src/components/sip/
├── AnalyticsContent.tsx
├── CallsHistoryContent.tsx
├── ConfigContent.tsx
├── ConnectivityStatus.tsx
├── CredentialBadge.tsx
├── DeleteDomainDialog.tsx
├── DeleteVonageApplicationDialog.tsx
├── DeleteVonageUserDialog.tsx
├── DiagnosticContent.tsx
├── DomainsManagement.tsx
├── EditDomainDialog.tsx
├── EventsContent.tsx
├── ExtensionAvailability.tsx
├── MakeCallContent.tsx
├── MonitorContent.tsx
├── MyExtensionContent.tsx
├── OrphanedDomainsDialog.tsx
├── OrphanedResourcesDialog.tsx
├── OrphanedUsersDialog.tsx
├── QRCodeContent.tsx
├── RoutesContent.tsx
├── SIPCallDialog.tsx
├── SIPRouteDialog.tsx
├── SIPUserDialog.tsx
├── SyncDashboard.tsx
├── SyncEndpointsButton.tsx
├── SyncTwilioDomainsButton.tsx
├── SyncVonageApplicationsButton.tsx
├── UsersContent.tsx
├── VonageApplicationDialog.tsx
├── VonageApplicationsManagement.tsx
├── VonageUserDialog.tsx
└── WebhooksContent.tsx
```

---

## Fase 7: Edge Functions (TODAS)

```bash
supabase/
├── config.toml
└── functions/
    ├── _shared/
    │   ├── cors.ts
    │   ├── sync-logger.ts
    │   └── webhook-validation.ts
    ├── check-account-status/
    ├── check-twilio-account-type/
    ├── cleanup-orphaned-sip-resources/
    ├── create-provider-subaccount/
    ├── delete-provider-subaccount/
    ├── delete-user/
    ├── generate-ivr-preview/
    ├── generate-twiml-ivr/
    ├── generate-twiml/
    ├── generate-voice-sample/
    ├── get-all-balances/
    ├── get-users/
    ├── import-provider-credentials/
    ├── ivr-webhook-v2-events/
    ├── ivr-webhook-v2-twilio/
    ├── ivr-webhook-v2/
    ├── ivr-webhook/
    ├── log-sip-event/
    ├── recover-missing-sip-ids/
    ├── send-approval-email/
    ├── send-ivr-call-v2/
    ├── send-ivr-call/
    ├── send-sms/
    ├── send-voice-call/
    ├── sip-setup-providers/
    ├── sip-test-call/
    ├── sip-test-connectivity/
    ├── sip-twilio-call-pstn/
    ├── sip-twilio-call-sip/
    ├── sip-twilio-create-route/
    ├── sip-twilio-create-user/
    ├── sip-twilio-delete-user/
    ├── sip-vonage-call-pstn/
    ├── sip-vonage-call-sip/
    ├── sip-vonage-create-application/
    ├── sip-vonage-create-endpoint/
    ├── sip-vonage-create-route/
    ├── sip-vonage-delete-application/
    ├── sip-vonage-delete-user/
    ├── sip-vonage-recover-endpoints/
    ├── sip-vonage-update-application/
    ├── sip-vonage-update-user/
    ├── store-credential-secrets/
    ├── sync-provider-subaccounts/
    ├── sync-sip-dashboard/
    ├── sync-sip-endpoints-status/
    ├── sync-sip-routes/
    ├── sync-twilio-numbers-v2/
    ├── sync-twilio-numbers/
    ├── sync-twilio-sip-domains/
    ├── sync-usage-analytics/
    ├── sync-vonage-numbers/
    ├── sync-vonage-sip-applications/
    ├── test-credential-connection/
    ├── test-webhook-health/
    ├── twilio-call-inbound/
    ├── twilio-sip-registration-webhook/
    ├── twilio-sms-inbound/
    ├── twilio-sms-webhook/
    ├── twilio-voice-status/
    ├── twilio-voice-webhook/
    ├── validate-phone-number/
    ├── validate-webhook/
    ├── vonage-call-inbound/
    ├── vonage-sip-registration-webhook/
    ├── vonage-sms-inbound/
    ├── vonage-sms-webhook/
    └── vonage-voice-webhook/
```

---

## Fase 8: Ajustar App.tsx

Criar novo `src/App.tsx` com APENAS rotas admin:

```tsx
import { Toaster } from "@/shared/ui/sonner";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProviderProvider } from "./contexts/ProviderContext";

// Shared
import { ProtectedRoute } from "./features/shared/components/ProtectedRoute";
import { AdminRoute } from "./features/shared/components/AdminRoute";
import Login from "./features/shared/pages/Login";
import Signup from "./features/shared/pages/Signup";
import NotFound from "./features/shared/pages/NotFound";

// Admin
import AdminLayout from "./features/admin/layouts/AdminLayout";
import AdminDashboard from "./features/admin/pages/AdminDashboard";
import AdminUsers from "./features/admin/pages/AdminUsers";
import UserApprovals from "./features/admin/pages/UserApprovals";
import ProviderCredentials from "./features/admin/pages/ProviderCredentials";
import Numbers from "./features/admin/pages/Numbers";
import SIP from "./features/admin/pages/SIP";
import SIPDomainDetails from "./features/admin/pages/SIPDomainDetails";
import Monitoring from "./features/admin/pages/Monitoring";
import ActiveCalls from "./features/admin/pages/ActiveCalls";
import SyncLogs from "./features/admin/pages/SyncLogs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ProviderProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Admin Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="approvals" element={<UserApprovals />} />
              <Route path="credentials" element={<ProviderCredentials />} />
              <Route path="numbers" element={<Numbers />} />
              <Route path="sip" element={<SIP />} />
              <Route path="sip/:domainId" element={<SIPDomainDetails />} />
              <Route path="monitoring" element={<Monitoring />} />
              <Route path="active-calls" element={<ActiveCalls />} />
              <Route path="sync-logs" element={<SyncLogs />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ProviderProvider>
  </QueryClientProvider>
);

export default App;
```

---

## Checklist Final

### Configuração
- [ ] Projeto criado no Lovable
- [ ] Lovable Cloud conectado (mesmo Supabase)
- [ ] Arquivos de config copiados

### Código Fonte
- [ ] `src/shared/` copiado
- [ ] `src/integrations/` configurado
- [ ] `src/services/` copiado
- [ ] `src/contexts/` copiado
- [ ] `src/features/shared/` copiado
- [ ] `src/features/admin/` copiado
- [ ] `src/components/admin/` copiado
- [ ] `src/components/credentials/` copiado
- [ ] `src/components/monitoring/` copiado
- [ ] `src/components/numbers/` copiado
- [ ] `src/components/sip/` copiado

### Backend
- [ ] `supabase/functions/` copiado
- [ ] Edge functions deployadas

### Ajustes Finais
- [ ] `App.tsx` atualizado (apenas rotas admin)
- [ ] Testar login admin
- [ ] Testar dashboard
- [ ] Testar todas as funcionalidades

---

## Arquivos NÃO Incluir (User Portal Only)

```bash
# Estes ficam APENAS no User Portal
src/features/user/          # Todo o diretório
src/components/analytics/
src/components/api-test/
src/components/contacts/
src/components/templates/
src/components/docs/
src/components/BatchSendProgress.tsx
src/components/CSVImportDialog.tsx
src/components/DateRangePicker.tsx
src/components/DestinationNumbersInput.tsx
src/components/IVRMenuFormV2.tsx
src/components/IVRVoiceTestDialog.tsx
src/components/NavLink.tsx
src/components/ProviderSelector.tsx
src/components/RateLimitSelector.tsx
src/components/ReceivedCallsViewer.tsx
src/components/ReceivedSmsViewer.tsx
src/components/SenderIdTooltip.tsx
src/components/SmsForm.tsx
src/components/VoiceCallForm.tsx
src/components/VoiceSelector.tsx
```

---

## Contagem de Arquivos

| Categoria | Quantidade |
|-----------|------------|
| shared/ui | ~50 |
| shared/hooks | ~28 |
| shared/lib | ~14 |
| features/admin | ~27 |
| features/shared | ~8 |
| components/admin | 6 |
| components/credentials | 7 |
| components/monitoring | 7 |
| components/numbers | 7 |
| components/sip | 35 |
| services | 5 |
| edge functions | 60+ |
| **TOTAL** | **~250 arquivos** |
