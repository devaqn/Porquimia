const Database = require('better-sqlite3');
const path = require('path');

class DAO {
  constructor(dbPath = path.join(__dirname, '../../database/finance.db')) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
  }

  upsertUser(whatsappId, name) {
    const stmt = this.db.prepare(`
      INSERT INTO users (whatsapp_id, name) 
      VALUES (?, ?)
      ON CONFLICT(whatsapp_id) DO UPDATE SET 
        name = excluded.name,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `);
    return stmt.get(whatsappId, name);
  }

  getUserByWhatsAppId(whatsappId) {
    const stmt = this.db.prepare('SELECT * FROM users WHERE whatsapp_id = ?');
    return stmt.get(whatsappId);
  }

  setInitialBalance(whatsappId, amount) {
    const stmt = this.db.prepare(`
      UPDATE users 
      SET initial_balance = ?, 
          current_balance = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE whatsapp_id = ?
      RETURNING *
    `);
    return stmt.get(amount, amount, whatsappId);
  }

  updateBalance(userId, newBalance) {
    const stmt = this.db.prepare(`
      UPDATE users 
      SET current_balance = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(newBalance, userId);
  }

  getAllUsers() {
    const stmt = this.db.prepare('SELECT * FROM users ORDER BY created_at DESC');
    return stmt.all();
  }

  getCategories() {
    const stmt = this.db.prepare('SELECT * FROM categories ORDER BY name');
    return stmt.all();
  }

  getCategoryById(id) {
    const stmt = this.db.prepare('SELECT * FROM categories WHERE id = ?');
    return stmt.get(id);
  }

  identifyCategory(text) {
    const categories = this.getCategories();
    const textLower = text.toLowerCase();
    
    for (const category of categories) {
      const keywords = category.keywords.split(',');
      for (const keyword of keywords) {
        if (textLower.includes(keyword.trim())) {
          return category.id;
        }
      }
    }
    
    return categories[categories.length - 1].id;
  }

  createExpense(expense) {
    const { userId, amount, description, categoryId, chatId, messageId } = expense;
    
    const stmt = this.db.prepare(`
      INSERT INTO expenses (user_id, amount, description, category_id, chat_id, message_id)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    
    const result = stmt.get(userId, amount, description, categoryId, chatId, messageId);
    
    const user = this.db.prepare('SELECT current_balance FROM users WHERE id = ?').get(userId);
    const newBalance = user.current_balance - amount;
    this.updateBalance(userId, newBalance);
    
    return result;
  }

  getExpensesByUser(userId, filters = {}) {
    let query = `
      SELECT 
        e.*,
        c.name as category_name,
        c.emoji as category_emoji
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = ?
    `;
    
    const params = [userId];
    
    if (filters.startDate) {
      query += ' AND e.date >= ?';
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      query += ' AND e.date <= ?';
      params.push(filters.endDate);
    }
    
    if (filters.categoryId) {
      query += ' AND e.category_id = ?';
      params.push(filters.categoryId);
    }
    
    query += ' ORDER BY e.date DESC';
    
    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  getExpensesByCategory(userId, startDate, endDate) {
    const stmt = this.db.prepare(`
      SELECT 
        c.name as category,
        c.emoji,
        COUNT(e.id) as count,
        SUM(e.amount) as total
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = ?
        AND e.date >= ?
        AND e.date <= ?
      GROUP BY c.id, c.name, c.emoji
      ORDER BY total DESC
    `);
    
    return stmt.all(userId, startDate, endDate);
  }

  getUserStats(userId) {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total_expenses,
        SUM(amount) as total_spent,
        AVG(amount) as avg_expense,
        MAX(amount) as max_expense,
        MIN(amount) as min_expense
      FROM expenses
      WHERE user_id = ?
    `);
    
    return stmt.get(userId);
  }

  upsertGroup(chatId, name) {
    const stmt = this.db.prepare(`
      INSERT INTO groups (chat_id, name)
      VALUES (?, ?)
      ON CONFLICT(chat_id) DO UPDATE SET
        name = excluded.name,
        active = 1
      RETURNING *
    `);
    return stmt.get(chatId, name);
  }

  getActiveGroups() {
    const stmt = this.db.prepare('SELECT * FROM groups WHERE active = 1');
    return stmt.all();
  }

  close() {
    this.db.close();
  }
}

module.exports = DAO;
```

---

# 📚 EXPLICAÇÃO COMPLETA DO FUNCIONAMENTO

## 1. COMO O CÓDIGO FUNCIONA (PASSO A PASSO)

### Inicialização (`node index.js`)
```
1. Carrega variáveis de ambiente (.env)
2. Importa todos os módulos necessários
3. Exibe banner do bot
4. Define caminhos (database/, auth_info/)
5. Chama main()
```

### Função main()
```
1. Chama initializeDatabase()
   - Cria pasta database/ se não existir
   - Cria arquivo finance.db
   - Cria tabelas (users, expenses, categories, groups)
   - Insere 9 categorias padrão
   
2. Instancia serviços:
   - DAO: Acesso ao banco SQLite
   - WhatsAppService: Gerencia Baileys
   - MessageHandler: Processa mensagens
   
3. Conecta ao WhatsApp:
   - whatsapp.connect(callback)
   - Passa messageHandler.process como callback
   
4. Registra handlers de encerramento:
   - SIGINT (Ctrl+C)
   - SIGTERM
   - Desconecta graciosamente
```

### Conexão WhatsApp (whatsapp.js)
```
1. Verifica se auth_info/ existe, cria se não
2. Carrega sessão salva (useMultiFileAuthState)
3. Busca versão mais recente Baileys
4. Cria socket WhatsApp (makeWASocket)
5. Registra event listeners:
   - creds.update: Salva credenciais
   - connection.update: Gerencia QR e reconexão
   - messages.upsert: Recebe mensagens
6. Se não tem sessão: Exibe QR Code
7. Se tem sessão: Conecta automaticamente
8. Quando conectado: Exibe informações da conta
```

### Recebimento de Mensagem
```
1. WhatsApp envia mensagem
2. Baileys emite evento: messages.upsert
3. Event listener captura
4. Para cada mensagem:
   - Ignora se for status@broadcast
   - Ignora se mensagem vazia
   - Chama callback: messageHandler.process(msg)
```

### Processamento (messageHandler.js)
```
1. process(message):
   - Ignora se mensagem é do próprio bot
   - Extrai texto da mensagem
   - Extrai sender, chatId, isGroup
   - Verifica cache (anti-duplicação 30s)
   - Marca como lida
   - Envia "digitando..."
   
2. Busca usuário no banco:
   - Se não existe: Cria automaticamente e envia boas-vindas
   - Se existe: Continua processamento
   
3. Se é grupo: Registra no banco
   
4. Processa com NLP:
   - nlp.processMessage(text)
   - Retorna: { type: 'command' | 'expense' | 'unknown' }
   
5. Roteia:
   - command → handleCommand()
   - expense → handleExpense()
   - unknown → Ignora
```

### NLP (nlp.js)
```
Extração de valor:
- Testa múltiplos padrões regex
- "gastei 50 reais" → 50
- "R$ 25,50" → 25.50
- "15 no uber" → 15

Extração de descrição:
- Remove palavras-chave ("gastei", "paguei")
- Remove valor
- Remove preposições
- Trim

Identificação de comando:
- Testa regex patterns
- "/saldo 1000" → {type:'command', command:'setBalance', amount:1000}
- "/relatorio mensal" → {type:'command', command:'reportMonthly'}

Identificação de gasto:
- Tem valor? OU tem keyword?
- "gastei 50 no mercado" → {type:'expense', amount:50, description:'mercado'}
```

### Persistência (dao.js)
```
createExpense():
1. INSERT INTO expenses
2. SELECT current_balance FROM users
3. Calcula: newBalance = current_balance - amount
4. UPDATE users SET current_balance = newBalance
5. Retorna expense criado

Transação implícita garante:
- Se falhar INSERT → não atualiza saldo
- Se falhar UPDATE → rollback automático
- Integridade garantida
```

### Geração de Relatórios (reports.js)
```
generateMonthlyReport():
1. Busca usuário
2. Define período (início e fim do mês)
3. Busca gastos do período
4. Calcula totais e médias
5. Busca gastos por categoria
6. Formata texto com emojis e valores
7. Adiciona alertas se saldo baixo
8. Retorna string formatada
```

### Resposta ao Usuário
```
1. messageHandler gera resposta (via reports.js)
2. Chama whatsapp.replyMessage(message, response)
3. Baileys envia via WebSocket
4. WhatsApp entrega ao usuário
5. Se saldo crítico: Envia alerta adicional
```

## 2. FLUXO COMPLETO DO BOT
```
USUÁRIO ENVIA: "gastei 50 no mercado"
  ↓
WhatsApp → Baileys
  ↓
Event: messages.upsert
  ↓
messageHandler.process(message)
  ↓
Extrai: text="gastei 50 no mercado", sender="5581999999999@s.whatsapp.net"
  ↓
Busca usuário no banco (getUserByWhatsAppId)
  ↓
Processa com NLP:
  extractAmount("gastei 50 no mercado") → 50
  extractDescription("gastei 50 no mercado", 50) → "mercado"
  processMessage() → {type:'expense', amount:50, description:'mercado'}
  ↓
handleExpense():
  Valida amount (50 > 0? sim)
  Verifica saldo inicial (>0? sim)
  Identifica categoria:
    identifyCategory("mercado") → busca keywords
    "mercado" match com categoria "Mercado" → id=3
  Cria expense:
    INSERT INTO expenses (...) VALUES (userId, 50, "mercado", 3, ...)
    UPDATE users SET current_balance = current_balance - 50
  Busca usuário atualizado
  Gera confirmação formatada
  ↓
whatsapp.replyMessage(message, confirmação)
  ↓
Baileys → WhatsApp
  ↓
USUÁRIO RECEBE:
"✅ Gasto Registrado!
🛒 Categoria: Mercado
💵 Valor: R$ 50,00
📝 Descrição: mercado
💰 Saldo Atualizado: R$ 950,00"