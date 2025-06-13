import { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Animated, 
    Dimensions,
    useColorScheme 
} from 'react-native';
import { useFonts } from 'expo-font';

const { width } = Dimensions.get('window');

export default function Board({ 
    board, 
    onCellPress, 
    winner = null,
    winningLine = null,
    currentPlayer = 'X'
}) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    
    const [fontsLoaded] = useFonts({
        'Chango-Regular': require('../../assets/fonts/Chango-Regular.ttf'),
    });

    const [boardScale] = useState(new Animated.Value(0.8));
    const [cellAnimations] = useState(() =>
        board.map(row => row.map(() => new Animated.Value(1)))
    );

    useEffect(() => {
        if (fontsLoaded) {
            Animated.spring(boardScale, {
                toValue: 1,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }).start();
        }
    }, [fontsLoaded, boardScale]);

    const animateCell = (rowIndex, cellIndex) => {
        const cellAnim = cellAnimations[rowIndex][cellIndex];
        Animated.sequence([
            Animated.timing(cellAnim, {
                toValue: 0.8,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.spring(cellAnim, {
                toValue: 1,
                tension: 300,
                friction: 6,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handleCellPress = (rowIndex, cellIndex) => {
        if (board[rowIndex][cellIndex] === '' && !winner && onCellPress) {
            animateCell(rowIndex, cellIndex);
            onCellPress(rowIndex, cellIndex);
        }
    };

    const getCellStyle = (rowIndex, cellIndex) => {
        const isWinningCell = winningLine && winningLine.some(
            ([r, c]) => r === rowIndex && c === cellIndex
        );
        
        return [
            styles.cell,
            isDark ? styles.cellDark : styles.cellLight,
            isWinningCell && styles.winningCell,
            winner && styles.disabledCell
        ];
    };

    const getCellTextStyle = (cell, rowIndex, cellIndex) => {
        const isWinningCell = winningLine && winningLine.some(
            ([r, c]) => r === rowIndex && c === cellIndex
        );
        
        return [
            styles.cellText,
            cell === 'X' && styles.xText,
            cell === 'O' && styles.oText,
            isWinningCell && styles.winningText
        ];
    };

    const dynamicStyles = StyleSheet.create({
        container: {
            alignItems: 'center',
            padding: 20,
        },
        title: {
            fontSize: Math.min(width * 0.08, 32),
            fontFamily: fontsLoaded ? 'Chango-Regular' : 'System',
            textAlign: 'center',
            color: isDark ? '#ffffff' : '#2c3e50',
            marginBottom: 10,
        },
        currentPlayerText: {
            fontSize: 18,
            color: isDark ? '#b0b0b0' : '#7f8c8d',
            fontWeight: '500',
            marginBottom: 15,
        },
        winnerText: {
            fontSize: 24,
            fontFamily: fontsLoaded ? 'Chango-Regular' : 'System',
            color: '#e74c3c',
            marginBottom: 20,
            textAlign: 'center',
        },
        boardContainer: {
            backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
            padding: 8,
            borderRadius: 20,
            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 6,
            },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
        },
    });

    if (!fontsLoaded) {
        return (
            <View style={dynamicStyles.container}>
                <Text style={{ color: isDark ? '#e0e0e0' : '#666' }}>Loading...</Text>
            </View>
        );
    }

    return (
        <View style={dynamicStyles.container}>
            <Text style={dynamicStyles.title}>Tic Tac Toe</Text>
            
            {!winner && (
                <Text style={dynamicStyles.currentPlayerText}>
                    Player {currentPlayer}'s Turn
                </Text>
            )}
            
            {winner && (
                <Animated.View>
                    <Text style={dynamicStyles.winnerText}>
                        {winner === 'tie' ? "It's a Tie!" : `Player ${winner} Wins!`}
                    </Text>
                </Animated.View>
            )}
            
            <Animated.View 
                style={[
                    dynamicStyles.boardContainer,
                    { transform: [{ scale: boardScale }] }
                ]}
            >
                {board.map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.row}>
                        {row.map((cell, cellIndex) => (
                            <TouchableOpacity
                                key={`${rowIndex}-${cellIndex}`}
                                style={getCellStyle(rowIndex, cellIndex)}
                                onPress={() => handleCellPress(rowIndex, cellIndex)}
                                disabled={(cell !== '') || winner !== null}
                                activeOpacity={0.8}
                            >
                                <Animated.View
                                    style={{
                                        transform: [{ scale: cellAnimations[rowIndex][cellIndex] }]
                                    }}
                                >
                                    <Text style={getCellTextStyle(cell, rowIndex, cellIndex)}>
                                        {cell}
                                    </Text>
                                </Animated.View>
                            </TouchableOpacity>
                        ))}
                    </View>
                ))}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
    },
    cell: {
        width: 85,
        height: 85,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 3,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cellLight: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#ecf0f1',
    },
    cellDark: {
        backgroundColor: '#2c2c2c',
        borderWidth: 1,
        borderColor: '#404040',
    },
    cellText: {
        fontSize: 36,
        fontWeight: 'bold',
    },
    xText: {
        color: '#e74c3c',
    },
    oText: {
        color: '#3498db',
    },
    winningCell: {
        backgroundColor: '#2ecc71',
    },
    winningText: {
        color: '#ffffff',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    disabledCell: {
        opacity: 0.6,
    },
});