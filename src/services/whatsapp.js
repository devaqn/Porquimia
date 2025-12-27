const { 
  default: makeWASocket, 
  DisconnectReason, 
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

class WhatsAppService {
  constructor(authPath = './auth_info') {
    this.authPath = authPath;
    this.sock = null;
    this.qrAttempts = 0;
    this.maxQRAttempts = 3;
    
    if (!fs.existsSync(authPath)) {
      fs.mkdirSync(authPath, { recursive: true });
    }
    
    this.logger = pino({ 
      level: process.env.DEBUG === 'true' ? 'debug' : 'silent' 
    });
  }

  async connect(messageHandler) {
    try {
      console.log('📱 Iniciando conexão com WhatsApp...\n');

      const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
      
      const { version } = await fetchLatestBaileysVersion();
      console.log(`📦 Versão Baileys: ${version.join('.')}\n`);

      this.sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, this.logger)
        },
        logger: this.logger,
        printQRInTerminal: false,
        browser: ['Finance Bot', 'Chrome', '1.0.0'],
        defaultQueryTimeoutMs: 60000
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrAttempts++;
          console.log(`\n📱 QR CODE (Tentativa ${this.qrAttempts}/${this.maxQRAttempts}):\n`);
          qrcode.generate(qr, { small: true });
          console.log('\n🔍 Abra o WhatsApp no celular:');
          console.log('   1. Toque nos três pontos (⋮)');
          console.log('   2. Toque em "Aparelhos conectados"');
          console.log('   3. Toque em "Conectar um aparelho"');
          console.log('   4. Aponte a câmera para o QR Code acima\n');

          if (this.qrAttempts >= this.maxQRAttempts) {
            console.log('❌ Máximo de tentativas atingido. Reiniciando...\n');
            this.qrAttempts = 0;
          }
        }

        if (connection === 'close') {
          const shouldReconnect = 
            lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
          
          console.log('🔌 Conexão fechada:', lastDisconnect?.error?.message);
          
          if (shouldReconnect) {
            console.log('🔄 Reconectando em 5 segundos...\n');
            setTimeout(() => this.connect(messageHandler), 5000);
          } else {
            console.log('❌ Deslogado. Remova a pasta auth_info e reinicie.\n');
            process.exit(1);
          }
        }

        if (connection === 'open') {
          console.log('✅ Conectado ao WhatsApp!\n');
          this.qrAttempts = 0;
          
          const me = this.sock.user;
          console.log('═'.repeat(60));
          console.log(`📱 Conta: ${me.name || 'Sem nome'}`);
          console.log(`📞 Número: ${me.id.split(':')[0]}`);
          console.log('═'.repeat(60));
          console.log('\n👂 Bot ativo e aguardando mensagens...\n');
        }
      });

      this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
          if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue;

          if (messageHandler) {
            await messageHandler(msg);
          }
        }
      });

      return this.sock;

    } catch (error) {
      console.error('❌ Erro ao conectar:', error.message);
      throw error;
    }
  }

  async sendMessage(jid, text) {
    try {
      await this.sock.sendMessage(jid, { text });
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error.message);
    }
  }

  async replyMessage(originalMessage, text) {
    try {
      await this.sock.sendMessage(originalMessage.key.remoteJid, {
        text
      }, {
        quoted: originalMessage
      });
    } catch (error) {
      console.error('❌ Erro ao responder mensagem:', error.message);
    }
  }

  async markAsRead(jid, messageId) {
    try {
      await this.sock.readMessages([{ remoteJid: jid, id: messageId }]);
    } catch (error) {
      // Falha silenciosa
    }
  }

  async sendPresence(jid, presence = 'available') {
    try {
      await this.sock.sendPresenceUpdate(presence, jid);
    } catch (error) {
      // Falha silenciosa
    }
  }

  getMessageText(message) {
    return (
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      message.message?.imageMessage?.caption ||
      message.message?.videoMessage?.caption ||
      ''
    );
  }

  getSenderInfo(message) {
    const isGroup = message.key.remoteJid.endsWith('@g.us');
    const sender = isGroup 
      ? message.key.participant
      : message.key.remoteJid;
    
    return {
      sender,
      chatId: message.key.remoteJid,
      isGroup,
      messageId: message.key.id
    };
  }

  isFromMe(message) {
    return message.key.fromMe === true;
  }

  async disconnect() {
    if (this.sock) {
      await this.sock.logout();
      console.log('👋 Desconectado do WhatsApp');
    }
  }
}

module.exports = WhatsAppService;