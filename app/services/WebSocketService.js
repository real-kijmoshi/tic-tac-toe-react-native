import io from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.gameId = null;
    this.playerSymbol = null;
    this.callbacks = {
      onMatchFound: null,
      onGameUpdate: null,
      onGameEnd: null,
      onOpponentDisconnected: null,
      onOpponentLeft: null,
      onResetRequested: null,
      onResetResponse: null,
      onError: null,
      onConnectionChange: null,
      onWaitingForMatch: null
    };
  }

  // Connect to the WebSocket server
  connect(serverUrl = 'http://localhost:3001') {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(serverUrl, {
      transports: ['websocket'],
      timeout: 20000,
      forceNew: true
    });

    this.setupEventListeners();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        this.isConnected = true;
        this.callbacks.onConnectionChange?.(true);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        this.callbacks.onConnectionChange?.(false);
        reject(error);
      });
    });
  }

  // Set up all event listeners
  setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.callbacks.onConnectionChange?.(false);
    });

    this.socket.on('reconnect', () => {
      this.isConnected = true;
      this.callbacks.onConnectionChange?.(true);
    });

    // Matchmaking events
    this.socket.on('matchFound', (data) => {
      this.gameId = data.gameId;
      this.playerSymbol = data.playerSymbol;
      this.callbacks.onMatchFound?.(data);
    });

    this.socket.on('waitingForMatch', (data) => {
      this.callbacks.onWaitingForMatch?.(data);
    });

    this.socket.on('matchmakingCancelled', () => {
      console.log('Matchmaking cancelled');
    });

    // Game events
    this.socket.on('gameUpdate', (data) => {
      this.callbacks.onGameUpdate?.(data);
    });

    this.socket.on('gameEnd', (data) => {
      this.callbacks.onGameEnd?.(data);
    });

    this.socket.on('gameReset', (data) => {
      this.callbacks.onGameUpdate?.(data);
    });

    // Opponent events
    this.socket.on('opponentDisconnected', () => {
      this.callbacks.onOpponentDisconnected?.();
    });

    this.socket.on('opponentLeft', () => {
      this.callbacks.onOpponentLeft?.();
    });

    // Reset events
    this.socket.on('resetRequested', (data) => {
      this.callbacks.onResetRequested?.(data);
    });

    this.socket.on('resetDenied', () => {
      this.callbacks.onResetResponse?.(false);
    });

    // Error events
    this.socket.on('error', (data) => {
      this.callbacks.onError?.(data);
    });

    this.socket.on('moveError', (data) => {
      this.callbacks.onError?.(data);
    });
  }

  // Register callbacks
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // Start matchmaking
  startMatchmaking(playerName) {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to server');
    }
    
    this.socket.emit('matchmaking', playerName);
  }

  // Cancel matchmaking
  cancelMatchmaking() {
    if (!this.isConnected || !this.socket) return;
    
    this.socket.emit('cancelMatchmaking');
  }

  // Make a move
  makeMove(row, col) {
    if (!this.isConnected || !this.socket || !this.gameId) {
      throw new Error('Not in an active game');
    }
    
    this.socket.emit('makeMove', {
      gameId: this.gameId,
      row,
      col
    });
  }

  // Request game reset
  requestReset() {
    if (!this.isConnected || !this.socket || !this.gameId) {
      throw new Error('Not in an active game');
    }
    
    this.socket.emit('requestReset', {
      gameId: this.gameId
    });
  }

  // Respond to reset request
  respondToReset(accepted) {
    if (!this.isConnected || !this.socket || !this.gameId) {
      throw new Error('Not in an active game');
    }
    
    this.socket.emit('resetResponse', {
      gameId: this.gameId,
      accepted
    });
  }

  // Leave current game
  leaveGame() {
    if (!this.isConnected || !this.socket || !this.gameId) return;
    
    this.socket.emit('leaveGame', {
      gameId: this.gameId
    });
    
    this.gameId = null;
    this.playerSymbol = null;
  }

  // Disconnect from server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.gameId = null;
      this.playerSymbol = null;
      this.callbacks.onConnectionChange?.(false);
    }
  }

  // Getters
  getConnectionStatus() {
    return this.isConnected;
  }

  getCurrentGameId() {
    return this.gameId;
  }

  getPlayerSymbol() {
    return this.playerSymbol;
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;