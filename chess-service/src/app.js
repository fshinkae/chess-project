const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Log de requisições
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro no serviço de xadrez:', err);
  res.status(500).json({ message: 'Erro interno do servidor' });
});

module.exports = app;