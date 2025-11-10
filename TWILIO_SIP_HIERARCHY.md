# Hierarquia SIP do Twilio

## Estrutura de Autenticação

O Twilio SIP utiliza uma hierarquia de 4 níveis para autenticação de endpoints:

```
┌──────────────────────────────────────┐
│ 1. SIP Domain                         │
│    example.sip.us1.twilio.com        │
└──────────┬───────────────────────────┘
           │
           │ (SIP Registration Authentication)
           │
           ▼
┌──────────────────────────────────────┐
│ 2. Credential List (por usuário)     │
│    "SIP User john@example.com"       │
└──────────┬───────────────────────────┘
           │
           │ (contém)
           │
           ▼
┌──────────────────────────────────────┐
│ 3. Credential (usuário individual)   │
│    Username: john                    │
│    Password: ********                │
└──────────────────────────────────────┘
```

## Fluxo de Criação

Quando um usuário SIP é criado, nossa aplicação executa os seguintes passos:

### 1. Criar o SIP Domain (se não existir)
```javascript
POST /2010-04-01/Accounts/{AccountSid}/SIP/Domains.json
{
  "DomainName": "example.sip.us1.twilio.com",
  "FriendlyName": "My SIP Domain"
}
```

### 2. Criar uma Credential List para o usuário
```javascript
POST /2010-04-01/Accounts/{AccountSid}/SIP/CredentialLists.json
{
  "FriendlyName": "SIP User john@example.com"
}
// Retorna: { "sid": "CLxxxx..." }
```

### 3. Adicionar o Credential (usuário) dentro da lista
```javascript
POST /2010-04-01/Accounts/{AccountSid}/SIP/CredentialLists/{CredentialListSid}/Credentials.json
{
  "Username": "john",
  "Password": "secure_password"
}
// Retorna: { "sid": "CRxxxx..." }
```

### 4. Associar a Credential List ao Domain (CRÍTICO!)
```javascript
POST /2010-04-01/Accounts/{AccountSid}/SIP/Domains/{DomainSid}/Auth/Registrations/CredentialListMappings.json
{
  "CredentialListSid": "CLxxxx..."
}
```

**⚠️ Este último passo é essencial!** Sem ele, o SIP Domain não consegue autenticar o endpoint durante o registro.

## Fluxo de Deleção

Quando um usuário SIP é deletado, a ordem inversa deve ser seguida:

1. **Remover o mapeamento** da Credential List do Domain
2. **Deletar o Credential** (usuário individual)
3. **Deletar a Credential List**

Nossa aplicação gerencia automaticamente toda esta hierarquia através das edge functions:
- `sip-twilio-create-user` - Criação completa
- `sip-twilio-delete-user` - Deleção completa

## Recursos Órfãos

A funcionalidade de "Recursos Órfãos" agora detecta **Credentials individuais** (usuários) que existem nas CredentialLists do Twilio mas não têm registro no banco de dados.

Anteriormente, detectávamos CredentialLists inteiras, mas isso estava incorreto segundo a hierarquia do Twilio.

## Referências

- [Twilio SIP Domain API](https://www.twilio.com/docs/voice/sip/api/sip-domain-resource)
- [Twilio Credential List API](https://www.twilio.com/docs/voice/sip/api/sip-credentiallist-resource)
- [Twilio Credential API](https://www.twilio.com/docs/voice/sip/api/sip-credential-resource)
- [Twilio SIP Registration Authentication](https://www.twilio.com/docs/voice/sip/api/sip-domain-registration-credentiallistmapping-resource)
