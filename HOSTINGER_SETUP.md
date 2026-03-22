# 🚀 Guia Completo: Banco de Dados MySQL no Hostinger

## 📋 Pré-requisitos
- Conta ativa no Hostinger
- Plano com suporte para MySQL (informações adicionadas ao painel)
- SSH ativado (se necessário)

---

## 1️⃣ CRIAR BANCO DE DADOS NO HOSTINGER

### Via Painel de Controle (Forma Mais Fácil):

1. **Faça login** no painel do Hostinger (hPanel)
2. Vá para **Hosting** → Seu plano
3. No menu lateral, procure por **Bancos de Dados** ou **MySQL**
4. Clique em **+ Adicionar Banco de Dados**
5. Preencha:
   - **Nome do banco**: `logup` ou similar
   - **Username**: seu_usuario_db (anote!)
   - **Senha**: crie uma forte (anote!)
6. Clique em **Criar**

### Você receberá:
- Host: algo como `sql###.hostinger.com`
- Database: `seu_usuario_db_logup`
- Username: `seu_usuario_db`
- Password: sua_senha

---

## 2️⃣ ADICIONAR AS CREDENCIAIS NO .env

1. Na raiz do seu projeto, crie/edite `.env`:

```bash
# Banco de Dados
DB_HOST=sql###.hostinger.com
DB_USER=seu_usuario_db
DB_PASSWORD=sua_senha_aqui
DB_NAME=seu_usuario_db_logup
DB_PORT=3306

# Resto das variáveis necessárias
PORT=3000
NODE_ENV=development
JWT_SECRET=sua_jwt_key_muito_segura_aqui
```

2. **Não compartilhe** este arquivo! Já está em `.gitignore`

---

## 3️⃣ EXECUTAR O SCHEMA SQL

### Opção A: Via PHPMyAdmin (Recomendado para iniciantes)

1. No painel Hostinger, acesse **MySQL** → seu banco
2. Clique em **Gerenciar** ou **PHPMyAdmin**
3. Selecione seu banco de dados
4. Vá para a aba **SQL**
5. Cole todo o conteúdo de `database/schema.sql`
6. Clique em **Executar**

### Opção B: Via Terminal/CLI

```bash
# Instale mysql-client se não tiver:
# Ubuntu/Debian: sudo apt-get install mysql-client
# macOS: brew install mysql-client

# Execute:
mysql -h sql###.hostinger.com -u seu_usuario_db -p seu_usuario_db_logup < database/schema.sql
# Será solicitada a senha, digite-a
```

### Opção C: Via Node.js (no seu projeto)

```bash
npm install
npm run init-db
# (se não tiver este comando, execute manualmente o schema)
```

---

## 4️⃣ TESTAR A CONEXÃO

Execute este comando no seu projeto:

```bash
npm install
npm run dev
```

Você verá na saída:
```
✅ Conectado ao banco de dados MySQL com sucesso!
```

Ou para um teste rápido, crie um arquivo `test-db.ts`:

```typescript
import pool from './src/database/mysql';

async function test() {
  try {
    const result = await pool.query('SELECT 1 as test');
    console.log('✅ Conexão OK:', result);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

test();
```

Execute: `npx tsx test-db.ts`

---

## 5️⃣ MIGRAR DADOS DO SQLITE (se necessário)

Se você tinha dados no SQLite e quer preservar:

```bash
# 1. Exporte do SQLite:
sqlite3 logup.db ".mode csv" ".output data.csv" "SELECT * FROM users;"

# 2. Importe no MySQL via PHPMyAdmin ou:
LOAD DATA INFILE '/caminho/data.csv' 
INTO TABLE users 
FIELDS TERMINATED BY ',' 
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;
```

---

## 6️⃣ CONFIGURAR VARIÁVEIS DE AMBIENTE NO HOSTINGER

Se hospedar a aplicação no Hostinger também:

1. No painel, acesse **Arquivos** → raiz do projeto
2. Procure/crie arquivo `.env`
3. Adicione as mesmas varáveis (com dados do seu banco Hostinger)
4. **Salve**

Ou via SSH:

```bash
ssh seu_usuario@seu-dominio.com
cd ~/public_html  # ou caminho correto
nano .env
# Cole as variáveis, salve com Ctrl+X, Y, Enter
```

---

## 7️⃣ ENDPOINTS DE TESTE

Com o servidor rodando, teste:

```bash
# Criar usuário
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Teste User",
    "email": "teste@example.com",
    "password": "senha123",
    "role": "professional"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@example.com",
    "password": "senha123"
  }'
```

---

## 🔒 DICAS DE SEGURANÇA

1. **Senhas fortes**: Use 16+ caracteres com números, símbolos e maiúsculas
2. **Backup regular**: Configure backups automáticos no Hostinger
3. **Limitar conexões**: Restrinja o acesso ao banco apenas de seu server
4. **SSL/TLS**: Use HTTPS em produção (Hostinger oferece Let's Encrypt grátis)
5. **Variáveis de ambiente**: Nunca commitar `.env` no Git

---

## 🆘 TROUBLESHOOTING

### Erro: "Access denied for user"
- Verifique username, password e host no `.env`
- Confirme que criou o usuário no Hostinger

### Erro: "Cannot find database"
- Verifique `DB_NAME` exato no `.env`
- Execute o schema SQL novamente

### Erro: "Too many connections"
- Aumente o `connectionLimit` em `src/database/mysql.ts`
- Verifique se há múltiplas instâncias rodando

### Erro: "ECONNREFUSED"
- Verifique se o host SQL está correto
- Teste com PHPMyAdmin primeiro para confirmar credenciais

---

## ✅ PRÓXIMOS PASSOS

1. ✅ Banco criado no Hostinger
2. ✅ Schema executado
3. ✅ Variáveis de ambiente configuradas
4. ✅ Aplicação conectando ao MySQL
5. 📝 Adaptar endpoints da API (se ainda usando SQLite)
6. 🚀 Deploy no Hostinger

Precisa de ajuda com qualquer etapa? Me pergunta! 😊
