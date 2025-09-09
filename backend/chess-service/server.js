const app = require('./src/app');
const { Server } = require('socket.io');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Chess } = require('chess.js');

const PORT = 3003;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Armazena os jogos em andamento
const games = new Map();

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

  // Jogador entra em um jogo
  socket.on('join_game', ({ gameId }) => {
    console.log(`Jogador ${socket.username} entrando no jogo ${gameId}`);
    
    socket.join(gameId);

    // Cria novo jogo se não existir
    if (!games.has(gameId)) {
      games.set(gameId, {
        game: new Chess(),
        players: [socket.userId],
        currentPlayer: socket.userId,
        challenger: socket.userId,
        gameInfo: {
          challenger: socket.userId,
          challenged: null
        }
      });
    } else {
      const gameState = games.get(gameId);
      if (!gameState.players.includes(socket.userId)) {
        gameState.players.push(socket.userId);
        gameState.gameInfo.challenged = socket.userId;
      }
    }

    // Envia estado atual do jogo
    const gameState = games.get(gameId);
    socket.emit('game_state', {
      fen: gameState.game.fen(),
      currentPlayer: gameState.currentPlayer,
      gameInfo: gameState.gameInfo
    });
  });

  // Recebe movimento
  socket.on('move', ({ gameId, from, to }) => {
    console.log(`Movimento recebido de ${socket.username}:`, { from, to });
    
    const gameState = games.get(gameId);
    if (!gameState) return;

    // Verifica se é a vez do jogador
    if (gameState.currentPlayer !== socket.userId) {
      return;
    }

    try {
      const move = gameState.game.move({ from, to, promotion: 'q' });
      if (move) {
        // Alterna o jogador atual
        const currentPlayerIndex = gameState.players.indexOf(socket.userId);
        gameState.currentPlayer = gameState.players[(currentPlayerIndex + 1) % 2];

        // Notifica todos os jogadores sobre o movimento
        io.to(gameId).emit('move', { from, to });
        
        // Envia novo estado do jogo
        io.to(gameId).emit('game_state', {
          fen: gameState.game.fen(),
          currentPlayer: gameState.currentPlayer,
          gameInfo: gameState.gameInfo
        });
      }
    } catch (error) {
      console.error('Erro ao fazer movimento:', error);
    }
  });

  // Tratamento de desconexão
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Chess Service rodando na porta ${PORT}`);
});