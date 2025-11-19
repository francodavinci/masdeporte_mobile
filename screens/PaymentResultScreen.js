import React, { useEffect, useState, useContext, useRef } from 'react';
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
  // Log completo de todos los parámetros recibidos
  console.log('📋 PaymentResultScreen recibió route.params completos:', JSON.stringify(route.params, null, 2));
  
  const { 
    status, 
    payment_id, 
    collection_id,
    preference_id, 
    payment_type,
    merchant_order_id,
    external_reference,
    collection_status,
    payment_status
  } = route.params || {};
  
  // Determinar el status real - MercadoPago puede enviar diferentes nombres de parámetro
  const finalStatus = status || collection_status || payment_status || 'unknown';
  // Determinar el ID de pago real
  const finalPaymentId = payment_id || collection_id;
  
  console.log('📋 PaymentResultScreen - Status determinado:', finalStatus);
  console.log('📋 PaymentResultScreen - payment_id:', payment_id);
  console.log('📋 PaymentResultScreen - preference_id:', preference_id);
  
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const { userDetails, loadUserData } = useContext(UserDetailContext);
  const hasInitialized = useRef(false);
  const hasNavigated = useRef(false);

  useEffect(() => {
    // Evitar inicialización múltiple
    if (hasInitialized.current) {
      console.log('⚠️ PaymentResultScreen ya fue inicializado, evitando re-inicialización');
      return;
    }
    hasInitialized.current = true;

    console.log('🎬 Inicializando PaymentResultScreen con params:', { 
      finalStatus, 
      payment_id, 
      preference_id,
      todosLosParams: route.params 
    });

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
  }, []);

  // Efecto para manejar navegación automática después de verificar el pago
  useEffect(() => {
    if (!loading && !hasNavigated.current) {
      hasNavigated.current = true;
      
      console.log('✅ Pago verificado, navegando al Home...');
      
      // Esperar un momento para que el usuario vea el resultado
      const timer = setTimeout(() => {
        // Recargar datos del usuario
        loadUserData().then(() => {
          // Navegar al Home independientemente del estado
          console.log('🏠 Navegando al Home');
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            })
          );
        });
      }, 2000); // 2 segundos para ver el resultado

      return () => clearTimeout(timer);
    }
  }, [loading]);

  const checkPaymentStatus = async () => {
    try {
      setLoading(true);

      console.log('🔍 Verificando pago con ID:', finalPaymentId);

      // Si tenemos payment_id, verificar el estado del pago
      if (finalPaymentId) {
        try {
          const response = await paymentsService.getPaymentStatus(finalPaymentId);
          if (response.success) {
            setPaymentDetails(response.data);
            console.log('✅ Estado del pago obtenido:', response.data);
          } else {
            console.warn('⚠️ No se pudo verificar el estado del pago:', response.message);
            // No mostrar error al usuario, solo usar el status que viene en la URL
          }
        } catch (error) {
          console.error('❌ Error verificando estado del pago:', error);
          // No mostrar error crítico al usuario, el pago ya fue procesado
          // Solo usar el status que viene en los parámetros de la URL
        }
      } else {
        console.warn('⚠️ No se recibió payment_id para verificar');
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
    console.log('🔍 Determinando configuración para status:', finalStatus);
    
    switch (finalStatus) {
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
        console.log('⚠️ Status no reconocido, mostrando estado desconocido. route.params:', route.params);
        return {
          icon: 'help-circle-outline',
          color: '#666',
          title: 'Estado Desconocido',
          message: `No se pudo determinar el estado del pago. Status recibido: ${finalStatus}`,
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

        {/* Información del pago */}
        {(finalPaymentId || preference_id || external_reference || merchant_order_id) && (
          <View style={styles.infoContainer}>
            {finalPaymentId && (
              <>
                <Text style={styles.infoLabel}>ID de Pago:</Text>
                <Text style={styles.infoValue}>{finalPaymentId}</Text>
              </>
            )}
            {preference_id && (
              <>
                <Text style={styles.infoLabel}>ID de Preferencia:</Text>
                <Text style={styles.infoValue}>{preference_id}</Text>
              </>
            )}
            {merchant_order_id && (
              <>
                <Text style={styles.infoLabel}>Orden de Mercado:</Text>
                <Text style={styles.infoValue}>{merchant_order_id}</Text>
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

        {/* Debug: Mostrar status original si es desconocido */}
        {finalStatus === 'unknown' && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugLabel}>DEBUG - Parámetros recibidos:</Text>
            <Text style={styles.debugValue}>{JSON.stringify(route.params, null, 2)}</Text>
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
  debugContainer: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  debugLabel: {
    fontSize: 12,
    color: '#856404',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  debugValue: {
    fontSize: 11,
    color: '#856404',
    fontFamily: 'monospace',
  },
});

export default PaymentResultScreen;

