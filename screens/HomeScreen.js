import React, { useContext, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import UserDetailContext from "../context/UserDetailContext";

const HomeScreen = ({ navigation }) => {
  const { userDetails, logout } = useContext(UserDetailContext);

  // Redirigir automáticamente a usuarios autenticados después de 2 segundos
  useEffect(() => {
    if (userDetails.isAuthenticated) {
      const timer = setTimeout(() => {
        navigation.navigate('Services');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [userDetails.isAuthenticated, navigation]);

  const handleLogout = () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que quieres cerrar sesión?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Cerrar Sesión",
          onPress: logout,
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¡Bienvenido a MasDeporte!</Text>
      
      {userDetails.isAuthenticated ? (
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText}>
            ¡Bienvenido de vuelta!
          </Text>
          <Text style={styles.roleText}>
            Te estamos llevando a explorar los mejores clubes deportivos...
          </Text>
          
          <View style={styles.loadingContainer}>
            <View style={styles.loadingDots}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.exploreButton} 
            onPress={() => navigation.navigate('Services')}
          >
            <Text style={styles.exploreButtonText}>Ir Ahora</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.authButtons}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => navigation.navigate('Services')}
          >
            <Text style={styles.buttonText}>Explorar Clubes</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.buttonText}>Iniciar Sesión</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.registerButton]} 
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={[styles.buttonText, styles.registerButtonText]}>Registrarse</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 40,
  },
  userInfo: {
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  roleText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  authButtons: {
    width: '100%',
    maxWidth: 300,
  },
  button: {
    backgroundColor: '#FF6B35',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  registerButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  registerButtonText: {
    color: '#FF6B35',
  },
  exploreButton: {
    backgroundColor: '#FF6B35',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 200,
    marginBottom: 15,
  },
  exploreButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 150,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    marginVertical: 20,
  },
  loadingDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B35',
  },
  dot1: {
    animation: 'bounce 1.4s ease-in-out infinite both',
  },
  dot2: {
    animation: 'bounce 1.4s ease-in-out infinite both',
    animationDelay: '0.16s',
  },
  dot3: {
    animation: 'bounce 1.4s ease-in-out infinite both',
    animationDelay: '0.32s',
  },
});

export default HomeScreen;
