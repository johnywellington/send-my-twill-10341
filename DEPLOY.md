# 🚀 Guia de Deploy - send-my-twill

Este guia explica como fazer deploy do frontend e backend do projeto em produção.

## 📋 Pré-requisitos

### Para todos os métodos:
- Node.js 18+ instalado
- Conta no Supabase (para backend)
- Variáveis de ambiente configuradas

### Variáveis de Ambiente Necessárias:
```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica-aqui
```

## 🎯 Deploy Rápido (Scripts Automatizados)

### Deploy Completo (Frontend + Backend)
```bash
# Dar permissão de execução (primeira vez)
chmod +x scripts/deploy.sh

# Executar deploy completo
./scripts/deploy.sh
```

### Deploy apenas do Frontend
```bash
chmod +x scripts/deploy-frontend.sh
./scripts/deploy-frontend.sh
```

### Deploy apenas do Backend
```bash
chmod +x scripts/deploy-backend.sh
./scripts/deploy-backend.sh
```

## 🔧 Deploy Manual

### 1️⃣ Backend (Edge Functions Supabase)

#### Instalação do Supabase CLI
```bash
npm install -g supabase
```

#### Login e Link ao Projeto
```bash
# Login no Supabase
supabase login

# Link ao projeto (primeira vez)
cd supabase
supabase link --project-ref SEU-PROJECT-ID
```

#### Deploy das Edge Functions
```bash
# Deploy todas as functions
supabase functions deploy --all

# OU deploy individual
supabase functions deploy send-sms
supabase functions deploy send-voice-call
# ... etc
```

#### Configurar Secrets no Supabase
```bash
# Exemplo de configuração de secrets
supabase secrets set TWILIO_ACCOUNT_SID=seu-sid
supabase secrets set TWILIO_AUTH_TOKEN=seu-token
supabase secrets set VONAGE_API_KEY=sua-key
supabase secrets set VONAGE_API_SECRET=seu-secret
```

### 2️⃣ Frontend

#### Build Local
```bash
# Instalar dependências
npm install

# Build para produção
npm run build

# Testar build localmente
npm run preview
```

#### Opção A: Deploy na Vercel

**Via CLI:**
```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Via Dashboard:**
1. Acesse [vercel.com](https://vercel.com)
2. Clique em "Add New Project"
3. Conecte seu repositório GitHub
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (raiz)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Adicione as variáveis de ambiente
6. Clique em "Deploy"

#### Opção B: Deploy na Netlify

**Via CLI:**
```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

**Via Dashboard:**
1. Acesse [netlify.com](https://netlify.com)
2. Clique em "Add new site" → "Import an existing project"
3. Conecte seu repositório GitHub
4. Configure:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Adicione as variáveis de ambiente
6. Clique em "Deploy"

#### Opção C: Deploy no Cloudflare Pages

**Via CLI:**
```bash
# Instalar Wrangler
npm install -g wrangler

# Login
wrangler login

# Deploy
wrangler pages deploy dist --project-name=send-my-twill
```

**Via Dashboard:**
1. Acesse [dash.cloudflare.com](https://dash.cloudflare.com)
2. Vá para "Workers & Pages" → "Create application"
3. Conecte seu repositório GitHub
4. Configure:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. Adicione as variáveis de ambiente
6. Clique em "Save and Deploy"

## 🤖 Deploy Automatizado (CI/CD)

### GitHub Actions

O projeto já inclui um workflow GitHub Actions em `.github/workflows/deploy.yml`.

#### Configurar Secrets no GitHub:

1. Vá para Settings → Secrets and variables → Actions
2. Adicione os seguintes secrets:

**Para Supabase:**
```
SUPABASE_ACCESS_TOKEN     # Token de acesso do Supabase
SUPABASE_PROJECT_ID       # ID do projeto Supabase
VITE_SUPABASE_URL         # URL pública do Supabase
VITE_SUPABASE_ANON_KEY    # Chave anônima do Supabase
```

**Para Vercel (escolha uma plataforma):**
```
VERCEL_TOKEN              # Token da Vercel
VERCEL_ORG_ID            # ID da organização
VERCEL_PROJECT_ID        # ID do projeto
```

**OU para Netlify:**
```
NETLIFY_AUTH_TOKEN       # Token do Netlify
NETLIFY_SITE_ID          # ID do site
```

**OU para Cloudflare Pages:**
```
CLOUDFLARE_API_TOKEN     # Token da API
CLOUDFLARE_ACCOUNT_ID    # ID da conta
```

#### Como obter os tokens:

**Supabase Access Token:**
1. Acesse [app.supabase.com](https://app.supabase.com)
2. Clique no seu avatar → Account Settings
3. Vá para "Access Tokens"
4. Gere um novo token

**Vercel Token:**
1. Acesse [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Crie um novo token

**Netlify Token:**
1. Acesse [app.netlify.com/user/applications](https://app.netlify.com/user/applications)
2. Clique em "New access token"

**Cloudflare API Token:**
1. Acesse [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Crie um token com permissões de Pages

#### Ativar Deploy Automático:

Após configurar os secrets, o deploy acontecerá automaticamente:
- ✅ A cada push na branch `main`
- ✅ Pode ser disparado manualmente em Actions → Deploy Frontend & Backend → Run workflow

## 🔍 Verificação Pós-Deploy

### Verificar Backend:
```bash
# Testar uma edge function
curl https://seu-projeto.supabase.co/functions/v1/send-sms \
  -H "Authorization: Bearer SEU-TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Verificar Frontend:
1. Acesse a URL do seu site
2. Abra o Developer Tools (F12)
3. Verifique se não há erros no console
4. Teste as funcionalidades principais

## 🐛 Troubleshooting

### Erro: "Supabase CLI not found"
```bash
npm install -g supabase
```

### Erro: "Not logged in to Supabase"
```bash
supabase login
```

### Erro: "Build failed"
- Verifique se as variáveis de ambiente estão configuradas
- Execute `npm run build` localmente para ver erros detalhados

### Edge Functions não atualizam
- Aguarde até 2 minutos para propagação
- Verifique logs: `supabase functions logs FUNCTION_NAME`

### Frontend não conecta ao backend
- Verifique se `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão corretos
- Confirme que as variáveis estão configuradas na plataforma de hosting

## 📚 Recursos Adicionais

- [Documentação Supabase](https://supabase.com/docs)
- [Documentação Vercel](https://vercel.com/docs)
- [Documentação Netlify](https://docs.netlify.com)
- [Documentação Cloudflare Pages](https://developers.cloudflare.com/pages)
- [GitHub Actions](https://docs.github.com/en/actions)

## 💡 Dicas

1. **Teste localmente antes de fazer deploy:**
   ```bash
   npm run build
   npm run preview
   ```

2. **Use diferentes ambientes:**
   - `main` branch → Produção
   - `develop` branch → Staging
   - Feature branches → Preview deploys

3. **Monitor os logs:**
   - Supabase: Dashboard → Logs
   - Vercel/Netlify/Cloudflare: Dashboard → Function logs

4. **Configure alertas:**
   - Configure notificações de erro no Supabase
   - Configure alertas de deploy falho no GitHub Actions

5. **Backup regular:**
   - Faça backup do banco de dados Supabase regularmente
   - Mantenha uma cópia local das Edge Functions
