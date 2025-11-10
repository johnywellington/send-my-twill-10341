#!/bin/bash

# Script de Deploy do Frontend - send-my-twill
# Faz build do frontend apenas

set -e

echo "🎨 Deploy do Frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar variáveis de ambiente
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "⚠️  Variáveis de ambiente não configuradas"
    echo "Configure:"
    echo "  export VITE_SUPABASE_URL=https://seu-projeto.supabase.co"
    echo "  export VITE_SUPABASE_ANON_KEY=sua-chave-publica"
    echo ""
fi

# Build
echo -e "${BLUE}📦 Instalando dependências...${NC}"
npm install

echo ""
echo -e "${BLUE}🏗️  Building...${NC}"
npm run build

echo ""
echo -e "${GREEN}✅ Build concluído!${NC}"
echo "   📦 Arquivos em: ./dist/"
echo ""

# Mostrar opções de deploy
echo -e "${BLUE}🚀 Opções de Deploy:${NC}"
echo ""
echo "1️⃣  Vercel:"
echo "   vercel --prod"
echo ""
echo "2️⃣  Netlify:"
echo "   netlify deploy --prod --dir=dist"
echo ""
echo "3️⃣  Cloudflare Pages:"
echo "   wrangler pages deploy dist"
echo ""
echo "4️⃣  Manual (FTP/SFTP):"
echo "   Faça upload do conteúdo da pasta ./dist/"
echo ""
