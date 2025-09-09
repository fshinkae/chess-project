const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const authMiddleware = require('../middleware/auth.middleware');
const config = require('../config');

const router = express.Router();

// Configurações comuns do proxy
const proxyConfig = {
  changeOrigin: true,
  timeout: 5000,
  proxyTimeout: 5000,
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[Proxy] ${req.method} ${req.path} -> ${proxyReq.path}`);
    
    // Se houver corpo na requisição, reescreve para o proxy
    if (req.body) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[Proxy] Response: ${proxyRes.statusCode} ${req.method} ${req.path}`);
  },
  onError: (err, req, res) => {
    console.error('[Proxy] Error:', err);
    res.status(500).json({ 
      message: 'Erro ao conectar com o serviço',
      error: err.message 
    });
  }
};

// Configurações dos proxies
const loginProxy = createProxyMiddleware({
  ...proxyConfig,
  target: config.services.login.url,
  pathRewrite: {
    '^/auth': ''
  }
});

const chatProxy = createProxyMiddleware({
  ...proxyConfig,
  target: config.services.chat.url,
  pathRewrite: {
    '^/chat': ''
  }
});

const chessProxy = createProxyMiddleware({
  ...proxyConfig,
  target: config.services.chess.url,
  pathRewrite: {
    '^/chess': ''
  }
});

// Middleware para logging
router.use((req, res, next) => {
  console.log(`[Gateway] ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Rotas públicas (login/registro)
router.use('/auth', loginProxy);

// Rotas protegidas (chat e chess)
router.use('/chat', authMiddleware, chatProxy);
router.use('/chess', authMiddleware, chessProxy);

module.exports = router;