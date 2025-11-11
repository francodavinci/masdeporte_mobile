import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

const SafeNavigator = ({ children, navigation, targetScreen, fallbackScreen = 'Home' }) => {
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const navigateSafely = async () => {
      try {
        setIsNavigating(true);
        
        // Pequeña pausa para asegurar que el estado se haya actualizado
        await new Promise(resolve => setTimeout(resolve, 200));
        
        navigation.reset({
          index: 0,
          routes: [{ name: targetScreen }],
        });
      } catch (error) {
        console.error('Navigation error:', error);
        // Fallback a pantalla segura
        navigation.reset({
          index: 0,
          routes: [{ name: fallbackScreen }],
        });
      } finally {
        setIsNavigating(false);
      }
    };

    navigateSafely();
  }, [navigation, targetScreen, fallbackScreen]);

  if (isNavigating) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.text}>Cargando...</Text>
      </View>
    );
  }

  return children;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

export default SafeNavigator;

