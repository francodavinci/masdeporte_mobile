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
          // Capturar todos los posibles parámetros que MercadoPago puede enviar
          status: (status) => status || 'unknown',
          collection_status: (collection_status) => collection_status || null,
          payment_status: (payment_status) => payment_status || null,
          payment_id: (payment_id) => payment_id || null,
          collection_id: (collection_id) => collection_id || null,
          preference_id: (preference_id) => preference_id || null,
          payment_type: (payment_type) => payment_type || null,
          merchant_order_id: (merchant_order_id) => merchant_order_id || null,
          external_reference: (external_reference) => external_reference || null,
        },
      },
    },
  },
};

// Componente que maneja deep linking
function AppContent() {
  const navigationRef = useRef(null);

  return (
    <NavigationContainer 
      ref={navigationRef}
      linking={linking}
      onReady={() => {
        const currentRoute = navigationRef.current?.getCurrentRoute();
        console.log('📱 App ready, current route:', currentRoute?.name);
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
