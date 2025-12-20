# Separação de Projetos - Portal USER e Portal ADMIN

Este documento descreve como separar o projeto atual em dois projetos Lovable distintos.

## Estrutura Atual

O projeto foi reorganizado para ter código compartilhado em `src/shared/`:

```
src/
├── shared/              # ← CÓDIGO COMPARTILHADO (copiar para ambos projetos)
│   ├── ui/              # Componentes UI (50 arquivos)
│   ├── lib/             # Utilitários (14 arquivos)
│   └── hooks/           # Hooks compartilhados (28 arquivos)
├── features/
│   ├── admin/           # ← APENAS ADMIN PORTAL
│   │   ├── hooks/       # 17 hooks
│   │   ├── layouts/     # 2 layouts
│   │   └── pages/       # 10 páginas
│   ├── user/            # ← APENAS USER PORTAL
│   │   ├── hooks/       # 4 hooks
│   │   ├── layouts/     # 2 layouts
│   │   ├── pages/       # 12 páginas
│   │   └── types/       # 1 type file
│   └── shared/          # Componentes compartilhados (ProtectedRoute, etc)
├── components/          # Componentes funcionais
│   ├── admin/           # ← APENAS ADMIN
│   ├── monitoring/      # ← APENAS ADMIN  
│   ├── contacts/        # ← APENAS USER
│   ├── templates/       # ← APENAS USER
│   └── [outros]/        # Ambos projetos
├── contexts/            # Contextos React (ambos)
├── services/            # Services (ambos)
└── integrations/        # Supabase client (ambos)
```

---

## PROJETO 1: Portal USER (Este Projeto)

### O que MANTER:
- `src/shared/` - Todo
- `src/features/user/` - Todo
- `src/features/shared/` - ProtectedRoute, UserRoute, PublicLayout, etc
- `src/components/` - Exceto pastas admin/ e monitoring/
- `src/contexts/` - Todo
- `src/services/` - Todo
- `src/integrations/` - Todo
- `supabase/functions/` - Todo (edge functions)

### O que REMOVER (após criar Admin Portal):
```
src/features/admin/           # 10 páginas, 17 hooks, 2 layouts
src/components/admin/         # 6 componentes
src/components/monitoring/    # 6 componentes
```

### Arquivos de rotas (App.tsx):
Remover rotas admin:
- /admin/*
- /admin/users
- /admin/approvals
- /admin/monitoring
- /admin/numbers
- /admin/credentials
- /admin/sip/*
- /admin/sync-logs
- /admin/active-calls

---

## PROJETO 2: Portal ADMIN (Novo Projeto)

### Criar novo projeto Lovable e COPIAR:

#### 1. Código Compartilhado (OBRIGATÓRIO):
```
src/shared/                    # 92 arquivos
src/integrations/supabase/     # client.ts e types.ts
src/contexts/ProviderContext.tsx
src/services/providers/        # 4 arquivos
```

#### 2. Features Admin:
```
src/features/admin/            # Todo (10 páginas, 17 hooks, 2 layouts)
src/features/shared/           # AdminRoute, ProtectedRoute, PublicLayout
```

#### 3. Componentes Admin:
```
src/components/admin/          # 6 componentes (ApiBalancesDialog, BalanceCard, etc)
src/components/monitoring/     # 6 componentes (ActiveCallsCard, etc)
```

#### 4. Componentes Compartilhados (usados por admin):
```
src/components/api-test/       # 6 componentes
src/components/credentials/    # 8 componentes
src/components/numbers/        # 7 componentes
src/components/sip/            # 25 componentes
src/components/docs/           # 4 componentes
```

#### 5. Edge Functions:
```
supabase/functions/            # TODAS as 65+ edge functions
supabase/config.toml           # Configuração
```

#### 6. Outros arquivos necessários:
```
src/index.css
tailwind.config.ts
vite.config.ts
index.html
```

### Configurar App.tsx no Admin Portal:
```tsx
// Apenas rotas admin
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
    <Route index element={<AdminDashboard />} />
    <Route path="users" element={<AdminUsers />} />
    <Route path="approvals" element={<UserApprovals />} />
    <Route path="monitoring" element={<Monitoring />} />
    <Route path="numbers" element={<Numbers />} />
    <Route path="credentials" element={<ProviderCredentials />} />
    <Route path="sip" element={<SIP />} />
    <Route path="sip/:domainId" element={<SIPDomainDetails />} />
    <Route path="sync-logs" element={<SyncLogs />} />
    <Route path="active-calls" element={<ActiveCalls />} />
  </Route>
  <Route path="*" element={<Navigate to="/admin" />} />
</Routes>
```

---

## Configuração do Supabase

### IMPORTANTE: Ambos projetos usam o MESMO backend Supabase!

No novo projeto ADMIN, configurar as variáveis de ambiente (.env):
```
VITE_SUPABASE_URL=https://baowfhikujfppwmmhwcn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[mesma chave do projeto USER]
VITE_SUPABASE_PROJECT_ID=baowfhikujfppwmmhwcn
```

### Autenticação:
- Mesmo sistema de auth para ambos portais
- AdminRoute verifica role='admin' via user_roles table
- UserRoute permite role='user' ou 'admin'

---

## Domínios Sugeridos

| Portal | Domínio Sugerido |
|--------|------------------|
| USER   | app.seudominio.com |
| ADMIN  | admin.seudominio.com |

---

## Checklist de Separação

### Fase 1: Preparar USER Portal (este projeto)
- [x] Criar estrutura src/shared/
- [ ] Mover componentes UI para shared/ui/
- [ ] Mover hooks para shared/hooks/
- [ ] Mover libs para shared/lib/
- [ ] Atualizar todos os imports

### Fase 2: Criar ADMIN Portal (novo projeto)
- [ ] Criar novo projeto Lovable
- [ ] Copiar src/shared/ (92 arquivos)
- [ ] Copiar src/features/admin/
- [ ] Copiar src/features/shared/
- [ ] Copiar src/components/admin/
- [ ] Copiar src/components/monitoring/
- [ ] Copiar componentes compartilhados necessários
- [ ] Copiar todas edge functions
- [ ] Configurar App.tsx com rotas admin
- [ ] Configurar variáveis de ambiente
- [ ] Testar login admin

### Fase 3: Limpar USER Portal
- [ ] Remover src/features/admin/
- [ ] Remover src/components/admin/
- [ ] Remover src/components/monitoring/
- [ ] Remover rotas admin do App.tsx
- [ ] Testar todas funcionalidades user

---

## Estimativas

| Tarefa | Tempo Estimado |
|--------|----------------|
| Reorganizar shared/ | 1-2 horas |
| Criar ADMIN Portal | 2-3 horas |
| Limpar USER Portal | 30 min |
| Testes | 1 hora |
| **Total** | **4-6 horas** |

---

## Arquivos por Contagem

| Categoria | USER Portal | ADMIN Portal | Compartilhado |
|-----------|-------------|--------------|---------------|
| Páginas | 12 | 10 | 3 (public) |
| Hooks | 4 | 17 | 28 |
| UI Components | - | - | 50 |
| Lib/Utils | - | - | 14 |
| Feature Components | ~30 | ~40 | ~15 |
| Edge Functions | - | - | 65+ |
| **Total** | ~46 | ~67 | ~175 |
