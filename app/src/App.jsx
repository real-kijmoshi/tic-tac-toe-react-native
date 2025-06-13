import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Animated,
  StatusBar,
  Alert,
  Dimensions,
  useColorScheme
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Settings, UserRound, Gamepad2, Users, Bot, Wifi } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function App() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Debug log to check what colorScheme is returning
  console.log('Current color scheme:', colorScheme);

  const [fontsLoaded] = useFonts({
    'Chango-Regular': require('../assets/fonts/Chango-Regular.ttf'),
  });

  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  React.useEffect(() => {
    if (fontsLoaded) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [fontsLoaded, fadeAnim, scaleAnim]);

  const handleButtonPress = useCallback((gameMode) => {
    const buttonActions = {
      stranger: () => Alert.alert('Coming Soon!', 'Online multiplayer will be available in the next update.'),
      friend: () => Alert.alert('Local Multiplayer', 'Starting game with a friend...'),
      ai: () => Alert.alert('AI Mode', 'Starting game against AI...')
    };
    
    buttonActions[gameMode]?.();
  }, []);

  const handleNavPress = useCallback((action) => {
    const navActions = {
      profile: () => Alert.alert('Profile', 'View your game statistics and achievements.'),
      settings: () => Alert.alert('Settings', 'Adjust game preferences and sound settings.')
    };
    
    navActions[action]?.();
  }, []);

  // Dynamic styles based on theme
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#121212' : '#f8f9fa',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? '#121212' : '#f8f9fa',
    },
    loadingText: {
      fontSize: 18,
      color: isDark ? '#e0e0e0' : '#666',
    },
    title: {
      fontSize: Math.min(width * 0.12, 48),
      fontFamily: 'Chango-Regular',
      textAlign: 'center',
      color: isDark ? '#ffffff' : '#2c3e50',
      marginBottom: 5,
    },
    subtitle: {
      fontSize: 16,
      color: isDark ? '#b0b0b0' : '#7f8c8d',
      fontWeight: '500',
    },
    bottomNav: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 20,
      paddingHorizontal: 40,
      backgroundColor: isDark ? '#1e1e1e' : '#fff',
      borderTopWidth: 1,
      borderTopColor: isDark ? '#333' : '#ecf0f1',
      marginBottom: -30,
      paddingBottom: 50,
    },
    navText: {
      marginTop: 4,
      fontSize: 12,
      color: isDark ? '#b0b0b0' : '#666',
      fontWeight: '500',
    },
    headerIcon: {
      marginBottom: 10,
      color: isDark ? '#ffffff' : '#333',
    },
    navIcon: {
      color: isDark ? '#b0b0b0' : '#666',
    }
  });

  if (!fontsLoaded) {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <Text style={dynamicStyles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={isDark ? "#121212" : "#fff"} 
      />
      <SafeAreaView style={dynamicStyles.container}>
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <View style={styles.header}>
            <Gamepad2 size={32} color={isDark ? '#ffffff' : '#333'} style={styles.headerIcon} />
            <Text style={dynamicStyles.title}>Tic Tac Toe</Text>
            <Text style={dynamicStyles.subtitle}>Multiplayer Edition</Text>
          </View>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.buttonStranger]}
              onPress={() => handleButtonPress('stranger')}
              activeOpacity={0.8}
            >
              <Wifi size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Play with Stranger</Text>
              <Text style={styles.buttonSubtext}>Find random opponent</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.buttonFriend]}
              onPress={() => handleButtonPress('friend')}
              activeOpacity={0.8}
            >
              <Users size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Play with Friend</Text>
              <Text style={styles.buttonSubtext}>Local multiplayer</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.buttonAI]}
              onPress={() => handleButtonPress('ai')}
              activeOpacity={0.8}
            >
              <Bot size={24} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Play with AI</Text>
              <Text style={styles.buttonSubtext}>Challenge computer</Text>
            </TouchableOpacity>
          </View>

          <View style={dynamicStyles.bottomNav}>
            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => handleNavPress('profile')}
              activeOpacity={0.7}
            >
              <UserRound size={28} color={isDark ? '#b0b0b0' : '#666'} />
              <Text style={dynamicStyles.navText}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.navButton}
              onPress={() => handleNavPress('settings')}
              activeOpacity={0.7}
            >
              <Settings size={28} color={isDark ? '#b0b0b0' : '#666'} />
              <Text style={dynamicStyles.navText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: 75,
    marginBottom: 20,
  },
  headerIcon: {
    marginBottom: 10,
  },
  buttonsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  button: {
    padding: 20,
    borderRadius: 16,
    marginVertical: 12,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonStranger: {
    backgroundColor: '#e74c3c',
  },
  buttonFriend: {
    backgroundColor: '#2ecc71',
  },
  buttonAI: {
    backgroundColor: '#3498db',
  },
  buttonIcon: {
    marginBottom: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Chango-Regular',
    marginBottom: 4,
  },
  buttonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  navButton: {
    alignItems: 'center',
    padding: 10,
  },
});