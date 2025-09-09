const express = require('express');
const cors = require('cors');
const config = require('./config');
const gatewayRoutes = require('./routes/gateway.routes');

const app = express();

// Configuração CORS
app.use(cors(config.cors));

app.use(express.json());

// Log de requisições
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Rotas do gateway
app.use('/', gatewayRoutes);

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro no gateway:', err);
  res.status(500).json({ message: 'Erro interno do servidor' });
});

module.exports = app;