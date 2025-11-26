const express = require('express');
const app = express();
const path = require('path');

const cookieParser = require('cookie-parser');

// Importar a configuração do banco PostgreSQL
const db = require('./database.js');

// Configurações do servidor
const HOST = 'localhost';
const PORT_FIXA = 3001;

// Middleware para permitir CORS (Cross-Origin Resource Sharing)
// VERSÃO CORRIGIDA - Aceita o header X-Usuario-ID
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://127.0.0.1:5500',
    'http://localhost:5500', 
    'http://127.0.0.1:5501', 
    'http://localhost:3000', 
    'http://localhost:3001',
    'http://localhost:5501',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ];
  
  const origin = req.headers.origin;
  
  // Permite qualquer origem em desenvolvimento (para testes)
  if (process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  
  // CRÍTICO: Adiciona X-Usuario-ID aos headers permitidos
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Usuario-ID');
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Expose-Headers', 'Set-Cookie');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

// serve a pasta frontend como arquivos estáticos
const caminhoFrontend = path.join(__dirname, '../frontend');
console.log('Caminho frontend:', caminhoFrontend);

app.use(express.static(caminhoFrontend));

app.use(cookieParser());

// Middleware para adicionar a instância do banco de dados às requisições
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Middlewares
app.use(express.json());

// Middleware de tratamento de erros JSON malformado
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'JSON malformado',
      message: 'Verifique a sintaxe do JSON enviado'
    });
  }
  next(err);
});

// Importando as rotas
const produtoRoutes = require('./routes/produtoRoutes');
app.use('/produto', produtoRoutes);

const carrinhoRoutes = require('./routes/carrinhoRoutes');
app.use('/carrinho', carrinhoRoutes);

const pagamentoRoutes = require('./routes/pagamentoRoutes');
app.use('/pagamento', pagamentoRoutes);

const CRUDprodutoRoutes = require('./routes/CRUDprodutoRoutes.js');
app.use('/api/produtos', CRUDprodutoRoutes);

const CRUDusuarioRoutes = require('./routes/CRUDusuarioRoutes.js');
app.use('/api/usuarios', CRUDusuarioRoutes);

const clienteRoutes = require('./routes/clienteRoutes.js');
app.use('/api/clientes', clienteRoutes);

const funcionarioRoutes = require('./routes/funcionarioRoutes.js');
app.use('/api/funcionarios', funcionarioRoutes);

const cadastroRoutes = require('./routes/cadastroRoutes.js');
app.use('/cadastrar', cadastroRoutes);

const loginRoutes = require('./routes/loginRoutes');
app.use('/login', loginRoutes);

const pedidoUsuarioRoutes = require('./routes/pedidoUsuarioRoutes');
app.use('/api/pedidos', pedidoUsuarioRoutes);

const pedidoRoutes = require('./routes/pedidoRoutes');
app.use('/api/pedidos', pedidoRoutes);

const avaliacaoRoutes = require('./routes/avaliacaoRoutes');
app.use('/api/avaliacoes', avaliacaoRoutes);

const recuperarSenhaRoutes = require('./routes/recuperarSenhaRoutes');
app.use('/api/recuperar-senha', recuperarSenhaRoutes);

// Rota padrão
app.get('/', (req, res) => {
  res.json({
    message: 'O server está funcionando - essa é a rota raiz!',
    database: 'PostgreSQL',
    timestamp: new Date().toISOString()
  });
});

// Rota para testar a conexão com o banco
app.get('/health', async (req, res) => {
  try {
    const connectionTest = await db.testConnection();

    if (connectionTest) {
      res.status(200).json({
        status: 'OK',
        message: 'Servidor e banco de dados funcionando',
        database: 'PostgreSQL',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        status: 'ERROR',
        message: 'Problema na conexão com o banco de dados',
        database: 'PostgreSQL',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Erro no health check:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Erro interno do servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Middleware global de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);

  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado',
    timestamp: new Date().toISOString()
  });
});

// Inicialização do servidor
const startServer = async () => {
  try {
    // Testar conexão com o banco antes de iniciar o servidor
    console.log(caminhoFrontend);
    console.log('Testando conexão com PostgreSQL...');
    const connectionTest = await db.testConnection();
    
    if (!connectionTest) {
      console.error('❌ Falha na conexão com PostgreSQL');
      process.exit(1);
    }
    
    console.log('✅ PostgreSQL conectado com sucesso');
    
    const PORT = process.env.PORT || PORT_FIXA;
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando em http://${HOST}:${PORT}`);
      console.log(`📊 Health check disponível em http://${HOST}:${PORT}/health`);
      console.log(`🗄️ Banco de dados: PostgreSQL`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
};

// Tratamento de sinais para encerramento graceful
process.on('SIGINT', async () => {
  console.log('\n🔄 Encerrando servidor...');
  
  try {
    await db.pool.end();
    console.log('✅ Conexões com PostgreSQL encerradas');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao encerrar conexões:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 SIGTERM recebido, encerrando servidor...');
  
  try {
    await db.pool.end();
    console.log('✅ Conexões com PostgreSQL encerradas');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao encerrar conexões:', error);
    process.exit(1);
  }
});

// Middleware para rotas não encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    message: `A rota ${req.originalUrl} não existe`,
    timestamp: new Date().toISOString()
  });
});

// Iniciar o servidor
startServer();