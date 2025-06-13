import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Board from './components/board';
import { useEffect, useState, useRef } from 'react';
import { TicTacToe } from '../services/TicTacToe';

const Controls = ({ onReset, onUndo, onSettings, canUndo, gameMode }) => {
    return (
        <View style={styles.controlsContainer}>
            <TouchableOpacity 
                style={[styles.controlButton, styles.resetButton]}
                onPress={onReset}
            >
                <Text style={styles.controlButtonText}>Reset</Text>
            </TouchableOpacity>
            
            {gameMode === 'friend' && (
                <TouchableOpacity 
                    style={[styles.controlButton, styles.undoButton, !canUndo && styles.disabledButton]}
                    onPress={onUndo}
                    disabled={!canUndo}
                >
                    <Text style={[styles.controlButtonText, !canUndo && styles.disabledText]}>Undo</Text>
                </TouchableOpacity>
            )}
            
            <TouchableOpacity 
                style={[styles.controlButton, styles.settingsButton]}
                onPress={onSettings}
            >
                <Text style={styles.controlButtonText}>Settings</Text>
            </TouchableOpacity>
        </View>
    );
}

export default function Game({
    type = 'friend', // 'stranger', 'friend', or 'ai'
    playerName = 'Player', // Name of the player
    onGameEnd = () => {}, // Callback when the game ends
    boardSize = 3, // Board size (3x3, 4x4, etc.)
    winCondition = 3, // How many in a row to win
    aiDifficulty = 'hard' // 'easy', 'medium', 'hard'
}) {
    const gameRef = useRef(null);
    const [gameState, setGameState] = useState(null);
    const [isThinking, setIsThinking] = useState(false);

    // Initialize game
    useEffect(() => {
        const game = new TicTacToe(boardSize, winCondition, type);
        
        // Set player names based on game mode
        if (type === 'friend') {
            game.setPlayerNames('Player 1', 'Player 2');
        } else if (type === 'ai') {
            game.setPlayerNames(playerName, 'AI');
        } else {
            game.setPlayerNames(playerName, 'Opponent');
        }
        
        gameRef.current = game;
        setGameState(game.getGameState());
    }, [boardSize, winCondition, type, playerName]);

    // Handle AI moves
    useEffect(() => {
        if (!gameRef.current || !gameState) return;

        if (gameRef.current.isAITurn()) {
            setIsThinking(true);
            
            // Add delay to make AI thinking visible
            const aiDelay = aiDifficulty === 'easy' ? 500 : aiDifficulty === 'medium' ? 1000 : 1500;
            
            setTimeout(() => {
                const aiMove = gameRef.current.getAIMove(aiDifficulty);
                if (aiMove) {
                    const [row, col] = aiMove;
                    gameRef.current.makeMove(row, col);
                    setGameState(gameRef.current.getGameState());
                }
                setIsThinking(false);
            }, aiDelay);
        }
    }, [gameState?.currentPlayer, gameState?.winner, aiDifficulty]);

    const handleCellPress = (rowIndex, cellIndex) => {
        if (!gameRef.current || isThinking) return;

        const success = gameRef.current.makeMove(rowIndex, cellIndex);
        if (success) {
            setGameState(gameRef.current.getGameState());
            
            // Show winner alert
            const newState = gameRef.current.getGameState();
            if (newState.winner && newState.winner !== 'tie') {
                setTimeout(() => {
                    Alert.alert(
                        'Game Over!',
                        `${newState.players[newState.winner]} wins!`,
                        [
                            { text: 'Play Again', onPress: handleReset },
                            { text: 'Exit', onPress: onGameEnd }
                        ]
                    );
                }, 500);
            } else if (newState.winner === 'tie') {
                setTimeout(() => {
                    Alert.alert(
                        'Game Over!',
                        "It's a tie!",
                        [
                            { text: 'Play Again', onPress: handleReset },
                            { text: 'Exit', onPress: onGameEnd }
                        ]
                    );
                }, 500);
            }
        }
    };

    const handleReset = () => {
        if (gameRef.current) {
            gameRef.current.reset();
            setGameState(gameRef.current.getGameState());
        }
    };

    const handleUndo = () => {
        if (gameRef.current) {
            // In AI mode, undo twice (player move + AI move)
            if (type === 'ai' && gameRef.current.moveCount >= 2) {
                gameRef.current.undoMove(); // Undo AI move
                gameRef.current.undoMove(); // Undo player move
            } else if (type === 'friend') {
                gameRef.current.undoMove(); // Undo last move
            }
            setGameState(gameRef.current.getGameState());
        }
    };

    const handleSettings = () => {
        Alert.alert(
            'Game Settings',
            `Board Size: ${boardSize}x${boardSize}\nWin Condition: ${winCondition} in a row\nMode: ${type}\n${type === 'ai' ? `AI Difficulty: ${aiDifficulty}` : ''}`,
            [{ text: 'OK' }]
        );
    };

    if (!gameState) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading game...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.gameModeText}>
                {type === 'ai' ? 'vs AI' : type === 'friend' ? 'Local Game' : 'Online Game'}
            </Text>
            
            {isThinking && (
                <Text style={styles.thinkingText}>AI is thinking...</Text>
            )}
            
            <Board
                board={gameState.board}
                onCellPress={handleCellPress}
                winner={gameState.winner}
                winningLine={gameState.winningLine}
                currentPlayer={gameState.currentPlayer}
            />

            <View style={styles.gameInfo}>
                <Text style={styles.moveCounter}>
                    Moves: {gameState.moveCount}
                </Text>
                
                {!gameState.winner && (
                    <Text style={styles.currentPlayerText}>
                        Current: {gameState.players[gameState.currentPlayer]}
                    </Text>
                )}
                
                {gameState.winner && gameState.winner !== 'tie' && (
                    <Text style={styles.winnerText}>
                        Winner: {gameState.players[gameState.winner]}
                    </Text>
                )}
                
                {gameState.winner === 'tie' && (
                    <Text style={styles.tieText}>
                        It's a Tie!
                    </Text>
                )}
            </View>

            <View style={styles.buttonRow}>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.exitButton]}
                    onPress={onGameEnd}
                >
                    <Text style={styles.actionButtonText}>Exit Game</Text>
                </TouchableOpacity>
            </View>

            {["ai", "friend"].includes(type) && (
                <Controls 
                    onReset={handleReset}
                    onUndo={handleUndo}
                    onSettings={handleSettings}
                    canUndo={gameState.moveCount > 0}
                    gameMode={type}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        padding: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 18,
        color: '#666',
    },
    gameModeText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#2c3e50',
    },
    thinkingText: {
        fontSize: 16,
        color: '#3498db',
        fontStyle: 'italic',
        marginBottom: 10,
    },
    gameInfo: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    moveCounter: {
        fontSize: 16,
        color: '#7f8c8d',
        marginBottom: 5,
    },
    currentPlayerText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    winnerText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#27ae60',
    },
    tieText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#f39c12',
    },
    buttonRow: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    actionButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        marginHorizontal: 5,
    },
    exitButton: {
        backgroundColor: '#e74c3c',
    },
    actionButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    controlsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        paddingTop: 20,
    },
    controlButton: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 6,
        minWidth: 70,
        alignItems: 'center',
    },
    resetButton: {
        backgroundColor: '#3498db',
    },
    undoButton: {
        backgroundColor: '#f39c12',
    },
    settingsButton: {
        backgroundColor: '#95a5a6',
    },
    disabledButton: {
        backgroundColor: '#bdc3c7',
        opacity: 0.6,
    },
    controlButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    disabledText: {
        color: '#ecf0f1',
    },
});