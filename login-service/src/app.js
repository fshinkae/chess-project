const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');

const app = express();

// Configuração CORS detalhada
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'], // Frontend e API Gateway
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Log de requisições
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

app.use('/', authRoutes);

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro no serviço de login:', err);
  res.status(500).json({ message: 'Erro interno do servidor' });
});

module.exports = app;