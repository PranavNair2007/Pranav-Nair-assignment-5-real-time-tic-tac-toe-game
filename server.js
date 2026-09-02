// ============================================
// Real-Time Tic Tac Toe - Server
// Node.js + Express + Socket.io + MongoDB
// ============================================

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const path = require('path');

const GameHistory = require('./models/GameHistory');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Database Connection ----------
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tic-tac-toe')
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

// ---------- REST endpoint to fetch game history ----------
app.get('/api/history', async (req, res) => {
  try {
    const history = await GameHistory.find().sort({ playedAt: -1 }).limit(20);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ============================================
// In-memory Game State
// ============================================
// Only ever holds up to 2 players. Reset after every game.
let players = []; // [{ id, username, symbol }]
let board = Array(8 + 1).fill(null); // 9 cells, index 0-8
let currentTurn = 'X';
let gameActive = false;
let moveCount = 0;

const WIN_PATTERNS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6]             // diagonals
];

function checkWinner(b) {
  for (const [a, c, d] of WIN_PATTERNS) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) {
      return b[a]; // 'X' or 'O'
    }
  }
  if (b.every((cell) => cell !== null)) return 'Draw';
  return null;
}

function resetGameState() {
  board = Array(9).fill(null);
  currentTurn = 'X';
  gameActive = false;
  moveCount = 0;
}

async function saveGameHistory(winnerSymbol) {
  try {
    const playerX = players.find((p) => p.symbol === 'X');
    const playerO = players.find((p) => p.symbol === 'O');

    let winnerUsername = 'Draw';
    if (winnerSymbol === 'X') winnerUsername = playerX ? playerX.username : 'X';
    if (winnerSymbol === 'O') winnerUsername = playerO ? playerO.username : 'O';

    const record = new GameHistory({
      playerX: playerX ? playerX.username : 'Unknown',
      playerO: playerO ? playerO.username : 'Unknown',
      winner: winnerSymbol,
      winnerUsername,
      totalMoves: moveCount
    });

    await record.save();
    console.log('💾 Game history saved:', record._id);
  } catch (err) {
    console.error('❌ Error saving game history:', err.message);
  }
}

function broadcastPlayers() {
  io.emit('players-update', {
    players: players.map((p) => ({ username: p.username, symbol: p.symbol })),
    count: players.length
  });
}

// ============================================
// Socket.io Event Handling
// ============================================
io.on('connection', (socket) => {
  console.log(`🔌 New connection: ${socket.id}`);

  // ---------- USER LOGIN ----------
  socket.on('user-login', (username) => {
    username = (username || '').trim();

    if (!username) {
      socket.emit('login-error', 'Username cannot be empty.');
      return;
    }

    if (players.length >= 2) {
      socket.emit('login-error', 'Game room is full. Only 2 players allowed.');
      return;
    }

    const nameTaken = players.some(
      (p) => p.username.toLowerCase() === username.toLowerCase()
    );
    if (nameTaken) {
      socket.emit('login-error', 'That username is already taken in this game.');
      return;
    }

    const symbol = players.length === 0 ? 'X' : 'O';
    const player = { id: socket.id, username, symbol };
    players.push(player);

    socket.emit('login-success', { username, symbol });
    broadcastPlayers();

    console.log(`👤 ${username} joined as ${symbol}`);

    // Start the game once 2 players have joined
    if (players.length === 2) {
      gameActive = true;
      board = Array(9).fill(null);
      currentTurn = 'X';
      moveCount = 0;

      io.emit('game-start', {
        board,
        currentTurn,
        players: players.map((p) => ({ username: p.username, symbol: p.symbol }))
      });
      console.log('🎮 Game started!');
    }
  });

  // ---------- MAKE MOVE ----------
  socket.on('make-move', ({ index, symbol }) => {
    const player = players.find((p) => p.id === socket.id);

    if (!player) {
      socket.emit('login-error', 'You are not part of this game.');
      return;
    }
    if (!gameActive) {
      return; // ignore moves when no active game
    }
    if (player.symbol !== symbol || currentTurn !== symbol) {
      return; // not this player's turn, ignore silently
    }
    if (index < 0 || index > 8 || board[index] !== null) {
      return; // invalid or already-occupied cell
    }

    // Apply the move
    board[index] = symbol;
    moveCount++;

    io.emit('move-made', { index, symbol, board });

    const result = checkWinner(board);

    if (result) {
      gameActive = false;
      const winnerUsername =
        result === 'Draw'
          ? null
          : players.find((p) => p.symbol === result)?.username;

      io.emit('game-over', {
        result, // 'X', 'O', or 'Draw'
        winnerUsername,
        board
      });

      saveGameHistory(result);
      console.log(`🏁 Game over. Result: ${result}`);
    } else {
      currentTurn = currentTurn === 'X' ? 'O' : 'X';
      io.emit('turn-update', { currentTurn });
    }
  });

  // ---------- RESET GAME ----------
  socket.on('reset-game', () => {
    resetGameState();
    players = []; // per assignment spec: users must log in again after reset

    io.emit('game-reset');
    broadcastPlayers();
    console.log('🔄 Game reset. All players must log in again.');
  });

  // ---------- DISCONNECT ----------
  socket.on('disconnect', () => {
    const wasPlaying = players.some((p) => p.id === socket.id);
    players = players.filter((p) => p.id !== socket.id);

    console.log(`❌ Disconnected: ${socket.id}`);

    if (wasPlaying) {
      // Any disconnect during/after a game invalidates the current session
      resetGameState();
      io.emit('game-reset', { reason: 'A player disconnected. Please log in again.' });
    }

    broadcastPlayers();
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
