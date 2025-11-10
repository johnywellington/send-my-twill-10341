# send-my-twill

Aplicação fullstack com frontend React e backend Supabase.

## Estrutura do Projeto

```
/
├── src/                  # Código fonte do frontend React/TypeScript
├── public/               # Assets estáticos
├── supabase/             # Backend Supabase
│   ├── functions/        # Edge Functions (Deno)
│   ├── config.toml       # Configuração do Supabase
│   └── migrations/       # Database migrations
├── package.json          # Dependências do projeto
├── vite.config.ts        # Configuração do Vite
└── ...
```

## Tecnologias

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn-ui
- **Backend:** Supabase (Edge Functions, PostgreSQL, Auth)

## Desenvolvimento Local

```sh
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

## Deploy em Produção

### Deploy Completo (Lovable)

Este projeto está conectado ao Lovable e faz deploy automático ao fazer push para o repositório.

**URL do Projeto:** https://lovable.dev/projects/405d80af-70a5-475e-aac7-d2625490d887

### Deploy Separado

Se desejar fazer deploy do frontend e backend em plataformas diferentes:

#### Frontend (Vercel, Netlify, Cloudflare Pages)

**Configurações:**
- **Root Directory:** `/` (raiz)
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Node Version:** 18+

**Variáveis de Ambiente:**
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
```

#### Backend (Supabase)

As Edge Functions em `supabase/functions/` são deployadas automaticamente quando conectadas ao projeto Supabase.

**Para deploy manual:**
```sh
# Login no Supabase
npx supabase login

# Link ao projeto
npx supabase link --project-ref seu-projeto-id

# Deploy das functions
npx supabase functions deploy
```

## Sobre a Estrutura

⚠️ **Nota Importante:** O Lovable requer que `package.json`, `vite.config.ts` e a pasta `src/` estejam na raiz do projeto para funcionar corretamente. A pasta `supabase/` também deve estar na raiz para que o Supabase CLI e o Lovable possam detectá-la automaticamente.

Esta estrutura já permite deploy separado:
- **Frontend:** Pode ser deployado em qualquer plataforma de hosting estático
- **Backend:** As Edge Functions e banco de dados são gerenciados pelo Supabase

## Custom Domain

Para conectar um domínio customizado, navegue até Project > Settings > Domains no Lovable.

📚 **Documentação:** [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
