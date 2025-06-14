const express = require("express");
const socketIo = require("socket.io");
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});

// Game state management
const matchMaking = [];
const activeGames = new Map();
const playerSockets = new Map();

// Game room class to manage individual games
class GameRoom {
  constructor(player1, player2) {
    this.id = uuidv4();
    
    // Randomly assign symbols
    const symbols = ['X', 'O'];
    const firstSymbol = symbols[Math.floor(Math.random() * 2)];
    const secondSymbol = firstSymbol === 'X' ? 'O' : 'X';

    this.players = {
      [player1.socketId]: { 
        name: player1.playerName, 
        symbol: firstSymbol, 
        socketId: player1.socketId 
      },
      [player2.socketId]: { 
        name: player2.playerName, 
        symbol: secondSymbol, 
        socketId: player2.socketId 
      }
    };
    
    this.currentPlayer = 'X'; // X always starts
    this.board = Array(3).fill().map(() => Array(3).fill(''));
    this.winner = null;
    this.gameHistory = [];
    this.moveCount = 0;
  }

  getPlayerBySocket(socketId) {
    return this.players[socketId];
  }

  getOpponentSocket(socketId) {
    const playerSockets = Object.keys(this.players);
    return playerSockets.find(id => id !== socketId);
  }

  makeMove(socketId, row, col) {
    const player = this.getPlayerBySocket(socketId);
    
    // Validate move
    if (!player || this.winner || player.symbol !== this.currentPlayer) {
      return { success: false, error: 'Invalid move' };
    }

    if (row < 0 || row >= 3 || col < 0 || col >= 3 || this.board[row][col] !== '') {
      return { success: false, error: 'Cell already occupied' };
    }

    // Make the move
    this.board[row][col] = player.symbol;
    this.moveCount++;
    
    // Add to history
    this.gameHistory.push({
      row,
      col,
      player: player.symbol,
      moveNumber: this.moveCount,
      playerName: player.name
    });

    // Check for winner
    this.checkWinner();

    // Switch player if no winner
    if (!this.winner) {
      this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }

    return { success: true };
  }

  checkWinner() {
    // Check rows
    for (let i = 0; i < 3; i++) {
      if (this.board[i][0] && this.board[i][0] === this.board[i][1] && this.board[i][1] === this.board[i][2]) {
        this.winner = this.board[i][0];
        return;
      }
    }

    // Check columns
    for (let i = 0; i < 3; i++) {
      if (this.board[0][i] && this.board[0][i] === this.board[1][i] && this.board[1][i] === this.board[2][i]) {
        this.winner = this.board[0][i];
        return;
      }
    }

    // Check diagonals
    if (this.board[0][0] && this.board[0][0] === this.board[1][1] && this.board[1][1] === this.board[2][2]) {
      this.winner = this.board[0][0];
      return;
    }

    if (this.board[0][2] && this.board[0][2] === this.board[1][1] && this.board[1][1] === this.board[2][0]) {
      this.winner = this.board[0][2];
      return;
    }

    // Check for tie
    if (this.moveCount === 9) {
      this.winner = 'tie';
    }
  }

  getGameState() {
    return {
      board: this.board.map(row => [...row]),
      currentPlayer: this.currentPlayer,
      winner: this.winner,
      moveCount: this.moveCount,
      players: this.players,
      gameHistory: [...this.gameHistory]
    };
  }

