const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27018/chess_db')
  .then(() => console.log('Conectado ao MongoDB'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

app.use(cors({
  origin: /http:\/\/localhost:\d+/,
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