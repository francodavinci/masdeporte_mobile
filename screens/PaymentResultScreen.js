import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import { paymentsService } from '../utils/api';
import UserDetailContext from '../context/UserDetailContext';

const PaymentResultScreen = ({ route, navigation }) => {
  const { 
    status, 
    payment_id, 
    preference_id, 
    payment_type,
    external_reference 
  } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const { userDetails, loadUserData } = useContext(UserDetailContext);

  useEffect(() => {
    // LIMPIAR EL STACK INMEDIATAMENTE cuando se monta esta pantalla
    // Esto evita que se pueda volver a la pantalla anterior
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ 
          name: 'PaymentResult', 
          params: route.params 
        }],
      })
    );

    // Prevenir navegación hacia atrás en esta pantalla
    navigation.setOptions({
      headerLeft: () => null,
      gestureEnabled: false,
    });

    // Recargar datos del usuario cuando se monta la pantalla
    // Esto es importante porque la app puede haber vuelto desde Mercado Pago
    const initializeScreen = async () => {
      console.log('🔄 Recargando datos del usuario en PaymentResultScreen...');
      await loadUserData();
      // Esperar un momento para que los datos se carguen
      await new Promise(resolve => setTimeout(resolve, 500));
      checkPaymentStatus();
    };
    
    initializeScreen();
  }, [navigation, route.params]);

  // Efecto para manejar navegación automática cuando el pago es exitoso
  useEffect(() => {
    if (!loading && (status === 'success' || status === 'approved')) {
      // Esperar un momento para asegurar que los datos se hayan recargado
      const handleSuccessNavigation = async () => {
        // Verificar autenticación después de esperar un poco
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Recargar datos una vez más para estar seguro
        await loadUserData();
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Mostrar popup simple y navegar directamente al Home
        // Usar CommonActions.reset para limpiar completamente el stack de navegación
        Alert.alert(
          '¡Turno Reservado! ✅',
          'Tu turno ha sido reservado exitosamente.',
          [
            {
              text: 'Entendido',
              onPress: () => {
                // Reset completo del stack para evitar volver a la pantalla anterior
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Home' }],
                  })
                );
              }
            }
          ],
          { cancelable: false }
        );
      };
      
      handleSuccessNavigation();
    }
  }, [loading, status, navigation]);

  const checkPaymentStatus = async () => {
    try {
      setLoading(true);

      // Si tenemos payment_id, verificar el estado del pago
      if (payment_id) {
        try {
          const response = await paymentsService.getPaymentStatus(payment_id);
          if (response.success) {
            setPaymentDetails(response.data);
          } else {
            console.warn('⚠️ No se pudo verificar el estado del pago:', response.message);
            // No mostrar error al usuario, solo usar el status que viene en la URL
          }
        } catch (error) {
          console.error('Error verificando estado del pago:', error);
          // No mostrar error crítico al usuario, el pago ya fue procesado
          // Solo usar el status que viene en los parámetros de la URL
        }
      }

      // Dar un pequeño delay para mejor UX
      setTimeout(() => {
        setLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Error en checkPaymentStatus:', error);
      setLoading(false);
    }
  };

  const handleGoHome = () => {
    // Recargar datos antes de navegar y usar CommonActions para limpiar el stack
    loadUserData().then(() => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        })
      );
    });
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'success':
      case 'approved':
        return {
          icon: 'checkmark-circle',
          color: '#4CAF50',
          title: '¡Turno Reservado!',
          message: 'Tu turno ha sido reservado exitosamente.',
          buttonText: 'Ir al Inicio',
          onPress: handleGoHome,
        };
      case 'pending':
        return {
          icon: 'time-outline',
          color: '#FF9800',
          title: 'Pago Pendiente',
          message: 'Tu pago está siendo procesado. Te notificaremos cuando se confirme.',
          buttonText: 'Ir a Inicio',
          onPress: handleGoHome,
        };
      case 'failure':
      case 'rejected':
        return {
          icon: 'close-circle',
          color: '#F44336',
          title: 'Pago Rechazado',
          message: 'No se pudo procesar tu pago. Por favor, intenta de nuevo.',
          buttonText: 'Volver',
          onPress: () => navigation.goBack(),
        };
      default:
        return {
          icon: 'help-circle-outline',
          color: '#666',
          title: 'Estado Desconocido',
          message: 'No se pudo determinar el estado del pago.',
          buttonText: 'Ir a Inicio',
          onPress: handleGoHome,
        };
    }
  };

  const config = getStatusConfig();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={config.color} />
          <Text style={styles.loadingText}>Verificando pago...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: `${config.color}20` }]}>
          <Ionicons name={config.icon} size={80} color={config.color} />
        </View>

        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.message}>{config.message}</Text>

        {(payment_id || preference_id || external_reference) && (
          <View style={styles.infoContainer}>
            {payment_id && (
              <>
                <Text style={styles.infoLabel}>ID de Pago:</Text>
                <Text style={styles.infoValue}>{payment_id}</Text>
              </>
            )}
            {preference_id && (
              <>
                <Text style={styles.infoLabel}>ID de Preferencia:</Text>
                <Text style={styles.infoValue}>{preference_id}</Text>
              </>
            )}
            {external_reference && (
              <>
                <Text style={styles.infoLabel}>Referencia Externa:</Text>
                <Text style={styles.infoValue}>{external_reference}</Text>
              </>
            )}
            {payment_type && (
              <>
                <Text style={styles.infoLabel}>Tipo de Pago:</Text>
                <Text style={styles.infoValue}>{payment_type}</Text>
              </>
            )}
          </View>
        )}

        {paymentDetails && paymentDetails.status && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoLabel}>Estado Verificado:</Text>
            <Text style={styles.infoValue}>{paymentDetails.status}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: config.color }]}
          onPress={config.onPress}
        >
          <Text style={styles.buttonText}>{config.buttonText}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PaymentResultScreen;

