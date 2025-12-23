#!/bin/bash

# Script de Deploy Automatizado - send-my-twill
# Este script faz build e deploy do frontend e backend em sequência

set -e  # Para execução se houver erro

echo "🚀 Iniciando processo de deploy..."
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se está na raiz do projeto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script da raiz do projeto${NC}"
    exit 1
fi

# Verificar variáveis de ambiente
echo -e "${BLUE}📋 Verificando variáveis de ambiente...${NC}"
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}⚠️  Aviso: Variáveis de ambiente não configuradas${NC}"
    echo "Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY"
fi

# 1. FRONTEND BUILD
echo ""
echo -e "${BLUE}🎨 [1/3] Building Frontend...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

npm install
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend build concluído com sucesso!${NC}"
    echo -e "   📦 Build disponível em: ./dist/"
else
    echo -e "${RED}❌ Erro no build do frontend${NC}"
    exit 1
fi

# 2. BACKEND DEPLOY (Edge Functions)
echo ""
echo -e "${BLUE}⚙️  [2/3] Deploying Backend (Edge Functions)...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI não encontrado${NC}"
    echo "Instale com: npm install -g supabase"
    exit 1
fi

# Verificar se está logado no Supabase
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}❌ Não está logado no Supabase${NC}"
    echo "Execute: supabase login"
    exit 1
fi

# Deploy das Edge Functions
cd supabase
supabase functions deploy --all

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Edge Functions deployadas com sucesso!${NC}"
    cd ..
else
    echo -e "${RED}❌ Erro no deploy das Edge Functions${NC}"
    cd ..
    exit 1
fi

# 3. FRONTEND DEPLOY (Opcional - comentado por padrão)
echo ""
echo -e "${BLUE}🌐 [3/3] Deploy do Frontend${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}ℹ️  Para deploy do frontend, escolha uma das opções:${NC}"
echo ""
echo "   Vercel:"
echo "   npm install -g vercel"
echo "   vercel --prod"
echo ""
echo "   Netlify:"
echo "   npm install -g netlify-cli"
echo "   netlify deploy --prod --dir=dist"
echo ""
echo "   Cloudflare Pages:"
echo "   npm install -g wrangler"
echo "   wrangler pages deploy dist"
echo ""

# Resumo final
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Deploy concluído com sucesso!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📊 Resumo:"
echo "   ✅ Frontend: Build gerado em ./dist/"
echo "   ✅ Backend: Edge Functions deployadas no Supabase"
echo ""
echo "🔗 Próximos passos:"
echo "   1. Faça deploy do frontend usando um dos métodos acima"
echo "   2. Configure as variáveis de ambiente na plataforma de hosting"
echo "   3. Teste a aplicação em produção"
echo ""
