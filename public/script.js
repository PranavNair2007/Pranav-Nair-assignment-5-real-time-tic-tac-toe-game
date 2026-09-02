// ============================================
// Real-Time Tic Tac Toe - Client
// ============================================

const socket = io();

// ---- DOM references ----
const connectionStatus = document.getElementById('connectionStatus');
const connectionText = document.getElementById('connectionText');
const playerCount = document.getElementById('playerCount');

const loginScreen = document.getElementById('loginScreen');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('usernameInput');
const loginError = document.getElementById('loginError');
const waitingMsg = document.getElementById('waitingMsg');

const gameScreen = document.getElementById('gameScreen');
const boardEl = document.getElementById('board');
const cells = document.querySelectorAll('.cell');
const turnIndicator = document.getElementById('turnIndicator');
const playerXInfo = document.getElementById('playerXInfo');
const playerOInfo = document.getElementById('playerOInfo');
const playerXName = document.getElementById('playerXName');
const playerOName = document.getElementById('playerOName');
const youAreSymbol = document.getElementById('youAreSymbol');

const winnerModal = document.getElementById('winnerModal');
const winnerText = document.getElementById('winnerText');
const winnerSubtext = document.getElementById('winnerSubtext');
const winnerEmoji = document.getElementById('winnerEmoji');
const playAgainBtn = document.getElementById('playAgainBtn');

const historyList = document.getElementById('historyList');

// ---- Local state ----
let mySymbol = null;
let currentTurn = 'X';

const WIN_PATTERNS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

// ============================================
// Connection status
// ============================================
socket.on('connect', () => {
  connectionStatus.classList.remove('offline');
  connectionStatus.classList.add('online');
  connectionText.textContent = 'Connected';
});

socket.on('disconnect', () => {
  connectionStatus.classList.remove('online');
  connectionStatus.classList.add('offline');
  connectionText.textContent = 'Disconnected';
});

// ============================================
// Login
// ============================================
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  if (!username) return;
  loginError.textContent = '';
  socket.emit('user-login', username);
});

socket.on('login-success', ({ username, symbol }) => {
  mySymbol = symbol;
  youAreSymbol.textContent = symbol;
  loginError.textContent = '';
  waitingMsg.classList.remove('hidden');
  usernameInput.disabled = true;
});

socket.on('login-error', (message) => {
  loginError.textContent = message;
});

// ============================================
// Player list updates
// ============================================
socket.on('players-update', ({ players, count }) => {
  playerCount.textContent = count;

  const px = players.find((p) => p.symbol === 'X');
  const po = players.find((p) => p.symbol === 'O');

  playerXName.textContent = px ? px.username : 'Waiting...';
  playerOName.textContent = po ? po.username : 'Waiting...';
});

// ============================================
// Game start
// ============================================
socket.on('game-start', ({ board, currentTurn: turn, players }) => {
  loginScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  waitingMsg.classList.add('hidden');

  currentTurn = turn;
  renderBoard(board);
  updateTurnIndicator();

  const px = players.find((p) => p.symbol === 'X');
  const po = players.find((p) => p.symbol === 'O');
  playerXName.textContent = px ? px.username : 'Waiting...';
  playerOName.textContent = po ? po.username : 'Waiting...';
});

// ============================================
// Board interaction
// ============================================
cells.forEach((cell) => {
  cell.addEventListener('click', () => {
    const index = parseInt(cell.dataset.index, 10);
    if (!mySymbol) return;
    if (cell.classList.contains('filled')) return;
    if (currentTurn !== mySymbol) return;

    socket.emit('make-move', { index, symbol: mySymbol });
  });
});

socket.on('move-made', ({ index, symbol, board }) => {
  renderBoard(board);
});

socket.on('turn-update', ({ currentTurn: turn }) => {
  currentTurn = turn;
  updateTurnIndicator();
});

// ============================================
// Game over
// ============================================
socket.on('game-over', ({ result, winnerUsername, board }) => {
  renderBoard(board);
  highlightWinningCells(board);

  if (result === 'Draw') {
    winnerEmoji.textContent = '🤝';
    winnerText.textContent = "It's a Draw!";
    winnerSubtext.textContent = 'Well played, both of you!';
  } else {
    winnerEmoji.textContent = '🏆';
    winnerText.textContent = `${winnerUsername} Wins!`;
    winnerSubtext.textContent = `Player ${result} takes the game.`;
  }

  winnerModal.classList.remove('hidden');
  fetchHistory();
});

playAgainBtn.addEventListener('click', () => {
  socket.emit('reset-game');
});

socket.on('game-reset', (data) => {
  winnerModal.classList.add('hidden');
  gameScreen.classList.add('hidden');
  loginScreen.classList.remove('hidden');

  usernameInput.disabled = false;
  usernameInput.value = '';
  waitingMsg.classList.add('hidden');
  mySymbol = null;

  clearBoard();

  if (data && data.reason) {
    loginError.textContent = data.reason;
  } else {
    loginError.textContent = '';
  }
});

// ============================================
// Helpers
// ============================================
function renderBoard(board) {
  cells.forEach((cell, i) => {
    cell.classList.remove('win-cell');
    const value = board[i];
    if (value) {
      cell.textContent = value;
      cell.classList.add('filled', value.toLowerCase());
    } else {
      cell.textContent = '';
      cell.classList.remove('filled', 'x', 'o');
    }
  });
}

function clearBoard() {
  cells.forEach((cell) => {
    cell.textContent = '';
    cell.classList.remove('filled', 'x', 'o', 'win-cell');
  });
}

function updateTurnIndicator() {
  turnIndicator.textContent = `It's ${currentTurn}'s turn`;
  playerXInfo.classList.toggle('active', currentTurn === 'X');
  playerOInfo.classList.toggle('active', currentTurn === 'O');
}

function highlightWinningCells(board) {
  for (const [a, b, c] of WIN_PATTERNS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      [a, b, c].forEach((i) => cells[i].classList.add('win-cell'));
      return;
    }
  }
}

// ============================================
// Game history (fetched via REST endpoint)
// ============================================
async function fetchHistory() {
  try {
    const res = await fetch('/api/history');
    const history = await res.json();
    renderHistory(history);
  } catch (err) {
    console.error('Failed to load history', err);
  }
}

function renderHistory(history) {
  if (!history || history.length === 0) {
    historyList.innerHTML = '<p class="empty-text">No games played yet.</p>';
    return;
  }

  historyList.innerHTML = history
    .map((game) => {
      const date = new Date(game.playedAt).toLocaleString();
      const resultLabel =
        game.winner === 'Draw' ? 'Draw' : `${game.winnerUsername} won`;
      return `
        <div class="history-item">
          <span>${game.playerX} (X) vs ${game.playerO} (O)</span>
          <span class="winner-tag">${resultLabel}</span>
        </div>
      `;
    })
    .join('');
}

// Load history on initial page load
fetchHistory();
