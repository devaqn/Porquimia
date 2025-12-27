const Database = require('better-sqlite3');
const path = require('path');

class DatabaseSchema {
  constructor(dbPath = path.join(__dirname, '../../database/finance.db')) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  initialize() {
    console.log('🗄️  Inicializando banco de dados...');

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        whatsapp_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        initial_balance REAL DEFAULT 0.0,
        current_balance REAL DEFAULT 0.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        emoji TEXT DEFAULT '📝',
        keywords TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        chat_id TEXT NOT NULL,
        message_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories (id)
      )
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT UNIQUE NOT NULL,
        name TEXT,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
      CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
      CREATE INDEX IF NOT EXISTS idx_users_whatsapp_id ON users(whatsapp_id);
    `);

    console.log('✅ Estrutura do banco criada!');
    this.insertDefaultCategories();
  }

  insertDefaultCategories() {
    const categories = [
      { 
        name: 'Alimentação', 
        emoji: '🍔', 
        keywords: 'comida,almoço,jantar,café,lanche,restaurante,delivery,ifood,pizza,hamburger,sorvete,açai,pastel,coxinha,salgado,bebida,cerveja,refri,suco'
      },
      { 
        name: 'Transporte', 
        emoji: '🚗', 
        keywords: 'uber,taxi,ônibus,metrô,gasolina,combustível,passagem,estacionamento,pedágio,99,aplicativo,corrida'
      },
      { 
        name: 'Mercado', 
        emoji: '🛒', 
        keywords: 'mercado,supermercado,feira,compras,açougue,padaria,hortifruti,verduras,frutas,carrefour,extra,atacadão'
      },
      { 
        name: 'Lazer', 
        emoji: '🎮', 
        keywords: 'cinema,teatro,show,festa,balada,jogo,diversão,parque,viagem,passeio,netflix,streaming,spotify,ingresso'
      },
      { 
        name: 'Contas', 
        emoji: '💳', 
        keywords: 'conta,luz,água,internet,telefone,celular,aluguel,condomínio,cartão,fatura,boleto,pagamento'
      },
      { 
        name: 'Saúde', 
        emoji: '💊', 
        keywords: 'médico,remédio,farmácia,consulta,exame,hospital,dentista,plano de saúde,medicamento,drogaria'
      },
      { 
        name: 'Educação', 
        emoji: '📚', 
        keywords: 'curso,faculdade,escola,livro,material,mensalidade,matrícula,apostila,aula'
      },
      { 
        name: 'Vestuário', 
        emoji: '👕', 
        keywords: 'roupa,calça,camisa,sapato,tênis,moda,loja,shopping,calçado,blusa'
      },
      { 
        name: 'Outros', 
        emoji: '📝', 
        keywords: 'outro,diversos,variados,geral'
      }
    ];

    const insertCategory = this.db.prepare(`
      INSERT OR IGNORE INTO categories (name, emoji, keywords) 
      VALUES (?, ?, ?)
    `);

    const insertMany = this.db.transaction((cats) => {
      for (const cat of cats) {
        insertCategory.run(cat.name, cat.emoji, cat.keywords);
      }
    });

    insertMany(categories);
    console.log(`✅ ${categories.length} categorias inseridas!`);
  }

  close() {
    this.db.close();
  }

  getDatabase() {
    return this.db;
  }
}

module.exports = DatabaseSchema;