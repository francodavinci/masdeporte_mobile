import React, { createContext, useState, useEffect } from "react";
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UserDetailContext = createContext();

export const UserDetailProvider = ({ children }) => {
  const [userDetails, setUserDetails] = useState({
    token: null,
    refreshToken: null,
    role: null,
    email: null,
    userId: null,
    name: null,
    surname: null,
    isAuthenticated: false,
    favourites: [],
    bookings: []
  });

  // Cargar datos del usuario al iniciar la app
  useEffect(() => {
    loadUserData();
  }, []);

  // Recargar datos cuando la app vuelve al foreground (útil después de pagos externos)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // La app ha vuelto al foreground, recargar datos del usuario
        console.log('🔄 App vuelve al foreground, recargando datos del usuario...');
        loadUserData();
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      const role = await AsyncStorage.getItem('userRole');
      const email = await AsyncStorage.getItem('userEmail');
      const userId = await AsyncStorage.getItem('userId');
      const name = await AsyncStorage.getItem('userName');
      const surname = await AsyncStorage.getItem('userSurname');
      
      if (token) {
        setUserDetails({
          token,
          refreshToken,
          role,
          email,
          userId,
          name,
          surname,
          isAuthenticated: true,
          favourites: [],
          bookings: []
        });
        console.log('✅ Datos del usuario cargados correctamente');
      } else {
        // Si no hay token, asegurar que isAuthenticated sea false
        setUserDetails(prev => ({
          ...prev,
          isAuthenticated: false
        }));
        console.log('⚠️ No se encontró token, usuario no autenticado');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const updateUserDetails = async (newDetails) => {
    try {
      console.log('Updating user details:', newDetails);
      
      // Guardar en AsyncStorage
      if (newDetails.token) {
        await AsyncStorage.setItem('accessToken', newDetails.token);
      }
      if (newDetails.refreshToken) {
        await AsyncStorage.setItem('refreshToken', newDetails.refreshToken);
      }
      if (newDetails.role) {
        await AsyncStorage.setItem('userRole', newDetails.role);
      }
      if (newDetails.email) {
        await AsyncStorage.setItem('userEmail', newDetails.email);
      }
      if (newDetails.userId) {
        await AsyncStorage.setItem('userId', newDetails.userId);
      }
      if (newDetails.name) {
        await AsyncStorage.setItem('userName', newDetails.name);
      }
      if (newDetails.surname) {
        await AsyncStorage.setItem('userSurname', newDetails.surname);
      }

      // Actualizar el estado de forma más segura
      setUserDetails(prev => {
        const updated = { ...prev, ...newDetails };
        console.log('Updated user details state:', updated);
        return updated;
      });
    } catch (error) {
      console.error('Error updating user details:', error);
      // Aún así actualizar el estado local para evitar que la app se cierre
      setUserDetails(prev => ({ ...prev, ...newDetails }));
    }
  };

  const logout = async () => {
    try {
      // Limpiar AsyncStorage
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userRole']);
      
      // Resetear estado
      setUserDetails({
        token: null,
        refreshToken: null,
        role: null,
        isAuthenticated: false,
        favourites: [],
        bookings: []
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <UserDetailContext.Provider value={{ 
      userDetails, 
      setUserDetails: updateUserDetails,
      logout,
      loadUserData // Exponer la función para recargar datos manualmente
    }}>
      {children}
    </UserDetailContext.Provider>
  );
};

export default UserDetailContext;
