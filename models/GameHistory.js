const mongoose = require('mongoose');

// Schema for storing completed game records
const gameHistorySchema = new mongoose.Schema({
  playerX: {
    type: String,
    required: true
  },
  playerO: {
    type: String,
    required: true
  },
  winner: {
    type: String, // 'X', 'O', or 'Draw'
    required: true
  },
  winnerUsername: {
    type: String, // actual username of winner, or 'Draw'
    required: true
  },
  totalMoves: {
    type: Number,
    required: true
  },
  playedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('GameHistory', gameHistorySchema);
