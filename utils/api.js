import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';

export const api = axios.create({
  baseURL: "https://masdeportebackend.up.railway.app", // Reemplaza con tu URL de Railway
  timeout: 10000,
});

// Interceptor para agregar token a las peticiones
api.interceptors.request.use(
  async (config) => {
    console.log('🚀 Making request to:', config.baseURL + config.url);
    console.log('📝 Request data:', config.data);
    console.log('🌐 Full URL:', config.baseURL + config.url);
    
    // Lista de rutas públicas que NO requieren token
    const publicRoutes = [
      '/companies/public/',
      '/companies/all',
      '/companies/search',
      '/appointments/availability',
      '/users/auth/login',
      '/users/auth/register',
      '/users/auth/google',
      '/users/auth/refresh',
    ];
    
    // Verificar si la ruta es pública
    const isPublicRoute = publicRoutes.some(route => config.url?.includes(route));
    
    if (!isPublicRoute) {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('🔑 Token added to request');
        } else {
          console.log('⚠️ No token found');
        }
      } catch (error) {
        console.error('Error getting token:', error);
      }
    } else {
      console.log('🌐 Public route - no token needed');
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    console.error('❌ Response error:', error.response?.status, error.response?.data || error.message);
    
    // Manejar errores de CORS específicamente
    if (error.code === 'NETWORK_ERROR' || !error.response) {
      console.error('🌐 Network error - possible CORS issue');
      console.error('🔍 Check if the backend is running and CORS is configured correctly');
      console.error('🌐 Backend URL:', api.defaults.baseURL);
      return Promise.reject(error);
    }

    // Lista de rutas que no deberían intentar refresh token
    const authRoutes = [
      '/users/auth/login',
      '/users/auth/register',
      '/users/auth/refresh',
      '/users/auth/google'
    ];

    const isAuthRoute = authRoutes.some(route => originalRequest.url?.includes(route));
    const hasAlreadyRetried = originalRequest._retry;

    // Verificar si es error 401 o 403 Y no es una ruta de auth Y no se ha intentado refresh
    // (403 también puede indicar token inválido/expirado dependiendo del backend)
    if (
      (error.response?.status === 401 || error.response?.status === 403) && 
      !isAuthRoute && 
      !hasAlreadyRetried
    ) {
      console.log('🔄 Attempting to refresh token due to', error.response?.status, 'error');
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
          console.log('⚠️ No refresh token found, cannot refresh');
          // No hay refresh token, rechazar directamente sin limpiar tokens
          // (puede que el usuario esté en proceso de pago)
          return Promise.reject(error);
        }

        // IMPORTANTE: Usar axios directamente para evitar loops infinitos
        // El backend espera el refresh token en el campo "token" según el código web
        console.log('📡 Llamando al endpoint de refresh token...');
        const response = await axios.post(`${api.defaults.baseURL}/users/auth/refresh`, {
          token: refreshToken  // El backend espera "token" no "refreshToken"
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log('✅ Refresh token exitoso');
        
        if (response.data.statusCode === 200) {
          const { token: newAccessToken, refreshToken: newRefreshToken } = response.data;
          
          // Guardar el nuevo access token
          await AsyncStorage.setItem('accessToken', newAccessToken);
          console.log('💾 Nuevo access token guardado');
          
          // Si el backend devuelve un nuevo refresh token, guardarlo
          if (newRefreshToken) {
            await AsyncStorage.setItem('refreshToken', newRefreshToken);
            console.log('💾 Nuevo refresh token guardado');
          }
          
          // Actualizar el header del request original con el nuevo token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          
          console.log('🔄 Reintentando request original con nuevo token...');
          // Reintentar el request original con el nuevo token
          return api(originalRequest);
        } else {
          console.warn('⚠️ Refresh token response status code no es 200:', response.data);
          return Promise.reject(error);
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError.response?.data || refreshError.message);
        
        // Solo limpiar tokens si el refresh token está expirado o inválido
        // No limpiar si es un error de red u otro error temporal
        if (refreshError.response?.status === 401 || refreshError.response?.status === 403) {
          console.log('⚠️ Refresh token inválido/expirado, limpiando tokens...');
          await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userRole']);
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const checkAuth = async () => {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    const role = await AsyncStorage.getItem('userRole');
    
    return !!(token && refreshToken && role);
  } catch (error) {
    console.error('Error checking auth:', error);
    return false;
  }
};

// Función de login
export const login = async (email, password) => {
  try {
    const response = await api.post('/users/auth/login', { email, password });
    const data = response.data;

    if (data.statusCode === 200) {
      // Guardamos en AsyncStorage
      await AsyncStorage.multiSet([
        ['accessToken', data.token],
        ['refreshToken', data.refreshToken],
        ['userRole', data.role]
      ]);
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Función de registro
export const register = async (name, email, password) => {
  try {
    const response = await api.post("users/auth/register", {
      name,
      role: "USER",
      email,
      password,
    });
    
    if (response.status === 400 || response.status === 500) {
      throw response.data;
    }
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Función de logout
export const handleLogout = async () => {
  try {
    // Limpiamos AsyncStorage
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userRole']);
  } catch (error) {
    console.error('Error during logout:', error);
  }
};

// Función de login con Google (para futura implementación)
export const loginWithGoogle = async (credential) => {
  try {
    const response = await api.post('/users/auth/google', { credential });
    const data = response.data;

    if (data.statusCode === 200) {
      // Guardamos en AsyncStorage igual que en el login normal
      await AsyncStorage.multiSet([
        ['accessToken', data.token],
        ['refreshToken', data.refreshToken],
        ['userRole', data.role]
      ]);
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Servicio para empresas (MasDeporte)
export const providerService = {
  /**
   * Obtiene todas las empresas
   * @returns {Promise} - Promesa con la lista de empresas
   */
  getAllCompanies: async () => {
    try {
      const response = await api.get("/companies/all");
      console.log("RESPONSE: ", response.data)
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error("Error en getAllCompanies:", error);
      return {
        success: false,
        message: "Error al obtener las empresas",
        data: []
      };
    }
  },

  /**
   * Busca empresas por nombre o ubicación
   * @param {string} query - Término de búsqueda (nombre)
   * @param {string} location - Ubicación para buscar
   * @returns {Promise} - Promesa con la lista de empresas encontradas
   */
  searchCompanies: async (query = null, location = null) => {
    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      if (location) params.append('location', location);

      const response = await api.get(`/companies/search?${params.toString()}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error("Error en searchCompanies:", error);
      return {
        success: false,
        message: "Error al buscar empresas",
        data: []
      };
    }
  },

  /**
   * Obtiene una empresa por su slug (público)
   * @param {string} urlSlug - Slug de la empresa
   * @returns {Promise} - Promesa con los datos de la empresa
   */
  getCompanyBySlug: async (urlSlug) => {
    try {
      const response = await api.get(`/companies/public/${urlSlug}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error("Error al obtener empresa por slug:", error);
      return {
        success: false,
        message: "Error al cargar la información de la empresa",
        data: null
      };
    }
  },

  /**
   * Obtiene la disponibilidad de horarios para un servicio en una fecha específica
   * @param {number} serviceId - ID del servicio
   * @param {string} date - Fecha en formato YYYY-MM-DD
   * @returns {Promise} - Promesa con los horarios disponibles
   */
  getAvailability: async (serviceId, date) => {
    try {
      const response = await api.get(
        `/appointments/availability?serviceId=${serviceId}&date=${date}`
      );
      
      if (response.data.success) {
        const availableSlots = response.data.data.availableSlots.map(slot => {
          return slot.length > 5 ? slot.substring(0, 5) : slot;
        });
        
        return {
          success: true,
          data: {
            availableSlots: availableSlots,
            serviceId: serviceId,
            date: date
          }
        };
      } else {
        return {
          success: false,
          message: response.data.message || "No hay horarios disponibles",
          data: { availableSlots: [] }
        };
      }
    } catch (error) {
      console.error("Error al obtener disponibilidad:", error);
      return {
        success: false,
        message: "Error al cargar horarios disponibles",
        data: { availableSlots: [] }
      };
    }
  },

  /**
   * Crea una nueva cita/turno
   * @param {Object} appointmentData - Datos de la cita
   * @returns {Promise} - Promesa con la respuesta de la API
   */
  createAppointment: async (appointmentData) => {
    try {
      const response = await api.post("/appointments", appointmentData);
      
      return {
        success: true,
        data: response.data,
        message: "Cita reservada exitosamente"
      };
    } catch (error) {
      console.error("Error al crear la cita:", error);
      
      let errorMessage = "Error al reservar el turno";
      
      if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || "Datos de la cita inválidos";
      } else if (error.response?.status === 401) {
        errorMessage = "Debes iniciar sesión para reservar un turno";
      } else if (error.response?.status === 409) {
        errorMessage = "El horario seleccionado ya no está disponible";
      } else if (error.response?.status >= 500) {
        errorMessage = "Error interno del servidor. Intenta de nuevo más tarde";
      }
      
      return {
        success: false,
        message: errorMessage,
        data: null
      };
    }
  }
};

export const couponService = {
  mobileHandleCoupon: async (data) => {
    try {
      console.log('🎟️ Manejando cupón móvil:', data);
      const response = await api.post('/api/coupons/apply-and-use', data);
      console.log('✅ Respuesta del cupón:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error manejando cupón móvil:', error);
      throw error;
    }
  }
}

// Servicio para turnos/citas
export const appointmentService = {
  // Obtener los turnos del usuario actual
  getUserAppointments: async () => {
    try {
      const response = await api.get('/appointments/user');
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Error al obtener los turnos del usuario:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al obtener los turnos'
      };
    }
  },

  // Obtener un turno por ID
  getAppointmentById: async (id) => {
    try {
      const response = await api.get(`/appointments/${id}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Error al obtener el turno:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al obtener el turno'
      };
    }
  },

  // Cancelar un turno
  cancelAppointment: async (id) => {
    try {
      const response = await api.delete(`/appointments/${id}`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Error al cancelar el turno:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al cancelar el turno'
      };
    }
  },

  // Crear un nuevo turno
  createAppointment: async (data) => {
    try {
      const response = await api.post('/appointments', data);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Error al crear el turno:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al crear el turno'
      };
    }
  }
};

// Servicio para pagos con Mercado Pago
export const paymentsService = {
  // Obtener estado de conexión con Mercado Pago
  getStatus: async () => {
    try {
      const response = await api.get("api/mercadopago/oauth/status");
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Error al obtener estado de Mercado Pago:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al obtener el estado de Mercado Pago'
      };
    }
  },

  // Desconectar Mercado Pago
  disconnect: async () => {
    try {
      const response = await api.delete("api/mercadopago/oauth/disconnect");
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Error al desconectar Mercado Pago:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al desconectar Mercado Pago'
      };
    }
  },

  // Crear preferencia de pago
  createPaymentPreference: async (paymentData) => {
    try {
      const response = await api.post("api/mercadopago/preferences", paymentData);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Error al crear preferencia de pago:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al crear la preferencia de pago'
      };
    }
  },

  // Confirmar turno después del pago exitoso
  confirmAppointmentAfterPayment: async (paymentData) => {
    try {
      const response = await api.post("api/mercadopago/confirm-appointment", paymentData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error al confirmar turno:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al confirmar el turno'
      };
    }
  },

  // Verificar estado de un pago específico
  getPaymentStatus: async (paymentId) => {
    try {
      const response = await api.get(`api/mercadopago/payment/${paymentId}/status`);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Error al obtener estado del pago:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Error al obtener el estado del pago'
      };
    }
  }
};

export default api;