  reset() {
    this.board = Array(3).fill().map(() => Array(3).fill(''));
    this.currentPlayer = 'X';
    this.winner = null;
    this.gameHistory = [];
    this.moveCount = 0;
  }
}

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Store socket reference
  playerSockets.set(socket.id, socket);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    
    // Remove from matchmaking queue
    const matchIndex = matchMaking.findIndex(p => p.socketId === socket.id);
    if (matchIndex !== -1) {
      matchMaking.splice(matchIndex, 1);
    }

    // Handle active game disconnection
    for (const [gameId, game] of activeGames.entries()) {
      if (game.players[socket.id]) {
        const opponentSocket = game.getOpponentSocket(socket.id);
        if (opponentSocket) {
          io.to(opponentSocket).emit("opponentDisconnected");
        }
        activeGames.delete(gameId);
        break;
      }
    }

    playerSockets.delete(socket.id);
  });

  // Matchmaking
  socket.on("matchmaking", (playerName) => {
    console.log(`Player ${playerName} is looking for a match`);
    
    // Remove player if already in queue
    const existingIndex = matchMaking.findIndex(p => p.socketId === socket.id);
    if (existingIndex !== -1) {
      matchMaking.splice(existingIndex, 1);
    }

    // Add player to matchmaking queue
    matchMaking.push({ socketId: socket.id, playerName });

    // Check if there are enough players to start a match
    if (matchMaking.length >= 2) {
      const player1 = matchMaking.shift();
      const player2 = matchMaking.shift();

      // Create new game room
      const gameRoom = new GameRoom(player1, player2);
      activeGames.set(gameRoom.id, gameRoom);

      // Join both players to the game room
      const player1Socket = playerSockets.get(player1.socketId);
      const player2Socket = playerSockets.get(player2.socketId);

      if (player1Socket && player2Socket) {
        player1Socket.join(gameRoom.id);
        player2Socket.join(gameRoom.id);

        // Notify both players that they have been matched
        player1Socket.emit("matchFound", {
          gameId: gameRoom.id,
          opponent: player2.playerName,
          playerSymbol: gameRoom.players[player1.socketId].symbol,
          gameState: gameRoom.getGameState()
        });

        player2Socket.emit("matchFound", {
          gameId: gameRoom.id,
          opponent: player1.playerName,
          playerSymbol: gameRoom.players[player2.socketId].symbol,
          gameState: gameRoom.getGameState()
        });
      }
    } else {
      socket.emit("waitingForMatch", { position: matchMaking.length });
    }
  });

  // Cancel matchmaking
  socket.on("cancelMatchmaking", () => {
    const matchIndex = matchMaking.findIndex(p => p.socketId === socket.id);
    if (matchIndex !== -1) {
      matchMaking.splice(matchIndex, 1);
      socket.emit("matchmakingCancelled");
    }
  });

  // Game move
  socket.on("makeMove", ({ gameId, row, col }) => {
    const game = activeGames.get(gameId);
    if (!game) {
      socket.emit("error", { message: "Game not found" });
      return;
    }

    const result = game.makeMove(socket.id, row, col);
    
    if (result.success) {
      // Broadcast updated game state to both players
      io.to(gameId).emit("gameUpdate", {
        gameState: game.getGameState(),
        lastMove: { row, col, player: game.getPlayerBySocket(socket.id).symbol }
      });

      // Check if game ended
      if (game.winner) {
        const gameResult = {
          winner: game.winner,
          gameState: game.getGameState()
        };
        
        io.to(gameId).emit("gameEnd", gameResult);
      }
    } else {
      socket.emit("moveError", { error: result.error });
    }
  });

  // Game reset request
  socket.on("requestReset", ({ gameId }) => {
    const game = activeGames.get(gameId);
    if (!game) {
      socket.emit("error", { message: "Game not found" });
      return;
    }

    const player = game.getPlayerBySocket(socket.id);
    const opponentSocket = game.getOpponentSocket(socket.id);
    
    if (opponentSocket) {
      io.to(opponentSocket).emit("resetRequested", { 
        from: player.name,
        gameId 
      });
    }
  });

  // Reset response
  socket.on("resetResponse", ({ gameId, accepted }) => {
    const game = activeGames.get(gameId);
    if (!game) {
      socket.emit("error", { message: "Game not found" });
      return;
    }

    if (accepted) {
      game.reset();
      io.to(gameId).emit("gameReset", {
        gameState: game.getGameState()
      });
    } else {
      const opponentSocket = game.getOpponentSocket(socket.id);
      if (opponentSocket) {
        io.to(opponentSocket).emit("resetDenied");
      }
    }
  });

  // Leave game
  socket.on("leaveGame", ({ gameId }) => {
    const game = activeGames.get(gameId);
    if (!game) return;

    const opponentSocket = game.getOpponentSocket(socket.id);
    if (opponentSocket) {
      io.to(opponentSocket).emit("opponentLeft");
    }

    socket.leave(gameId);
    activeGames.delete(gameId);
  });
});

console.log("Tic-Tac-Toe WebSocket server ready!");