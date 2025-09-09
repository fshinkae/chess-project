import { io } from 'socket.io-client';

class GameService {
  constructor() {
    this.chessSocket = null;
    this.chatSocket = null;
    this.gameId = null;
    this.reconnectAttempts = 3;
    this.reconnectDelay = 2000;
  }

  async connect(token, gameId) {
    this.gameId = gameId;

    try {
      // Conexão com o serviço de xadrez
      this.chessSocket = io('http://localhost:3003', {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: this.reconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 10000
      });

      // Conexão com o serviço de chat
      this.chatSocket = io('http://localhost:3002', {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: this.reconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 10000
      });

      // Setup dos handlers de erro
      this.setupErrorHandlers(this.chessSocket, 'Chess');
      this.setupErrorHandlers(this.chatSocket, 'Chat');

      return {
        chessSocket: this.chessSocket,
        chatSocket: this.chatSocket
      };
    } catch (error) {
      console.error('Erro ao conectar aos serviços:', error);
      throw error;
    }
  }

  setupErrorHandlers(socket, serviceName) {
    socket.on('connect_error', (error) => {
      console.error(`Erro de conexão no serviço ${serviceName}:`, error.message);
    });

    socket.on('connect_timeout', () => {
      console.error(`Timeout na conexão com ${serviceName}`);
    });

    socket.on('error', (error) => {
      console.error(`Erro no serviço ${serviceName}:`, error);
    });

    socket.on('disconnect', (reason) => {
      console.log(`Desconectado do serviço ${serviceName}:`, reason);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log(`Reconectado ao serviço ${serviceName} após ${attemptNumber} tentativas`);
    });

    socket.on('reconnect_attempt', () => {
      console.log(`Tentando reconectar ao serviço ${serviceName}...`);
    });

    socket.on('reconnect_error', (error) => {
      console.error(`Erro na reconexão com ${serviceName}:`, error);
    });

    socket.on('reconnect_failed', () => {
      console.error(`Falha na reconexão com ${serviceName} após ${this.reconnectAttempts} tentativas`);
    });
  }

  disconnect() {
    if (this.chessSocket) {
      this.chessSocket.disconnect();
      this.chessSocket = null;
    }
    if (this.chatSocket) {
      this.chatSocket.disconnect();
      this.chatSocket = null;
    }
  }

  // Métodos para o jogo de xadrez
  sendMove(from, to) {
    if (!this.chessSocket?.connected) {
      console.error('Socket do xadrez não está conectado');
      return false;
    }

    try {
      this.chessSocket.emit('move', {
        gameId: this.gameId,
        from,
        to
      });
      return true;
    } catch (error) {
      console.error('Erro ao enviar movimento:', error);
      return false;
    }
  }

  // Métodos para o chat
  sendMessage(content) {
    if (!this.chatSocket?.connected) {
      console.error('Socket do chat não está conectado');
      return false;
    }

    try {
      this.chatSocket.emit('game_message', {
        gameId: this.gameId,
        content
      });
      return true;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return false;
    }
  }
}

export default new GameService();