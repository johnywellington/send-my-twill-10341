#!/bin/bash

# Script de Deploy do Backend - send-my-twill
# Deploy das Edge Functions Supabase

set -e

echo "⚙️  Deploy do Backend (Edge Functions)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI não encontrado${NC}"
    echo ""
    echo "Instale com:"
    echo "  npm install -g supabase"
    echo ""
    exit 1
fi

# Verificar login
echo -e "${BLUE}🔐 Verificando autenticação...${NC}"
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}❌ Não está logado no Supabase${NC}"
    echo ""
    echo "Execute:"
    echo "  supabase login"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Autenticado${NC}"
echo ""

# Listar projetos
echo -e "${BLUE}📋 Projetos disponíveis:${NC}"
supabase projects list
echo ""

# Link ao projeto (se necessário)
if [ ! -f "supabase/.temp/project-ref" ]; then
    echo -e "${BLUE}🔗 Linking ao projeto...${NC}"
    echo "Digite o Project ID:"
    read project_id
    supabase link --project-ref "$project_id"
    echo ""
fi

# Deploy
echo -e "${BLUE}🚀 Deploying Edge Functions...${NC}"
echo ""

cd supabase
supabase functions deploy --all

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ Edge Functions deployadas com sucesso!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "🔗 Funções disponíveis em:"
    echo "   https://seu-projeto.supabase.co/functions/v1/"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Erro no deploy${NC}"
    cd ..
    exit 1
fi

cd ..
