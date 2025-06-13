export class TicTacToe {
    constructor(size = 3, toWin = 3, mode = 'friend') {
        this.size = size;
        this.toWin = Math.min(toWin, size); // Can't win more than board size
        this.mode = mode; // 'friend', 'ai', 'stranger'
        this.board = Array(size).fill().map(() => Array(size).fill(''));
        this.currentPlayer = 'X';
        this.winner = null;
        this.winningLine = null;
        this.gameHistory = [];
        this.moveCount = 0;
        this.players = {
            X: mode === 'friend' ? 'Player 1' : 'You',
            O: mode === 'friend' ? 'Player 2' : (mode === 'ai' ? 'AI' : 'Opponent')
        };
    }

    // Reset the game to initial state
    reset() {
        this.board = Array(this.size).fill().map(() => Array(this.size).fill(''));
        this.currentPlayer = 'X';
        this.winner = null;
        this.winningLine = null;
        this.gameHistory = [];
        this.moveCount = 0;
    }

    // Check if a move is valid
    isValidMove(row, col) {
        return (
            row >= 0 && 
            row < this.size && 
            col >= 0 && 
            col < this.size && 
            this.board[row][col] === '' && 
            !this.winner
        );
    }

    // Make a move
    makeMove(row, col, player = null) {
        if (!this.isValidMove(row, col)) {
            return false;
        }

        const playerToMove = player || this.currentPlayer;
        this.board[row][col] = playerToMove;
        this.moveCount++;
        
        // Add to history
        this.gameHistory.push({
            row,
            col,
            player: playerToMove,
            moveNumber: this.moveCount
        });

        // Check for winner
        this.checkWinner();

        // Switch player if no winner and not game over
        if (!this.winner) {
            this.switchPlayer();
        }

        return true;
    }

    // Switch current player
    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    }

    // Check for winner
    checkWinner() {
        const result = this.findWinner();
        this.winner = result.winner;
        this.winningLine = result.line;
        return result;
    }

    // Find winner logic
    findWinner() {
        const lines = this.generateWinningLines();
        
        // Check each line for a winner
        for (const line of lines) {
            const values = line.map(([r, c]) => this.board[r][c]);
            if (values.every(val => val !== '' && val === values[0])) {
                return { winner: values[0], line };
            }
        }
        
        // Check for tie
        if (this.isBoardFull()) {
            return { winner: 'tie', line: null };
        }
        
        return { winner: null, line: null };
    }

    // Generate all possible winning lines
    generateWinningLines() {
        const lines = [];
        
        // Check rows
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j <= this.size - this.toWin; j++) {
                const line = [];
                for (let k = 0; k < this.toWin; k++) {
                    line.push([i, j + k]);
                }
                lines.push(line);
            }
        }
        
        // Check columns
        for (let i = 0; i <= this.size - this.toWin; i++) {
            for (let j = 0; j < this.size; j++) {
                const line = [];
                for (let k = 0; k < this.toWin; k++) {
                    line.push([i + k, j]);
                }
                lines.push(line);
            }
        }
        
        // Check diagonals (top-left to bottom-right)
        for (let i = 0; i <= this.size - this.toWin; i++) {
            for (let j = 0; j <= this.size - this.toWin; j++) {
                const line = [];
                for (let k = 0; k < this.toWin; k++) {
                    line.push([i + k, j + k]);
                }
                lines.push(line);
            }
        }
        
        // Check diagonals (top-right to bottom-left)
        for (let i = 0; i <= this.size - this.toWin; i++) {
            for (let j = this.toWin - 1; j < this.size; j++) {
                const line = [];
                for (let k = 0; k < this.toWin; k++) {
                    line.push([i + k, j - k]);
                }
                lines.push(line);
            }
        }
        
        return lines;
    }

    // Check if board is full
    isBoardFull() {
        return this.board.every(row => row.every(cell => cell !== ''));
    }

    // Get empty cells
    getEmptyCells() {
        const emptyCells = [];
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.board[i][j] === '') {
                    emptyCells.push([i, j]);
                }
            }
        }
        return emptyCells;
    }

    // AI Move using Minimax algorithm
    getAIMove(difficulty = 'hard') {
        if (this.winner || this.mode !== 'ai') {
            return null;
        }

        switch (difficulty) {
            case 'easy':
                return this.getRandomMove();
            case 'medium':
                return this.getMediumMove();
            case 'hard':
            default:
                return this.getMinimaxMove();
        }
    }

    // Random move for easy AI
    getRandomMove() {
        const emptyCells = this.getEmptyCells();
        if (emptyCells.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * emptyCells.length);
        return emptyCells[randomIndex];
    }

    // Medium AI - blocks player wins and takes obvious wins
    getMediumMove() {
        // Check if AI can win
        const winMove = this.findWinningMove('O');
        if (winMove) return winMove;

        // Check if AI needs to block player
        const blockMove = this.findWinningMove('X');
        if (blockMove) return blockMove;

        // Otherwise random move
        return this.getRandomMove();
    }

    // Find winning move for a player
    findWinningMove(player) {
        const emptyCells = this.getEmptyCells();
        
        for (const [row, col] of emptyCells) {
            // Temporarily make the move
            this.board[row][col] = player;
            const result = this.findWinner();
            this.board[row][col] = ''; // Undo the move
            
            if (result.winner === player) {
                return [row, col];
            }
        }
        
        return null;
    }

    // Minimax algorithm for hard AI
    getMinimaxMove() {
        const [, move] = this.minimax(this.board, 'O', -Infinity, Infinity);
        return move;
    }

    // Minimax with alpha-beta pruning
    minimax(board, player, alpha, beta, depth = 0) {
        // Create temporary game state
        const tempBoard = board.map(row => [...row]);
        const tempGame = new TicTacToe(this.size, this.toWin, this.mode);
        tempGame.board = tempBoard;
        
        const result = tempGame.findWinner();
        
        // Terminal states
        if (result.winner === 'O') return [10 - depth, null];
        if (result.winner === 'X') return [-10 + depth, null];
        if (result.winner === 'tie') return [0, null];
        
        const emptyCells = tempGame.getEmptyCells();
        let bestMove = null;
        
        if (player === 'O') { // Maximizing player (AI)
            let maxEval = -Infinity;
            
            for (const [row, col] of emptyCells) {
                tempGame.board[row][col] = 'O';
                const [_eval] = this.minimax(tempGame.board, 'X', alpha, beta, depth + 1);
                tempGame.board[row][col] = '';
                
                if (_eval > maxEval) {
                    maxEval = _eval;
                    bestMove = [row, col];
                }
                
                alpha = Math.max(alpha, _eval);
                if (beta <= alpha) break; // Alpha-beta pruning
            }
            
            return [maxEval, bestMove];
        } else { // Minimizing player (Human)
            let minEval = Infinity;
            
            for (const [row, col] of emptyCells) {
                tempGame.board[row][col] = 'X';
                const [_eval] = this.minimax(tempGame.board, 'O', alpha, beta, depth + 1);
                tempGame.board[row][col] = '';
                
                if (_eval < minEval) {
                    minEval = _eval;
                    bestMove = [row, col];
                }
                
                beta = Math.min(beta, _eval);
                if (beta <= alpha) break; // Alpha-beta pruning
            }
            
            return [minEval, bestMove];
        }
    }

    // Get game state
    getGameState() {
        return {
            board: this.board.map(row => [...row]), // Deep copy
            currentPlayer: this.currentPlayer,
            winner: this.winner,
            winningLine: this.winningLine,
            moveCount: this.moveCount,
            players: this.players,
            mode: this.mode,
            size: this.size,
            toWin: this.toWin,
            gameHistory: [...this.gameHistory]
        };
    }

    // Load game state
    loadGameState(state) {
        this.board = state.board.map(row => [...row]);
        this.currentPlayer = state.currentPlayer;
        this.winner = state.winner;
        this.winningLine = state.winningLine;
        this.moveCount = state.moveCount;
        this.gameHistory = [...state.gameHistory];
    }

    // Get game statistics
    getStats() {
        return {
            totalMoves: this.moveCount,
            gameLength: this.gameHistory.length,
            winner: this.winner,
            gameMode: this.mode,
            boardSize: this.size,
            winCondition: this.toWin
        };
    }

    // Undo last move
    undoMove() {
        if (this.gameHistory.length === 0) return false;
        
        const lastMove = this.gameHistory.pop();
        this.board[lastMove.row][lastMove.col] = '';
        this.moveCount--;
        this.winner = null;
        this.winningLine = null;
        
        // Switch back to previous player
        this.switchPlayer();
        
        return true;
    }

    // Check if it's AI's turn
    isAITurn() {
        return this.mode === 'ai' && this.currentPlayer === 'O' && !this.winner;
    }

    // Get current player name
    getCurrentPlayerName() {
        return this.players[this.currentPlayer];
    }

    // Set player names
    setPlayerNames(playerX, playerO) {
        this.players.X = playerX;
        this.players.O = playerO;
    }
}

