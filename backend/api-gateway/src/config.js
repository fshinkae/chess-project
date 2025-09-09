const config = {
  port: process.env.PORT || 3000,
  services: {
    login: {
      url: process.env.LOGIN_SERVICE_URL || 'http://localhost:3001'
    },
    chat: {
      url: process.env.CHAT_SERVICE_URL || 'http://localhost:3002'
    },
    chess: {
      url: process.env.CHESS_SERVICE_URL || 'http://localhost:3003'
    }
  },
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
};

module.exports = config;
