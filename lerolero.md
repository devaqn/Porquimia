whatsapp-bot-native/
├── package.json
├── index.js
├── .env.example
├── .gitignore
├── README.md
└── src/
    ├── services/
    │   ├── whatsapp.js
    │   ├── nlp.js
    │   └── reports.js
    ├── handlers/
    │   └── messageHandler.js
    └── database/
        ├── schema.js
        └── dao.js








        4. COMO RODAR NO TERMUX DO ZERO
Passo 1: Preparar Termux
bash# Abrir Termux
# Atualizar pacotes
pkg update && pkg upgrade -y

# Instalar Node.js
pkg install nodejs -y

# Verificar instalação
node --version  # Deve mostrar v18 ou superior
npm --version
Passo 2: Criar Projeto
bash# Ir para home
cd ~

# Criar pasta do projeto
mkdir whatsapp-bot-native
cd whatsapp-bot-native

# Criar estrutura de pastas
mkdir -p src/services src/handlers src/database
Passo 3: Copiar Arquivos
bash# Copiar TODOS os arquivos que foram entregues acima
# Respeitando a hierarquia:
# - package.json (raiz)
# - index.js (raiz)
# - .env.example (raiz)
# - .gitignore (raiz)
# - README.md (raiz)
# - src/services/whatsapp.js
# - src/services/nlp.js
# - src/services/reports.js
# - src/handlers/messageHandler.js
# - src/database/schema.js
# - src/database/dao.js
Passo 4: Instalar Dependências
bashnpm install
Passo 5: Configurar (Opcional)
bash# Copiar exemplo de .env
cp .env.example .env

# Editar se necessário (opcional)
nano .env
Passo 6: Iniciar Bot
bashnode index.js
```

### Passo 7: Conectar WhatsApp
```
1. QR Code aparecerá no terminal
2. No seu WhatsApp:
   - Toque nos 3 pontos (⋮)
   - Aparelhos conectados
   - Conectar um aparelho
3. Aponte câmera para o QR Code
4. Aguarde "✅ Conectado!"
```

### Passo 8: Testar
```
No WhatsApp, envie para o bot:
1. /start
2. /saldo 1000
3. gastei 50 no mercado
4. /saldo
5. /relatorio mensal
Passo 9: Manter Rodando
bash# Para que o bot continue rodando:
# 1. Não feche o Termux
# 2. Ou use: Termux → Menu → Acquire Wakelock
# 3. Ou instale Termux:Boot para iniciar automaticamente
Comandos Úteis
bash# Parar bot: Ctrl + C

# Reiniciar sessão (se der problema):
rm -rf auth_info/
node index.js

# Ver logs em tempo real:
DEBUG=true node index.js

# Backup dos dados:
cp database/finance.db ~/backup_finance.db
cp -r auth_info ~/backup_auth/

✅ PROJETO PRONTO!
Você agora tem um bot financeiro WhatsApp 100% funcional rodando no seu Android via Termux!