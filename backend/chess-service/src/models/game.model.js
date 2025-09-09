const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  player1: {
    type: String,
    required: true
  },
  player2: {
    type: String,
    required: true
  },
  moves: [{
    type: String,
    required: true
  }],
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  },
  currentTurn: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

gameSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Método para verificar se é a vez do jogador
gameSchema.methods.isPlayerTurn = function(playerName) {
  return this.currentTurn === playerName;
};

// Método para alternar o turno
gameSchema.methods.toggleTurn = function() {
  this.currentTurn = this.currentTurn === this.player1 ? this.player2 : this.player1;
};

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;
