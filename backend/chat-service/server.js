const app = require('./src/app');
const { Server } = require('socket.io');
const http = require('http');
const jwt = require('jsonwebtoken');
const onlineUsers = require('./src/services/onlineUsers.service');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: /http:\/\/localhost:\d+/,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling']
});

// Middleware para autenticação do Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sua-chave-secreta');
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('Novo cliente conectado:', socket.id);

  // Adiciona usuário à lista de online e notifica todos
  const users = onlineUsers.addUser(socket.userId, socket.username, socket);
  io.emit('users_online', users);

  // Entrar em uma sala de jogo específica
  socket.on('join_game_room', ({ gameId }) => {
    console.log(`${socket.username} entrando na sala do jogo ${gameId}`);
    socket.join(gameId);
  });

  // Escuta por desafios
  socket.on('challenge', ({ targetUserId }) => {
    const targetSocket = onlineUsers.getUserSocket(targetUserId);
    if (targetSocket) {
      targetSocket.emit('challenge_received', {
        challengerId: socket.userId,
        challengerName: socket.username
      });
    }
  });

  // Escuta por recusa de desafio
  socket.on('decline_challenge', ({ challengerId }) => {
    const challengerSocket = onlineUsers.getUserSocket(challengerId);
    if (challengerSocket) {
      challengerSocket.emit('challenge_declined', {
        userId: socket.userId,
        username: socket.username
      });
    }
  });

  // Escuta por aceitação de desafio
  socket.on('accept_challenge', ({ challengerId }) => {
    const challengerSocket = onlineUsers.getUserSocket(challengerId);
    if (challengerSocket) {
      // Gera ID único para o jogo
      const gameId = Date.now().toString();
      
      // Atualiza status dos jogadores
      onlineUsers.updateUserStatus(socket.userId, 'in_game');
      onlineUsers.updateUserStatus(challengerId, 'in_game');
      
      // Notifica ambos os jogadores
      socket.emit('game_started', { gameId });
      challengerSocket.emit('game_started', { gameId });
      
      // Notifica todos sobre a atualização dos status
      io.emit('users_online', onlineUsers.getOnlineUsers());

      // Adiciona ambos os jogadores à sala do jogo
      socket.join(gameId);
      challengerSocket.join(gameId);
    }
  });

  // Escuta por mensagens do jogo
  socket.on('game_message', ({ gameId, content }) => {
    console.log(`Mensagem recebida para o jogo ${gameId}:`, content);
    
    const messageData = {
      id: Date.now().toString(),
      sender: socket.username,
      content: content,
      timestamp: new Date().toISOString()
    };

    io.to(gameId).emit('game_message', messageData);
  });

  // Escuta por mensagens gerais
  socket.on('message', (data) => {
    io.emit('message', {
      id: Date.now().toString(),
      sender: socket.username,
      content: data.content,
      timestamp: new Date().toISOString()
    });
  });

  // Tratamento de desconexão
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
    const users = onlineUsers.removeUser(socket.userId);
    io.emit('users_online', users);
  });
});

const PORT = process.env.PORT || 3002;

server.listen(PORT, () => {
  console.log(`Chat Service rodando na porta ${PORT}`);
});