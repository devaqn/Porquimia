class ReportGenerator {
  constructor(dao) {
    this.dao = dao;
  }

  formatMoney(value) {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  }

  formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  generateBalanceReport(user) {
    const percentage = user.initial_balance > 0 
      ? ((user.current_balance / user.initial_balance) * 100).toFixed(1)
      : 0;

    const spent = user.initial_balance - user.current_balance;
    
    let emoji = '💰';
    if (percentage < 20) emoji = '🚨';
    else if (percentage < 50) emoji = '⚠️';

    return `
${emoji} *SALDO ATUAL*

👤 *Usuário:* ${user.name}

💵 *Saldo Inicial:* ${this.formatMoney(user.initial_balance)}
💸 *Total Gasto:* ${this.formatMoney(spent)}
${emoji} *Saldo Restante:* ${this.formatMoney(user.current_balance)}

📊 *Percentual Restante:* ${percentage}%

_Atualizado em: ${this.formatDate(new Date())}_
`.trim();
  }

  generateDailyReport(userId) {
    const user = this.dao.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const expenses = this.dao.getExpensesByUser(userId, {
      startDate: today.toISOString(),
      endDate: tomorrow.toISOString()
    });

    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const byCategory = this.dao.getExpensesByCategory(
      userId, 
      today.toISOString(), 
      tomorrow.toISOString()
    );

    let report = `
📅 *RELATÓRIO DIÁRIO*

👤 *Usuário:* ${user.name}
📆 *Data:* ${this.formatDate(today)}

💸 *Total Gasto Hoje:* ${this.formatMoney(total)}
📝 *Número de Gastos:* ${expenses.length}

`;

    if (byCategory.length > 0) {
      report += `\n🏷️ *Por Categoria:*\n`;
      byCategory.forEach(cat => {
        report += `${cat.emoji} ${cat.category}: ${this.formatMoney(cat.total)} (${cat.count}x)\n`;
      });
    }

    if (expenses.length > 0) {
      report += `\n\n📋 *Últimos Gastos:*\n`;
      expenses.slice(0, 10).forEach(exp => {
        const time = new Date(exp.date).toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        report += `• ${time} - ${exp.description} - ${this.formatMoney(exp.amount)}\n`;
      });
    } else {
      report += `\n✅ Nenhum gasto registrado hoje!`;
    }

    return report.trim();
  }

  generateWeeklyReport(userId) {
    const user = this.dao.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const expenses = this.dao.getExpensesByUser(userId, {
      startDate: weekAgo.toISOString(),
      endDate: today.toISOString()
    });

    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const average = expenses.length > 0 ? total / 7 : 0;
    
    const byCategory = this.dao.getExpensesByCategory(
      userId,
      weekAgo.toISOString(),
      today.toISOString()
    );

    let report = `
📊 *RELATÓRIO SEMANAL*

👤 *Usuário:* ${user.name}
📆 *Período:* ${this.formatDate(weekAgo)} até ${this.formatDate(today)}

💸 *Total Gasto:* ${this.formatMoney(total)}
📝 *Número de Gastos:* ${expenses.length}
📉 *Média Diária:* ${this.formatMoney(average)}

`;

    if (byCategory.length > 0) {
      report += `\n🏷️ *Por Categoria:*\n`;
      byCategory.forEach(cat => {
        const percentage = ((cat.total / total) * 100).toFixed(1);
        report += `${cat.emoji} ${cat.category}: ${this.formatMoney(cat.total)} (${percentage}%)\n`;
      });
    }

    if (expenses.length > 0) {
      const topExpenses = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);
      report += `\n\n💰 *Maiores Gastos:*\n`;
      topExpenses.forEach((exp, idx) => {
        report += `${idx + 1}. ${exp.description} - ${this.formatMoney(exp.amount)}\n`;
      });
    }

    return report.trim();
  }

  generateMonthlyReport(userId) {
    const user = this.dao.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const expenses = this.dao.getExpensesByUser(userId, {
      startDate: monthStart.toISOString(),
      endDate: monthEnd.toISOString()
    });

    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const daysInMonth = monthEnd.getDate();
    const average = expenses.length > 0 ? total / daysInMonth : 0;
    
    const stats = this.dao.getUserStats(userId);
    
    const byCategory = this.dao.getExpensesByCategory(
      userId,
      monthStart.toISOString(),
      monthEnd.toISOString()
    );

    const monthName = monthStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    let report = `
📈 *RELATÓRIO MENSAL*

👤 *Usuário:* ${user.name}
📆 *Mês:* ${monthName}

💸 *Total Gasto:* ${this.formatMoney(total)}
📝 *Número de Gastos:* ${expenses.length}
📉 *Média Diária:* ${this.formatMoney(average)}
💰 *Gasto Médio:* ${this.formatMoney(stats.avg_expense || 0)}

`;

    if (byCategory.length > 0) {
      report += `\n🏷️ *Gastos por Categoria:*\n`;
      byCategory.forEach(cat => {
        const percentage = ((cat.total / total) * 100).toFixed(1);
        report += `${cat.emoji} ${cat.category}\n`;
        report += `   💵 ${this.formatMoney(cat.total)} (${percentage}%) - ${cat.count} gastos\n`;
      });
    }

    const remaining = user.current_balance;
    const percentageUsed = user.initial_balance > 0 
      ? ((total / user.initial_balance) * 100).toFixed(1)
      : 0;

    report += `\n\n💰 *Situação Atual:*\n`;
    report += `• Saldo Restante: ${this.formatMoney(remaining)}\n`;
    report += `• Percentual Usado: ${percentageUsed}%\n`;

    if (remaining < 0) {
      report += `\n⚠️ *ATENÇÃO:* Você está no vermelho!`;
    } else if (remaining < user.initial_balance * 0.2) {
      report += `\n⚠️ *AVISO:* Menos de 20% do saldo restante!`;
    }

    return report.trim();
  }

  generateExpenseConfirmation(expense, user, category) {
    return `
✅ *Gasto Registrado!*

${category.emoji} *Categoria:* ${category.name}
💵 *Valor:* ${this.formatMoney(expense.amount)}
📝 *Descrição:* ${expense.description}
📅 *Data:* ${this.formatDate(expense.date)}

💰 *Saldo Atualizado:* ${this.formatMoney(user.current_balance)}
`.trim();
  }

  generateHelpMessage() {
    return `
🤖 *BOT FINANCEIRO - AJUDA*

📝 *Registrar Gasto:*
Envie uma mensagem como:
- "Gastei 50 reais no mercado"
- "Paguei 15 no uber"
- "Comprei um sorvete por 3 reais"

💰 *Comandos de Saldo:*
- \`/saldo 1000\` - Define saldo inicial
- \`/saldo\` - Consulta saldo atual

📊 *Relatórios:*
- \`/relatorio diário\` - Gastos de hoje
- \`/relatorio semanal\` - Últimos 7 dias
- \`/relatorio mensal\` - Mês atual

ℹ️ *Outros Comandos:*
- \`/ajuda\` - Mostra esta mensagem
- \`/start\` - Inicia o bot

🏷️ *Categorias Automáticas:*
🍔 Alimentação | 🚗 Transporte | 🛒 Mercado
🎮 Lazer | 💳 Contas | 💊 Saúde
📚 Educação | 👕 Vestuário | 📝 Outros

_O bot identifica a categoria automaticamente baseado na descrição!_
`.trim();
  }

  generateWelcomeMessage(userName) {
    return `
👋 *Olá, ${userName}!*

Bem-vindo ao *Bot Financeiro*! 🤖💰

Eu vou ajudar você a controlar seus gastos de forma simples e automática!

🚀 *Para começar:*
1️⃣ Defina seu saldo inicial: \`/saldo 1000\`
2️⃣ Registre seus gastos naturalmente: "gastei 50 no mercado"
3️⃣ Consulte relatórios: \`/relatorio mensal\`

Digite \`/ajuda\` para ver todos os comandos disponíveis!
`.trim();
  }
}

module.exports = ReportGenerator;