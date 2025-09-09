const Game = require('../models/game.model');

const ChessController = {
  createGame: async (req, res) => {
    try {
      const { player1, player2 } = req.body;

      if (!player1 || !player2) {
        return res.status(400).json({ 
          message: 'Os nomes dos dois jogadores são obrigatórios' 
        });
      }

      const game = new Game({
        player1,
        player2,
        moves: [],
        currentTurn: player1 // Player1 sempre começa
      });

      await game.save();
      res.status(201).json(game);
    } catch (error) {
      console.error('Erro ao criar jogo:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  },

  makeMove: async (req, res) => {
    try {
      const { id } = req.params;
      const { move, player } = req.body;

      const game = await Game.findById(id);
      
      if (!game) {
        return res.status(404).json({ message: 'Jogo não encontrado' });
      }

      if (game.status !== 'active') {
        return res.status(400).json({ message: 'Este jogo já foi finalizado' });
      }

      if (!game.isPlayerTurn(player)) {
        return res.status(400).json({ message: 'Não é a vez deste jogador' });
      }

      // Adiciona o movimento à lista
      game.moves.push(move);
      
      // Alterna o turno
      game.toggleTurn();

      await game.save();
      res.json(game);
    } catch (error) {
      console.error('Erro ao fazer movimento:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  },

  getGame: async (req, res) => {
    try {
      const { id } = req.params;
      const game = await Game.findById(id);

      if (!game) {
        return res.status(404).json({ message: 'Jogo não encontrado' });
      }

      res.json(game);
    } catch (error) {
      console.error('Erro ao buscar jogo:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
};

module.exports = ChessController;
