const NLPProcessor = require('../services/nlp');
const ReportGenerator = require('../services/reports');

class MessageHandler {
  constructor(dao, whatsappService) {
    this.dao = dao;
    this.whatsapp = whatsappService;
    this.nlp = new NLPProcessor();
    this.reports = new ReportGenerator(dao);
    
    this.recentlyProcessed = new Set();
  }

  async process(message) {
    try {
      if (this.whatsapp.isFromMe(message)) {
        return;
      }

      const text = this.whatsapp.getMessageText(message);
      if (!text || text.trim() === '') return;

      const { sender, chatId, isGroup, messageId } = this.whatsapp.getSenderInfo(message);

      if (process.env.DEBUG === 'true') {
        console.log(`\n📨 Mensagem de ${sender}:`);
        console.log(`   Texto: "${text}"`);
        console.log(`   Chat: ${chatId}`);
        console.log(`   Grupo: ${isGroup ? 'Sim' : 'Não'}\n`);
      }

      const messageKey = `${sender}-${messageId}`;
      if (this.recentlyProcessed.has(messageKey)) {
        return;
      }
      this.recentlyProcessed.add(messageKey);
      setTimeout(() => this.recentlyProcessed.delete(messageKey), 30000);

      await this.whatsapp.markAsRead(chatId, messageId);
      await this.whatsapp.sendPresence(chatId, 'composing');

      let user = this.dao.getUserByWhatsAppId(sender);
      if (!user) {
        const name = message.pushName || sender.split('@')[0];
        user = this.dao.upsertUser(sender, name);
        console.log(`👤 Novo usuário: ${name} (${sender})`);
        
        await this.whatsapp.replyMessage(
          message,
          this.reports.generateWelcomeMessage(name)
        );
        await this.whatsapp.sendPresence(chatId, 'available');
        return;
      }

      if (isGroup) {
        const groupName = chatId.split('@')[0];
        this.dao.upsertGroup(chatId, groupName);
      }

      const processed = this.nlp.processMessage(text);

      switch (processed.type) {
        case 'command':
          await this.handleCommand(processed, user, message);
          break;
        
        case 'expense':
          await this.handleExpense(processed, user, message);
          break;
        
        default:
          break;
      }

      await this.whatsapp.sendPresence(chatId, 'available');

    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
    }
  }

  async handleCommand(command, user, message) {
    let response = '';

    switch (command.command) {
      case 'setBalance':
        if (command.amount && command.amount > 0) {
          this.dao.setInitialBalance(user.whatsapp_id, command.amount);
          response = `✅ *Saldo inicial definido!*\n\n💰 Valor: ${this.reports.formatMoney(command.amount)}\n\nAgora você pode registrar seus gastos!`;
          console.log(`💰 ${user.name}: saldo ${command.amount}`);
        } else {
          response = '❌ Valor inválido! Use: `/saldo 1000`';
        }
        break;

      case 'getBalance':
        response = this.reports.generateBalanceReport(user);
        break;

      case 'reportDaily':
        response = this.reports.generateDailyReport(user.id);
        break;

      case 'reportWeekly':
        response = this.reports.generateWeeklyReport(user.id);
        break;

      case 'reportMonthly':
        response = this.reports.generateMonthlyReport(user.id);
        break;

      case 'help':
        response = this.reports.generateHelpMessage();
        break;

      case 'start':
        response = this.reports.generateWelcomeMessage(user.name);
        break;

      default:
        response = '❓ Comando não reconhecido. Use `/ajuda`';
    }

    if (response) {
      await this.whatsapp.replyMessage(message, response);
    }
  }

  async handleExpense(expense, user, message) {
    const { chatId, messageId } = this.whatsapp.getSenderInfo(message);

    if (!this.nlp.isValidAmount(expense.amount)) {
      await this.whatsapp.replyMessage(
        message,
        '❌ Valor inválido! Deve ser entre R$ 0,01 e R$ 1.000.000,00'
      );
      return;
    }

    if (user.initial_balance === 0) {
      await this.whatsapp.replyMessage(
        message,
        '⚠️ Defina seu saldo inicial primeiro!\n\nUse: `/saldo 1000`'
      );
      return;
    }

    try {
      const categoryId = this.dao.identifyCategory(expense.description);
      const category = this.dao.getCategoryById(categoryId);

      const savedExpense = this.dao.createExpense({
        userId: user.id,
        amount: expense.amount,
        description: expense.description,
        categoryId: categoryId,
        chatId: chatId,
        messageId: messageId
      });

      const updatedUser = this.dao.getUserByWhatsAppId(user.whatsapp_id);

      const confirmation = this.reports.generateExpenseConfirmation(
        savedExpense,
        updatedUser,
        category
      );

      await this.whatsapp.replyMessage(message, confirmation);

      console.log(`💸 ${user.name}: ${this.reports.formatMoney(expense.amount)} - ${expense.description}`);

      if (updatedUser.current_balance < 0) {
        await this.whatsapp.sendMessage(
          chatId,
          '🚨 *ATENÇÃO!* Você está no vermelho!'
        );
      } else if (updatedUser.current_balance < updatedUser.initial_balance * 0.1) {
        await this.whatsapp.sendMessage(
          chatId,
          '⚠️ *AVISO!* Menos de 10% do saldo restante!'
        );
      }

    } catch (error) {
      console.error('❌ Erro ao registrar gasto:', error);
      await this.whatsapp.replyMessage(
        message,
        '❌ Erro ao registrar gasto. Tente novamente.'
      );
    }
  }
}

module.exports = MessageHandler;