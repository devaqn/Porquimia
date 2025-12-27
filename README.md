# 🤖 Bot Financeiro WhatsApp - Versão Nativa

Bot financeiro para WhatsApp rodando 100% no Android via Termux, sem Docker ou WAHA.

## 🚀 Instalação Rápida

### 1. Instalar Node.js no Termux
```bash
pkg install nodejs -y
```

### 2. Preparar Projeto
```bash
cd ~
mkdir whatsapp-bot-native
cd whatsapp-bot-native
# Copiar todos os arquivos do projeto aqui
```

### 3. Instalar Dependências
```bash
npm install
```

### 4. Iniciar
```bash
node index.js
```

### 5. Conectar WhatsApp
- QR Code aparecerá no terminal
- Abrir WhatsApp → Aparelhos conectados
- Escanear QR Code
- Aguardar "Conectado!"

## 📱 Como Usar

### Definir Saldo
```
/saldo 1000
```

### Registrar Gastos
```
gastei 50 reais no mercado
paguei 15 no uber
comprei sorvete por 3 reais
```

### Consultar Saldo
```
/saldo
```

### Relatórios
```
/relatorio diário
/relatorio semanal
/relatorio mensal
```

### Ajuda
```
/ajuda
```

## 🏷️ Categorias Automáticas

- 🍔 Alimentação
- 🚗 Transporte
- 🛒 Mercado
- 🎮 Lazer
- 💳 Contas
- 💊 Saúde
- 📚 Educação
- 👕 Vestuário
- 📝 Outros

## 📂 Estrutura
```
whatsapp-bot-native/
├── index.js                    # Inicialização
├── package.json                # Dependências
├── src/
│   ├── services/
│   │   ├── whatsapp.js        # Baileys
│   │   ├── nlp.js             # Interpretação
│   │   └── reports.js         # Relatórios
│   ├── handlers/
│   │   └── messageHandler.js  # Processamento
│   └── database/
│       ├── schema.js          # Estrutura
│       └── dao.js             # Queries
├── auth_info/                  # Sessão (criado automaticamente)
└── database/                   # SQLite (criado automaticamente)
```

## 🔧 Comandos
```bash
node index.js   # Iniciar bot
```

## ⚠️ Observações

- Manter Termux ativo (use Wakelock)
- Bateria: ~2-5% por hora
- Internet necessária
- Backup: `auth_info/` e `database/`

## 📄 Licença

MIT