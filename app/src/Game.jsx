import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import Board from './components/board';
import { useEffect, useState, useRef } from 'react';
import { TicTacToe } from '../services/TicTacToe';
import webSocketService from '../services/WebSocketService';

const Controls = ({ onReset, onUndo, onSettings, canUndo, gameMode, isOnlineGame }) => {
    return (
        <View style={styles.controlsContainer}>
            <TouchableOpacity 
                style={[styles.controlButton, styles.resetButton]}
                onPress={onReset}
            >
                <Text style={styles.controlButtonText}>
                    {isOnlineGame ? 'Request Reset' : 'Reset'}
                </Text>
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

const ConnectionStatus = ({ isConnected, isConnecting }) => {
    if (isConnecting) {
        return (
            <View style={styles.connectionStatus}>
                <ActivityIndicator size="small" color="#3498db" />
                <Text style={styles.connectionText}>Connecting...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.connectionStatus, { backgroundColor: isConnected ? '#27ae60' : '#e74c3c' }]}>
            <Text style={styles.connectionText}>
                {isConnected ? 'Connected' : 'Disconnected'}
            </Text>
        </View>
    );
};

const MatchmakingStatus = ({ isSearching, position }) => {
    if (!isSearching) return null;

    return (
        <View style={styles.matchmakingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.matchmakingText}>
                {position ? `Searching for opponent... (${position} in queue)` : 'Searching for opponent...'}
            </Text>
        </View>
    );
};

export default function Game({
    type = 'friend', // 'stranger', 'friend', or 'ai'
    playerName = 'Player', // Name of the player
    onGameEnd = () => {}, // Callback when the game ends
    boardSize = 3, // Board size (3x3, 4x4, etc.)
    winCondition = 3, // How many in a row to win
    aiDifficulty = 'hard', // 'easy', 'medium', 'hard'
    serverUrl = 'https://07e1-77-222-239-170.ngrok-free.app' // WebSocket server URL
}) {
    const gameRef = useRef(null);
    const [gameState, setGameState] = useState(null);
    const [isThinking, setIsThinking] = useState(false);
    const [storedPlayerName, setStoredPlayerName] = useState('');

    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    
    // Online game states
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isSearchingMatch, setIsSearchingMatch] = useState(false);
    const [queuePosition, setQueuePosition] = useState(null);
    const [opponentName, setOpponentName] = useState('');
    const [playerSymbol, setPlayerSymbol] = useState('X');
    const [isMyTurn, setIsMyTurn] = useState(false);
    const [onlineGameState, setOnlineGameState] = useState(null);
    const [currentGameId, setCurrentGameId] = useState(null);

    const isOnlineGame = type === 'stranger';

    // Load player name from AsyncStorage
    useEffect(() => {
        loadPlayerName();
    }, []);

    const loadPlayerName = async () => {
        try {
            const savedName = await AsyncStorage.getItem('playerName');
            if (savedName) {
                setStoredPlayerName(savedName);
            } else {
                // Generate a default name and save it
                const defaultName = `Player${Math.floor(Math.random() * 1000)}`;
                await AsyncStorage.setItem('playerName', defaultName);
                setStoredPlayerName(defaultName);
            }
        } catch (error) {
            console.error('Error loading player name:', error);
            Toast.show({
                type: 'error',
                text1: 'Name Error',
                text2: 'Could not load player name',
            });
            setStoredPlayerName('Player');
        }
    };

    const savePlayerName = async (name) => {
        try {
            await AsyncStorage.setItem('playerName', name);
            setStoredPlayerName(name);
        } catch (error) {
            console.error('Error saving player name:', error);
            Toast.show({
                type: 'error',
                text1: 'Save Error',
                text2: 'Could not save player name',
            });
        }
    };

    // Initialize game
    useEffect(() => {
        if (!storedPlayerName) return;
        
        if (isOnlineGame) {
            initializeOnlineGame();
        } else {
            initializeOfflineGame();
        }

        return () => {
            if (isOnlineGame) {
                webSocketService.disconnect();
            }
        };
    }, [storedPlayerName]);

    const initializeOfflineGame = () => {
        const game = new TicTacToe(boardSize, winCondition, type);
        
        // Set player names based on game mode
        if (type === 'friend') {
            game.setPlayerNames('Player 1', 'Player 2');
        } else if (type === 'ai') {
            game.setPlayerNames(storedPlayerName || playerName, 'AI');
        }
        
        gameRef.current = game;
        setGameState(game.getGameState());
    };

    const initializeOnlineGame = async () => {
        setIsConnecting(true);
        
        try {
            // Set up WebSocket callbacks
            webSocketService.setCallbacks({
                onConnectionChange: (connected) => {
                    setIsConnected(connected);
                    if (!connected && !isSearchingMatch) {
                        Toast.show({
                            type: 'error',
                            text1: 'Connection Lost',
                            text2: 'Lost connection to the server',
                        });
                    }
                },
                onMatchFound: (data) => {
                    setIsSearchingMatch(false);
                    setOpponentName(data.opponent);
                    setPlayerSymbol(data.playerSymbol);
                    setOnlineGameState(data.gameState);
                    setCurrentGameId(data.gameId);
                    
                    // Check if it's player's turn correctly
                    const isPlayerTurn = data.playerSymbol === data.gameState.currentPlayer;
                    setIsMyTurn(isPlayerTurn);
                    
                    Toast.show({
                        type: 'success',
                        text1: 'Match Found!',
                        text2: `Playing against ${data.opponent}. You are ${data.playerSymbol}`,
                    });
                },
                onGameUpdate: (data) => {
                    setOnlineGameState(data.gameState);
                    
                    // Properly determine if it's player's turn
                    const isPlayerTurn = playerSymbol === data.gameState.currentPlayer && !data.gameState.winner;
                    setIsMyTurn(isPlayerTurn);
                    
                    // Show move notification
                    if (data.lastMove) {
                        const movePlayer = data.lastMove.player === playerSymbol ? 'You' : opponentName;
                        Toast.show({
                            type: 'info',
                            text1: 'Move Made',
                            text2: `${movePlayer} played at (${data.lastMove.row + 1}, ${data.lastMove.col + 1})`,
                            visibilityTime: 2000,
                        });
                    }
                },
                onGameEnd: (data) => {
                    setOnlineGameState(data.gameState);
                    setIsMyTurn(false);
                    
                    let message = '';
                    let type = 'info';
                    if (data.winner === 'tie') {
                        message = "It's a tie!";
                        type = 'info';
                    } else if (data.winner === playerSymbol) {
                        message = 'You won! 🎉';
                        type = 'success';
                    } else {
                        message = `${opponentName} won!`;
                        type = 'error';
                    }
                    
                    setTimeout(() => {
                        Toast.show({
                            type: type,
                            text1: 'Game Over!',
                            text2: message,
                            visibilityTime: 4000,
                        });
                    }, 500);
                },
                onOpponentDisconnected: () => {
                    Toast.show({
                        type: 'error',
                        text1: 'Opponent Disconnected',
                        text2: 'Your opponent has disconnected from the game.',
                    });
                    setTimeout(() => onGameEnd(), 2000);
                },
                onOpponentLeft: () => {
                    Toast.show({
                        type: 'error',
                        text1: 'Opponent Left',
                        text2: 'Your opponent has left the game.',
                    });
                    setTimeout(() => onGameEnd(), 2000);
                },
                onResetRequested: (data) => {
                    Toast.show({
                        type: 'info',
                        text1: 'Reset Requested',
                        text2: `${data.from} wants to reset the game`,
                    });
                    // Auto-accept reset for better UX
                    setTimeout(() => {
                        webSocketService.respondToReset(true);
                    }, 1000);
                },
                onGameReset: (data) => {
                    setOnlineGameState(data.gameState);
                    setIsMyTurn(playerSymbol === 'X'); // X always starts
                    Toast.show({
                        type: 'success',
                        text1: 'Game Reset',
                        text2: 'The game has been reset!',
                    });
                },
                onWaitingForMatch: (data) => {
                    setQueuePosition(data.position);
                },
                onError: (error) => {
                    console.error('WebSocket error:', error);
                    Toast.show({
                        type: 'error',
                        text1: 'Error',
                        text2: error.message || 'An error occurred',
                    });
                }
            });

            // Connect to WebSocket server
            await webSocketService.connect(serverUrl);
            setIsConnecting(false);
            
            // Start matchmaking with stored player name
            startMatchmaking();
            
        } catch (error) {
            console.error('Failed to connect:', error);
            setIsConnecting(false);
            Toast.show({
                type: 'error',
                text1: 'Connection Failed',
                text2: error.message || 'Failed to connect to the server. Please try again.',
            });
            setTimeout(() => onGameEnd(), 2000);
        }
    };

    const startMatchmaking = () => {
        setIsSearchingMatch(true);
        const nameToUse = storedPlayerName || playerName;
        webSocketService.startMatchmaking(nameToUse);
        
        Toast.show({
            type: 'info',
            text1: 'Searching for Match',
            text2: `Looking for opponent as ${nameToUse}...`,
        });
    };

    // Handle AI moves for offline games
    useEffect(() => {
        if (isOnlineGame || !gameRef.current || !gameState) return;

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
    }, [gameState?.currentPlayer, gameState?.winner, aiDifficulty, isOnlineGame]);

    const handleCellPress = (rowIndex, cellIndex) => {
        if (isOnlineGame) {
            handleOnlineCellPress(rowIndex, cellIndex);
        } else {
            handleOfflineCellPress(rowIndex, cellIndex);
        }
    };

    const handleOfflineCellPress = (rowIndex, cellIndex) => {
        if (!gameRef.current || isThinking) return;

        const success = gameRef.current.makeMove(rowIndex, cellIndex);
        if (success) {
            setGameState(gameRef.current.getGameState());
            
            // Show winner toast
            const newState = gameRef.current.getGameState();
            if (newState.winner && newState.winner !== 'tie') {
                setTimeout(() => {
                    Toast.show({
                        type: 'success',
                        text1: 'Game Over!',
                        text2: `${newState.players[newState.winner]} wins!`,
                        visibilityTime: 4000,
                    });
                }, 500);
            } else if (newState.winner === 'tie') {
                setTimeout(() => {
                    Toast.show({
                        type: 'info',
                        text1: 'Game Over!',
                        text2: "It's a tie!",
                        visibilityTime: 4000,
                    });
                }, 500);
            }
        }
    };

    const handleOnlineCellPress = (rowIndex, cellIndex) => {
        // Check if it's player's turn and cell is empty
        const isMyActualTurn = playerSymbol === onlineGameState?.currentPlayer;
        const cellEmpty = onlineGameState?.board?.[rowIndex]?.[cellIndex] === '';
        
        if (!isConnected || !isMyActualTurn || !onlineGameState || !cellEmpty) {
            if (!isMyActualTurn) {
                Toast.show({
                    type: 'error',
                    text1: 'Not Your Turn',
                    text2: `Wait for ${opponentName} to make their move`,
                    visibilityTime: 2000,
                });
            }
            return;
        }
        
        try {
            webSocketService.makeMove(rowIndex, cellIndex);
            // Optimistically update turn state
            setIsMyTurn(false);
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Move Failed',
                text2: error.message,
            });
        }
    };

    const handleReset = () => {
        if (isOnlineGame) {
            if (isConnected) {
                webSocketService.requestReset();
                Toast.show({
                    type: 'info',
                    text1: 'Reset Requested',
                    text2: 'Asking opponent to reset the game...',
                });
            }
        } else {
            if (gameRef.current) {
                gameRef.current.reset();
                setGameState(gameRef.current.getGameState());
                Toast.show({
                    type: 'success',
                    text1: 'Game Reset',
                    text2: 'The game has been reset!',
                });
            }
        }
    };

    const handleUndo = () => {
        if (isOnlineGame) return; // Undo not available in online games
        
        if (gameRef.current) {
            // In AI mode, undo twice (player move + AI move)
            if (type === 'ai' && gameRef.current.moveCount >= 2) {
                gameRef.current.undoMove(); // Undo AI move
                gameRef.current.undoMove(); // Undo player move
            } else if (type === 'friend') {
                gameRef.current.undoMove(); // Undo last move
            }
            setGameState(gameRef.current.getGameState());
            Toast.show({
                type: 'success',
                text1: 'Move Undone',
                text2: 'Last move has been undone',
            });
        }
    };


    const handleLeaveGame = () => {
        Alert.alert(
            'Leave Game',
            'Are you sure you want to leave this game?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    onPress: () => {
                        webSocketService.leaveGame();
                        onGameEnd();
                    },
                    style: 'destructive',
                },
            ],
            { cancelable: true }
        );
    };

    // Show loading for offline games
    if (!isOnlineGame && !gameState) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading game...</Text>
            </View>
        );
    }

    // Show matchmaking screen for online games
    if (isOnlineGame && (isConnecting || isSearchingMatch)) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#f0f0f0' }]}>
                {isConnecting && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#3498db" />
                        <Text style={styles.loadingText}>Connecting to server...</Text>
                    </View>
                )}
                
                {!isConnecting && (
                    <>
                        <ConnectionStatus isConnected={isConnected} isConnecting={isConnecting} />
                        <Text style={styles.playerNameText}>
                            Playing as: {storedPlayerName || playerName}
                        </Text>
                        <MatchmakingStatus 
                            isSearching={isSearchingMatch} 
                            position={queuePosition}
                        />
                        
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.exitButton]}
                            onPress={onGameEnd}
                        >
                            <Text style={styles.actionButtonText}>
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        );
    }

    // Get current game state (online or offline)
    const currentGameState = isOnlineGame ? onlineGameState : gameState;
    
    if (!currentGameState) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading game...</Text>
            </View>
        );
    }

    // Determine current player display
    const getCurrentPlayerDisplay = () => {
        if (isOnlineGame) {
            if (currentGameState.winner) return '';
            return isMyTurn ? 'Your turn' : `${opponentName}'s turn`;
        } else {
            return currentGameState.players[currentGameState.currentPlayer];
        }
    };

    // Determine winner display
    const getWinnerDisplay = () => {
        if (!currentGameState.winner) return '';
        
        if (currentGameState.winner === 'tie') return "It's a Tie!";
        
        if (isOnlineGame) {
            return currentGameState.winner === playerSymbol ? 'You Win!' : `${opponentName} Wins!`;
        } else {
            return `${currentGameState.players[currentGameState.winner]} Wins!`;
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#f0f0f0' }]}>
            {isOnlineGame && (
                <ConnectionStatus isConnected={isConnected} isConnecting={false} />
            )}
            
            <Text style={styles.gameModeText}>
                {isOnlineGame ? `vs ${opponentName}` : 
                 type === 'ai' ? 'vs AI' : 
                 type === 'friend' ? 'Local Game' : 'Online Game'}
            </Text>
            
            {isOnlineGame && (
                <>
                    <Text style={styles.playerSymbolText}>
                        You are: {playerSymbol}
                    </Text>
                    <Text style={styles.playerNameText}>
                        Playing as: {storedPlayerName || playerName}
                    </Text>
                </>
            )}
            
            {isThinking && (
                <Text style={styles.thinkingText}>AI is thinking...</Text>
            )}
            
            <Board
                board={currentGameState.board}
                onCellPress={handleCellPress}
                winner={currentGameState.winner}
                winningLine={currentGameState.winningLine}
                currentPlayer={currentGameState.currentPlayer}
                disabled={isOnlineGame && !isMyTurn}
            />

            <View style={styles.gameInfo}>
                <Text style={styles.moveCounter}>
                    Moves: {currentGameState.moveCount}
                </Text>
                
                {!currentGameState.winner && (
                    <Text style={styles.currentPlayerText}>
                        {getCurrentPlayerDisplay()}
                    </Text>
                )}
                
                {isOnlineGame && !currentGameState.winner && (
                    <Text style={[styles.turnIndicator, isMyTurn ? styles.myTurnIndicator : styles.opponentTurnIndicator]}>
                        {isMyTurn ? '🟢 Your Turn' : '🔴 Opponent\'s Turn'}
                    </Text>
                )}
                
                {currentGameState.winner && (
                    <Text style={[
                        styles.winnerText, 
                        currentGameState.winner === 'tie' && styles.tieText,
                        isOnlineGame && currentGameState.winner === playerSymbol && styles.youWinText
                    ]}>
                        {getWinnerDisplay()}
                    </Text>
                )}
            </View>

            <View style={styles.buttonRow}>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.exitButton]}
                    onPress={isOnlineGame ? handleLeaveGame : onGameEnd}
                >
                    <Text style={styles.actionButtonText}>
                        {isOnlineGame ? 'Leave Game' : 'Exit Game'}
                    </Text>
                </TouchableOpacity>
            </View>

            <Controls 
                onReset={handleReset}
                onUndo={handleUndo}
                onSettings={() => {
                    Alert.alert(
                        'Settings',
                        'Settings are not implemented yet.',
                        [{ text: 'OK' }],
                        { cancelable: true }
                    );
                }}
                canUndo={!isOnlineGame && currentGameState.moveCount > 0}
                gameMode={type}
                isOnlineGame={isOnlineGame}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        marginTop: 10,
    },
    connectionStatus: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    connectionText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 5,
    },
    matchmakingContainer: {
        alignItems: 'center',
        padding: 20,
    },
    matchmakingText: {
        fontSize: 16,
        color: '#2c3e50',
        marginTop: 15,
        marginBottom: 20,
        textAlign: 'center',
    },
    gameModeText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#2c3e50',
    },
    playerSymbolText: {
        fontSize: 16,
        color: '#7f8c8d',
        marginBottom: 5,
    },
    playerNameText: {
        fontSize: 14,
        color: '#95a5a6',
        marginBottom: 10,
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
        marginBottom: 5,
    },
    turnIndicator: {
        fontSize: 16,
        fontWeight: 'bold',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
        overflow: 'hidden',
    },
    myTurnIndicator: {
        backgroundColor: '#d5f4e6',
        color: '#27ae60',
    },
    opponentTurnIndicator: {
        backgroundColor: '#fadbd8',
        color: '#e74c3c',
    },
    winnerText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#27ae60',
    },
    tieText: {
        color: '#f39c12',
    },
    youWinText: {
        color: '#27ae60',
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
        flexWrap: 'wrap',
    },
    controlButton: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 6,
        minWidth: 70,
        alignItems: 'center',
        marginBottom: 10,
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
    leaveButton: {
        backgroundColor: '#e74c3c',
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