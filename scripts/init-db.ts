#!/usr/bin/env node

/**
 * Script de Inicialização do Banco de Dados MySQL
 * Execute: npm run init-db
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './src/database/mysql';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  console.log('🚀 Iniciando banco de dados MySQL...\n');

  try {
    // 1. Testar conexão
    console.log('1️⃣  Testando conexão ao banco de dados...');
    const connection = await (pool as any).getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ Conexão OK!\n');

    // 2. Ler schema SQL
    console.log('2️⃣  Lendo schema do banco de dados...');
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Arquivo schema.sql não encontrado em: ${schemaPath}`);
    }

    const schema = fs.readFileSync(schemaPath, 'utf-8');
    console.log('✅ Schema lido!\n');

    // 3. Executar schema (dividir em múltiplas queries)
    console.log('3️⃣  Executando schema...');
    
    // Remover comentários e dividir em queries
    const queries = schema
      .split(';')
      .map(q => q.trim())
      .filter(q => q && !q.startsWith('--') && !q.startsWith('/*'))
      .map(q => q + ';');

    for (const query of queries) {
      try {
        await (pool as any).execute(query);
      } catch (error: any) {
        // Ignorar se tabela já existe
        if (!error.message.includes('already exists')) {
          console.warn('⚠️  Aviso:', error.message);
        }
      }
    }

    console.log('✅ Schema executado!\n');

    // 4. Verificar tabelas criadas
    console.log('4️⃣  Verificando tabelas criadas...');
    const [tables]: any = await (pool as any).execute(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()"
    );

    console.log('📊 Tabelas do banco:');
    (tables as any[]).forEach(t => {
      console.log(`   ✓ ${t.TABLE_NAME}`);
    });
    console.log();

    // 5. Resumo
    console.log('✨ Banco de dados inicializado com sucesso!');
    console.log('\n📝 Próximas ações:');
    console.log('   1. Configure suas variáveis de ambiente (.env)');
    console.log('   2. Execute: npm run dev');
    console.log('   3. Teste os endpoints com o Postman ou curl\n');

    process.exit(0);

  } catch (error: any) {
    console.error('❌ Erro ao inicializar banco de dados:', error.message);
    console.error('\n🔍 Verifique:');
    console.error('   - Credenciais no arquivo .env');
    console.error('   - Se o banco de dados foi criado no Hostinger');
    console.error('   - Se as permissões de usuário estão corretas\n');
    process.exit(1);
  }
}

initDatabase();
