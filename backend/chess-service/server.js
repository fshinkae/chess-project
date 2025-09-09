const app = require('./src/app');
const { Server } = require('socket.io');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Chess } = require('chess.js');

const PORT = 3003;

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

// Armazena os jogos em andamento
const games = new Map();

// Armazena os timers de revanche
const rematches = new Map();

// Armazena as propostas de empate
const drawOffers = new Map();

// Tempo limite para aceitar empate (30 segundos)
const DRAW_OFFER_TIMEOUT = 30000;

// Tempo limite para aceitar revanche (30 segundos)
const REMATCH_TIMEOUT = 30000;
const INITIAL_TIME = 10 * 60 * 1000; // 10 minutos em milissegundos

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
        },
        timeControl: {
          [socket.userId]: INITIAL_TIME,
          lastMoveTime: Date.now()
        }
      });
    } else {
      const gameState = games.get(gameId);
      if (!gameState.players.includes(socket.userId)) {
        gameState.players.push(socket.userId);
        gameState.gameInfo.challenged = socket.userId;
        gameState.timeControl[socket.userId] = INITIAL_TIME;
      }
    }

    // Envia estado atual do jogo
    const gameState = games.get(gameId);
    socket.emit('game_state', {
      fen: gameState.game.fen(),
      currentPlayer: gameState.currentPlayer,
      gameInfo: gameState.gameInfo,
      timeControl: gameState.timeControl
    });
  });

  // Proposta de empate
  socket.on('offer_draw', ({ gameId }) => {
    const gameState = games.get(gameId);
    if (!gameState) return;

    // Inicia o timer para a proposta de empate
    const drawTimer = setTimeout(() => {
      io.to(gameId).emit('draw_offer_expired');
      drawOffers.delete(gameId);
    }, DRAW_OFFER_TIMEOUT);

    drawOffers.set(gameId, {
      timer: drawTimer,
      offeredBy: socket.userId,
      gameId
    });

    // Notifica o outro jogador
    io.to(gameId).emit('draw_offered', {
      offeredBy: socket.userId,
      username: socket.username,
      remainingTime: DRAW_OFFER_TIMEOUT
    });
  });

  // Aceitar empate
  socket.on('accept_draw', ({ gameId }) => {
    const gameState = games.get(gameId);
    const drawOffer = drawOffers.get(gameId);
    if (!gameState || !drawOffer) return;

    // Limpa o timer
    clearTimeout(drawOffer.timer);
    drawOffers.delete(gameId);

    // Notifica os jogadores
    io.to(gameId).emit('game_over', {
      reason: 'draw_accepted',
      message: 'Empate por acordo mútuo',
      remainingTime: REMATCH_TIMEOUT
    });
  });

  // Recusar empate
  socket.on('decline_draw', ({ gameId }) => {
    const drawOffer = drawOffers.get(gameId);
    if (!drawOffer) return;

    // Limpa o timer
    clearTimeout(drawOffer.timer);
    drawOffers.delete(gameId);

    // Notifica os jogadores
    io.to(gameId).emit('draw_declined', {
      declinedBy: socket.userId,
      username: socket.username
    });
  });

  // Desistir do jogo
  socket.on('resign', ({ gameId }) => {
    const gameState = games.get(gameId);
    if (!gameState) return;

    // Encontra o outro jogador
    const winner = gameState.players.find(id => id !== socket.userId);

    // Notifica os jogadores
    io.to(gameId).emit('game_over', {
      reason: 'resignation',
      winner,
      message: `${socket.username} desistiu`,
      remainingTime: REMATCH_TIMEOUT
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
      // Verifica se o jogador está movendo as peças corretas
      const isChallenger = socket.userId === gameState.challenger;
      const piece = gameState.game.get(from);
      
      if (!piece) {
        console.log('Nenhuma peça encontrada na posição:', from);
        return;
      }

      const isWhitePiece = piece.color === 'w';
      if ((isChallenger && !isWhitePiece) || (!isChallenger && isWhitePiece)) {
        console.log('Jogador tentando mover peças do oponente');
        return;
      }

      // Atualiza o tempo do jogador atual
      const now = Date.now();
      const timeElapsed = now - gameState.timeControl.lastMoveTime;
      gameState.timeControl[socket.userId] -= timeElapsed;

      // Verifica se o tempo acabou
      if (gameState.timeControl[socket.userId] <= 0) {
        gameState.timeControl[socket.userId] = 0;
        io.to(gameId).emit('game_over', {
          reason: 'timeout',
          winner: gameState.players.find(id => id !== socket.userId),
          message: `${socket.username} perdeu por tempo`,
          remainingTime: REMATCH_TIMEOUT
        });
        return;
      }

      const move = gameState.game.move({ from, to, promotion: 'q' });
      if (move) {
        // Atualiza o último momento de movimento
        gameState.timeControl.lastMoveTime = now;

        // Alterna o jogador atual
        const currentPlayerIndex = gameState.players.indexOf(socket.userId);
        gameState.currentPlayer = gameState.players[(currentPlayerIndex + 1) % 2];

        // Notifica todos os jogadores sobre o movimento
        io.to(gameId).emit('move', { from, to });
        
        // Verifica se o jogo acabou
        if (gameState.game.isGameOver()) {
          let endReason = '';
          if (gameState.game.isCheckmate()) endReason = 'checkmate';
          else if (gameState.game.isDraw()) endReason = 'draw';
          else if (gameState.game.isStalemate()) endReason = 'stalemate';

          // Inicia o timer de revanche
          const rematchTimer = setTimeout(() => {
            // Remove a opção de revanche após o tempo limite
            io.to(gameId).emit('rematch_expired');
            rematches.delete(gameId);
          }, REMATCH_TIMEOUT);

          rematches.set(gameId, {
            timer: rematchTimer,
            players: gameState.players,
            accepted: new Set(),
            gameInfo: {
              ...gameState.gameInfo,
              // Inverte os jogadores na revanche
              challenger: gameState.gameInfo.challenged,
              challenged: gameState.gameInfo.challenger
            }
          });

          // Notifica os jogadores sobre o fim do jogo
          io.to(gameId).emit('game_over', {
            reason: endReason,
            winner: socket.userId,
            remainingTime: REMATCH_TIMEOUT
          });
        }

        // Envia novo estado do jogo
        io.to(gameId).emit('game_state', {
          fen: gameState.game.fen(),
          currentPlayer: gameState.currentPlayer,
          gameInfo: gameState.gameInfo,
          timeControl: gameState.timeControl
        });

        // Log do movimento bem-sucedido
        console.log(`Movimento válido de ${socket.username}:`, move);
      } else {
        console.log('Movimento inválido tentado por', socket.username);
      }
    } catch (error) {
      console.error('Erro ao fazer movimento:', error);
      console.error('Estado do jogo:', {
        fen: gameState.game.fen(),
        currentPlayer: gameState.currentPlayer,
        players: gameState.players,
        challenger: gameState.challenger
      });
    }
  });

  // Propor revanche
  socket.on('propose_rematch', ({ gameId }) => {
    const gameState = games.get(gameId);
    if (!gameState) return;

    // Inicia o timer para a proposta de revanche
    const rematchTimer = setTimeout(() => {
      io.to(gameId).emit('rematch_expired');
      rematches.delete(gameId);
    }, REMATCH_TIMEOUT);

    // Inverte os jogadores para a revanche
    rematches.set(gameId, {
      timer: rematchTimer,
      proposedBy: socket.userId,
      players: gameState.players,
      gameInfo: {
        challenger: gameState.gameInfo.challenged, // Quem era preto vira branco
        challenged: gameState.gameInfo.challenger  // Quem era branco vira preto
      }
    });

    // Notifica o outro jogador
    io.to(gameId).emit('rematch_proposed', {
      proposedBy: socket.userId,
      username: socket.username,
      remainingTime: REMATCH_TIMEOUT
    });
  });

  // Aceitar revanche
  socket.on('accept_rematch', ({ gameId }) => {
    const rematch = rematches.get(gameId);
    if (!rematch) return;

    // Limpa o timer
    clearTimeout(rematch.timer);

    // Cria novo jogo com os jogadores invertidos
    const newGameId = Date.now().toString();
    games.set(newGameId, {
      game: new Chess(),
      players: rematch.players,
      currentPlayer: rematch.gameInfo.challenger, // O novo challenger (antigo challenged) começa jogando
      challenger: rematch.gameInfo.challenger,    // O novo challenger (antigo challenged) será brancas
      gameInfo: rematch.gameInfo                 // Usa a configuração invertida definida na proposta
    });

    // Remove o jogo antigo e a revanche
    games.delete(gameId);
    rematches.delete(gameId);

    // Notifica os jogadores sobre o novo jogo
    io.to(gameId).emit('rematch_accepted', { newGameId });
  });

  // Recusar revanche
  socket.on('decline_rematch', ({ gameId }) => {
    const rematch = rematches.get(gameId);
    if (!rematch) return;

    // Limpa o timer e remove a revanche
    clearTimeout(rematch.timer);
    rematches.delete(gameId);

    // Notifica os jogadores
    io.to(gameId).emit('rematch_declined', {
      declinedBy: socket.userId,
      username: socket.username
    });
  });

  // Tratamento de desconexão
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Chess Service rodando na porta ${PORT}`);
});