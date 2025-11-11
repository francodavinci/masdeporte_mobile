import React, { useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { CommonActions } from '@react-navigation/native';
import { UserDetailProvider } from './context/UserDetailContext';
import ErrorBoundary from './components/ErrorBoundary';

// Importar pantallas
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ServicesScreen from './screens/ServicesScreen';
import CompanyDetailScreen from './screens/CompanyDetailScreen';
import MyAppointmentsScreen from './screens/MyAppointmentsScreen';
import PaymentResultScreen from './screens/PaymentResultScreen';

const Stack = createStackNavigator();

// Configuración de deep linking simplificada
const linking = {
  prefixes: ['masdeporte://'],
  config: {
    screens: {
      Home: 'home',
      Services: 'services',
      CompanyDetail: 'company/:urlSlug',
      MyAppointments: 'appointments',
      Login: 'login',
      Register: 'register',
      PaymentResult: {
        path: 'payment',
        parse: {
          status: (status) => status || 'unknown',
          payment_id: (payment_id) => payment_id || null,
          preference_id: (preference_id) => preference_id || null,
          payment_type: (payment_type) => payment_type || null,
          external_reference: (external_reference) => external_reference || null,
        },
      },
    },
  },
  // No mantener el estado de navegación cuando se abre desde deep link
  getStateFromPath: (path, options) => {
    // Si es un deep link de pago, siempre resetear el stack
    if (path.includes('payment')) {
      return {
        routes: [
          {
            name: 'PaymentResult',
            params: options?.params || {},
          },
        ],
        index: 0,
      };
    }
    // Para otros paths, usar el comportamiento por defecto
    return undefined;
  },
};

// Componente que maneja deep linking
function AppContent() {
  const navigationRef = useRef(null);

  // Función para manejar el estado de navegación cuando se abre desde deep link
  const handleNavigationStateChange = () => {
    const currentRoute = navigationRef.current?.getCurrentRoute();
    
    // Si estamos en PaymentResult y venimos de un deep link, resetear el stack
    if (currentRoute?.name === 'PaymentResult') {
      // Pequeño delay para asegurar que la navegación se haya completado
      setTimeout(() => {
        // No resetear aquí, dejar que PaymentResultScreen lo maneje
        // pero asegurarnos de que no hay stack anterior
        console.log('📍 Navegado a PaymentResult desde deep link');
      }, 100);
    }
  };

  return (
    <NavigationContainer 
      ref={navigationRef}
      linking={linking}
      onStateChange={handleNavigationStateChange}
      onReady={() => {
        // Cuando el contenedor está listo, verificar si hay un deep link pendiente
        const currentRoute = navigationRef.current?.getCurrentRoute();
        if (currentRoute?.name === 'PaymentResult') {
          // Si ya estamos en PaymentResult, asegurar que el stack esté limpio
          navigationRef.current?.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'PaymentResult', params: currentRoute.params }],
            })
          );
        }
      }}
    >
        <StatusBar style="auto" />
        <Stack.Navigator 
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#FF6B35',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ title: 'MasDeporte' }}
          />
          <Stack.Screen 
            name="Services" 
            component={ServicesScreen} 
            options={{ title: 'Clubes' }}
          />
          <Stack.Screen 
            name="CompanyDetail" 
            component={CompanyDetailScreen} 
            options={({ route }) => ({ 
              title: route.params?.companyName || 'Detalle del Club',
              headerBackTitle: 'Atrás'
            })}
          />
          <Stack.Screen 
            name="MyAppointments" 
            component={MyAppointmentsScreen} 
            options={{ title: 'Mis Turnos' }}
          />
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ title: 'Iniciar Sesión' }}
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen} 
            options={{ title: 'Registro' }}
          />
          <Stack.Screen 
            name="PaymentResult" 
            component={PaymentResultScreen} 
            options={{ 
              title: 'Resultado del Pago',
              headerBackTitle: 'Inicio',
              gestureEnabled: false,
            }}
          />
        </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <UserDetailProvider>
        <AppContent />
      </UserDetailProvider>
    </ErrorBoundary>
  );
}
