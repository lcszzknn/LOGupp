# 📋 Checklist de Implementação - MySQL no Hostinger

## 🟦 PREPARAÇÃO (Fazer ANTES de desenvolver)

- [ ] Criar conta no Hostinger (se não tiver)
- [ ] Contratar plano com MySQL incluído
- [ ] Acessar painel Hostinger (hPanel)
- [ ] Criar banco de dados MySQL
- [ ] Anotar credenciais (host, usuário, senha, nome do BD)

---

## 🟨 CONFIGURAÇÃO LOCAL (Seu computador)

### Instalação de Dependências
- [ ] Rodar `npm install` na raiz do projeto
- [ ] Verificar se `mysql2` está em `package.json` ✅ (já está!)

### Variáveis de Ambiente
- [ ] Copiar `.env.example` para `.env` (ou usar dados do Hostinger)
- [ ] Preencher:
  ```
  DB_HOST=seu-host-hostinger
  DB_USER=seu_usuario
  DB_PASSWORD=sua_senha
  DB_NAME=seu_banco
  ```
- [ ] Testar conexão com `npm run init-db` (se criar este comando em package.json)

### Schema do Banco de Dados
- [ ] Executar `database/schema.sql` no Hostinger (via PHPMyAdmin ou CLI)
- [ ] Verificar se todas as tabelas foram criadas

---

## 🟩 DESENVOLVIMENTO (Adaptar código)

### Estrutura de Pastas ✅
- [ ] Pasta `/src/database/` criada com `mysql.ts` ✅
- [ ] Pasta `/src/routes/` com exemplos de endpoints MySQL ✅
- [ ] Pasta `/src/middleware/` com autenticação ✅
- [ ] Arquivo `/database/schema.sql` ✅

### Migrar do SQLite para MySQL

#### No `server.ts`:
- [ ] Remover: `import Database from 'better-sqlite3'`
- [ ] Adicionar: `import pool from './src/database/mysql'`
- [ ] Substituir lógica de DB do SQLite para usar `pool.execute()` do MySQL
- [ ] Usar exemplos em `src/routes/auth-mysql.ts` como referência

#### Endpoints a Implementar:
- [ ] **POST /api/auth/register** - Criar usuário
- [ ] **POST /api/auth/login** - Fazer login (retorna JWT)
- [ ] **GET /api/auth/me** - Dados do usuário (requer auth)
- [ ] **POST /api/professional-profile** - Criar/atualizar perfil prof.
- [ ] **POST /api/client-register** - Registrar cliente
- [ ] **GET /api/professionals** - Listar profissionais
- [ ] **POST /api/audit** - Registrar ações (admin only)

### Autenticação
- [ ] Aplicar middleware `authenticateToken` em rotas protegidas
- [ ] Usar `authorizeRole` para controlar acesso por perfil (admin, professional, client)
- [ ] Testar com Postman/curl

---

## 🟧 TESTES (Validar Funcionamento)

### Testes Locais
- [ ] Rodar `npm run dev`
- [ ] Ver mensagem: "✅ Conectado ao banco de dados MySQL com sucesso!"
- [ ] Testar endpoints com curl ou Postman:
  ```bash
  # Registrar
  curl -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"name":"Test","email":"test@test.com","password":"123456","role":"professional"}'
  
  # Login
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"123456"}'
  
  # Obter token e testar rota protegida
  curl -X GET http://localhost:3000/api/auth/me \
    -H "Authorization: Bearer SEU_TOKEN_AQUI"
  ```

### Verificar no Hostinger
- [ ] Acessar PHPMyAdmin
- [ ] Ver dados em `users` (adicionar manualmente para testar)
- [ ] Verificar `audit_logs` para rastrear ações
- [ ] Confirmar `sessions` sendo registradas

---

## 🟥 DEPLOY (Colocar em Produção)

### Preparação
- [ ] Build do projeto: `npm run build`
- [ ] Revisar arquivo `.env` (não .gitignore)
- [ ] Criar backup do banco no Hostinger

### Upload para Hostinger
- [ ] Se usar Hostinger com Node.js:
  - [ ] Fazer push para GitHub
  - [ ] Configurar deployment automático no Hostinger
  - [ ] Ou fazer upload via SFTP/SSH
  
- [ ] Se usar Hostinger apenas para banco:
  - [ ] Hospedar frontend em outro lugar (Vercel, Netlify, etc.)
  - [ ] Apontar API_URL para seu servidor Node

### Configurações Finais
- [ ] `.env` em produção com as credenciais do Hostinger
- [ ] `NODE_ENV=production`
- [ ] SSL/HTTPS ativado
- [ ] Testar endpoints em produção
- [ ] Configurar CORS se frontend e backend em domínios diferentes

---

## ✅ VALIDAÇÃO FINAL

- [ ] Usuários conseguem fazer registro
- [ ] Login funciona e retorna JWT
- [ ] Autenticação protege rotas
- [ ] Dados são salvos no MySQL do Hostinger
- [ ] Logs estão sendo registrados
- [ ] Performance está aceitável
- [ ] Sem erros no console

---

## 📚 Arquivos Importantes

| Arquivo | Descrição |
|---------|-----------|
| `database/schema.sql` | Script para criar tabelas |
| `src/database/mysql.ts` | Configuração da conexão MySQL |
| `src/routes/auth-mysql.ts` | Exemplos de endpoints |
| `src/middleware/auth-middleware.ts` | Proteção de rotas |
| `HOSTINGER_SETUP.md` | Guia passo a passo do Hostinger |
| `.env` | Credenciais (locais, não fazer push!) |

---

## 🆘 Precisa de Help?

Dúvidas? Verifique:
1. **Conexão não funciona?** → Confira `.env` com credenciais do Hostinger
2. **Erro "table not exists"?** → Rode `database/schema.sql` novamente
3. **Autenticação falhando?** → Verifique `JWT_SECRET` em `.env`
4. **Querys não retornam dados?** → Use o mesmo padrão de async/await dos exemplos

---

**Status:** 🟨 Em Progresso  
**Próximo passo:** Executar schema.sql no Hostinger
