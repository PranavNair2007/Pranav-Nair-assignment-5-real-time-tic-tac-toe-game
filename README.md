# 🎮 Real-Time Tic Tac Toe

A real-time multiplayer Tic Tac Toe game built with **Node.js**, **Express**, **Socket.io**, and **MongoDB**.

## ✨ Features

- Username-based login — first player gets **X**, second gets **O**
- Maximum 2 players per game (3rd connection is rejected with an error)
- Real-time move synchronization across all connected clients
- Full win/draw detection with turn management
- Winner announcement modal with a highlighted winning line
- Game history stored in MongoDB (players, winner, move count, timestamp) and displayed on the page
- Auto-reset after a game ends (or on disconnect) — players must log in again
- Responsive UI that works on desktop and mobile
- Live connection status and active-player count

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js, Socket.io
- **Database:** MongoDB with Mongoose
- **Frontend:** HTML5, CSS3, vanilla JavaScript

## 📁 Project Structure

```
tic-tac-toe/
├── server.js              # Express + Socket.io server, game logic
├── package.json
├── .env.example           # Copy to .env and fill in your MongoDB URI
├── models/
│   └── GameHistory.js     # Mongoose schema for saved games
└── public/
    ├── index.html
    ├── style.css
    └── script.js
```

## 🚀 Setup Instructions

### 1. Install dependencies

```bash
cd tic-tac-toe
npm install
```

### 2. Configure the database

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then set `MONGODB_URI` to either:

- **Local MongoDB:** `mongodb://127.0.0.1:27017/tic-tac-toe` (make sure `mongod` is running locally)
- **MongoDB Atlas (cloud):** get the connection string from your Atlas cluster, e.g.
  `mongodb+srv://<username>:<password>@cluster0.mongodb.net/tic-tac-toe`

### 3. Run the server

```bash
npm start
```

For auto-restart during development:

```bash
npm run dev
```

### 4. Play

Open `http://localhost:3000` in **two separate browser tabs/windows** (or two devices on the same network), log in with two different usernames, and play!

## 🔌 Socket.io Events

| Event | Direction | Payload | Purpose |
|---|---|---|---|
| `user-login` | client → server | `username` | Request to join |
| `login-success` | server → client | `{ username, symbol }` | Confirms join + assigned symbol |
| `login-error` | server → client | `message` | Rejects join (room full, name taken, etc.) |
| `players-update` | server → client | `{ players, count }` | Broadcasts current player list |
| `game-start` | server → client | `{ board, currentTurn, players }` | Sent once 2 players have joined |
| `make-move` | client → server | `{ index, symbol }` | Player attempts a move |
| `move-made` | server → client | `{ index, symbol, board }` | Broadcasts the applied move |
| `turn-update` | server → client | `{ currentTurn }` | Whose turn it is next |
| `game-over` | server → client | `{ result, winnerUsername, board }` | Winner or draw announcement |
| `reset-game` | client → server | — | Request to reset after game over |
| `game-reset` | server → client | `{ reason? }` | Confirms reset; clients return to login |
| `disconnect` | (built-in) | — | Cleans up state, notifies remaining player |

## 🗄️ Database Schema (`GameHistory`)

| Field | Type | Description |
|---|---|---|
| `playerX` | String | Username of player X |
| `playerO` | String | Username of player O |
| `winner` | String | `'X'`, `'O'`, or `'Draw'` |
| `winnerUsername` | String | Username of the winner, or `'Draw'` |
| `totalMoves` | Number | Total moves made in the game |
| `playedAt` | Date | Timestamp (defaults to now) |

Game history is exposed via `GET /api/history` and rendered on the page under "Recent Games".

## 📝 Notes

- Game state (board, turns, active players) is kept in memory on the server; only completed games are persisted to MongoDB.
- If a player disconnects mid-game, the game resets and the remaining player must log in again, per the assignment spec.
- To switch to Supabase or Firebase instead of MongoDB, replace `models/GameHistory.js` and the `saveGameHistory()` / `/api/history` logic in `server.js` with the equivalent client calls — the rest of the app (Socket.io events, frontend) does not need to change.

## 👤 Author

Pranav Nair 
