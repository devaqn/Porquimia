require('dotenv').config();
const DatabaseSchema = require('./src/database/schema');
const DAO = require('./src/database/dao');
const WhatsAppService = require('./src/services/whatsapp');
const MessageHandler = require('./src/handlers/messageHandler');
const path = require('path');
const fs = require('fs');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║                                                           ║');
console.log('║     🤖  BOT FINANCEIRO WHATSAPP - VERSÃO NATIVA  🤖      ║');
console.log('║                                                           ║');
console.log('║           Rodando 100% no Android via Termux             ║');
console.log('║             Sem Docker • Sem VPS • Sem Custos            ║');
console.log('║                                                           ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database', 'finance.db');
const AUTH_PATH = process.env.AUTH_PATH || path.join(__dirname, 'auth_info');

function initializeDatabase() {
  console.log('📊 Passo 1/3: Inicializando banco de dados\n');
  
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  const schema = new DatabaseSchema(DB_PATH);
  schema.initialize();
  schema.close();
  
  console.log('');
}

async function main() {
  try {
    initializeDatabase();

    console.log('🔧 Passo 2/3: Configurando serviços\n');
    
    const dao = new DAO(DB_PATH);
    const whatsapp = new WhatsAppService(AUTH_PATH);
    const messageHandler = new MessageHandler(dao, whatsapp);
    
    console.log('✅ DAO inicializado');
    console.log('✅ WhatsApp service inicializado');
    console.log('✅ Message handler inicializado\n');

    console.log('📱 Passo 3/3: Conectando ao WhatsApp\n');
    
    await whatsapp.connect(async (message) => {
      await messageHandler.process(message);
    });

    process.on('SIGINT', async () => {
      console.log('\n\n🛑 Encerrando bot...');
      await whatsapp.disconnect();
      dao.close();
      console.log('👋 Bot encerrado\n');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n\n🛑 Encerrando bot...');
      await whatsapp.disconnect();
      dao.close();
      console.log('👋 Bot encerrado\n');
      process.exit(0);
    });

  } catch (error) {
    console.error('\n❌ Erro fatal:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  console.error('\n❌ Erro não capturado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n❌ Promise rejeitada:', reason);
  process.exit(1);
});

main();