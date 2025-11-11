import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { providerService } from "../utils/api";
import ServiceSelector from "../components/ServiceSelector";
import DateSelector from "../components/DateSelector";
import TimeSlotSelector from "../components/TimeSlotSelector";
import BookingForm from "../components/BookingForm";

const { width } = Dimensions.get("window");

const CompanyDetailScreen = ({ route, navigation }) => {
  const { urlSlug } = route.params;
  const [company, setCompany] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para el sistema de reservas
  const [activeTab, setActiveTab] = useState("info");
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(null);

  useEffect(() => {
    fetchCompanyData();
  }, [urlSlug]);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await providerService.getCompanyBySlug(urlSlug);
      
      if (response.success) {
        const mappedCompany = mapBackendToFrontend(response.data);
        setCompany(mappedCompany);
        
        if (response.data.services) {
          const mappedServices = response.data.services.map(service => ({
            id: service.id,
            name: service.name,
            description: service.description,
            price: service.price,
            durationMinutes: service.durationMinutes
          }));
          setServices(mappedServices);
        }
      } else {
        setError(response.message || "Error al cargar los datos de la empresa");
      }
    } catch (err) {
      console.error("Error fetching company:", err);
      setError("Error al cargar la información de la empresa");
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener disponibilidad de horarios
  const fetchAvailability = async (serviceId, date) => {
    try {
      setLoadingSlots(true);
      setSlotsError(null);
      
      const dateString = date.toISOString().split("T")[0];
      const response = await providerService.getAvailability(serviceId, dateString);
      
      if (response.success) {
        setAvailableSlots(response.data.availableSlots || []);
        if (response.data.availableSlots.length === 0) {
          setSlotsError("No hay horarios disponibles para esta fecha");
        }
      } else {
        setAvailableSlots([]);
        setSlotsError(response.message || "No hay horarios disponibles");
      }
    } catch (err) {
      console.error("Error al cargar horarios:", err);
      setAvailableSlots([]);
      setSlotsError("Error al cargar los horarios disponibles");
    } finally {
      setLoadingSlots(false);
    }
  };

  // Función para validar si una fecha es válida según las políticas de la empresa
  const isDateValid = (date) => {
    if (!company) return { valid: true };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    
    const diffTime = selectedDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < company.minAdvanceDays) {
      return {
        valid: false,
        message: `Debes reservar con al menos ${company.minAdvanceDays} día(s) de anticipación`
      };
    }
    
    if (diffDays > company.maxAdvanceDays) {
      return {
        valid: false,
        message: `No puedes reservar con más de ${company.maxAdvanceDays} días de anticipación`
      };
    }
    
    return { valid: true };
  };

  // Handlers para el sistema de reservas
  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setSelectedDate(null);
    setSelectedTimeSlot(null);
    setAvailableSlots([]);
    setSlotsError(null);
  };

  const handleDateSelect = (date) => {
    const validation = isDateValid(date);
    if (!validation.valid) {
      Alert.alert("Fecha no válida", validation.message);
      return;
    }
    
    setSelectedDate(date);
    setSelectedTimeSlot(null);
    setSlotsError(null);
    
    if (selectedService) {
      fetchAvailability(selectedService.id, date);
    }
  };

  const handleTimeSlotSelect = (timeSlot) => {
    setSelectedTimeSlot(timeSlot);
  };

  const handleBookingSuccess = () => {
    // Navegar directamente a "Mis Turnos" sin mostrar mensaje
    navigation.navigate('MyAppointments');
  };

  const mapBackendToFrontend = (backendData) => {
    return {
      id: backendData.id,
      name: backendData.name,
      category: backendData.category || "Sin categoría",
      urlSlug: backendData.urlSlug,
      description: backendData.description || "Descripción no disponible",
      logoUrl: backendData.logoUrl || null,
      address: backendData.address || "Dirección no disponible",
      phone: backendData.phone || "Teléfono no disponible",
      cancellationHours: backendData.cancellationHours || 24,
      minAdvanceDays: backendData.minAdvanceDays || 0,
      maxAdvanceDays: backendData.maxAdvanceDays || 30,
      hasTimeBetweenTurns: backendData.hasTimeBetweenTurns || false,
      minutesBetweenTurns: backendData.minutesBetweenTurns || 0,
      businessHours: backendData.businessHours ? backendData.businessHours.map(hours => ({
        day: hours.dayOfWeek,
        workingDay: hours.workingDay,
        openTime: hours.openingTime,
        closeTime: hours.closingTime
      })) : [],
      latitude: backendData.latitude,
      longitude: backendData.longitude,
    };
  };

  const getDayName = (dayEnum) => {
    const dayNames = {
      'MONDAY': 'Lunes',
      'TUESDAY': 'Martes', 
      'WEDNESDAY': 'Miércoles',
      'THURSDAY': 'Jueves',
      'FRIDAY': 'Viernes',
      'SATURDAY': 'Sábado',
      'SUNDAY': 'Domingo'
    };
    return dayNames[dayEnum] || dayEnum;
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  const getAllDaysWithStatus = () => {
    if (!company || !company.businessHours) return [];
    
    const allDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    
    return allDays.map(day => {
      const businessHour = company.businessHours.find(bh => bh.day === day);
      
      if (businessHour && businessHour.workingDay) {
        return {
          dayName: getDayName(day),
          isOpen: true,
          openTime: businessHour.openTime,
          closeTime: businessHour.closeTime
        };
      } else {
        return {
          dayName: getDayName(day),
          isOpen: false,
          openTime: null,
          closeTime: null
        };
      }
    });
  };

  const handleBookAppointment = () => {
    // Por ahora solo mostramos un alert, después implementaremos la reserva
    Alert.alert(
      "Reservar Turno",
      "¿Quieres reservar un turno en este club?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Reservar", onPress: () => {
          // Aquí navegaremos a la pantalla de reserva
          Alert.alert("Próximamente", "La funcionalidad de reserva estará disponible pronto");
        }}
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Cargando información del club...</Text>
      </View>
    );
  }

  if (error || !company) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color="#FF6B35" />
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchCompanyData}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Información del club */}
        <View style={styles.companyInfo}>
          {company.logoUrl && (
            <View style={styles.logoContainer}>
              <Text style={styles.logoPlaceholder}>🏢</Text>
            </View>
          )}
          
          <Text style={styles.companyName}>{company.name}</Text>
          <Text style={styles.companyCategory}>{company.category}</Text>
          <Text style={styles.companyDescription}>{company.description}</Text>
          
          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <Ionicons name="location" size={20} color="#FF6B35" />
              <Text style={styles.contactText}>{company.address}</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="call" size={20} color="#FF6B35" />
              <Text style={styles.contactText}>{company.phone}</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "info" && styles.activeTab]}
            onPress={() => setActiveTab("info")}
          >
            <Ionicons 
              name="information-circle" 
              size={20} 
              color={activeTab === "info" ? "white" : "#FF6B35"} 
            />
            <Text style={[styles.tabText, activeTab === "info" && styles.activeTabText]}>
              Información
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === "booking" && styles.activeTab]}
            onPress={() => setActiveTab("booking")}
          >
            <Ionicons 
              name="calendar" 
              size={20} 
              color={activeTab === "booking" ? "white" : "#FF6B35"} 
            />
            <Text style={[styles.tabText, activeTab === "booking" && styles.activeTabText]}>
              Reservar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contenido de las tabs */}
        {activeTab === "info" && (
          <View style={styles.tabContent}>
            {/* Horarios */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Horarios de Atención</Text>
              <View style={styles.hoursContainer}>
                {getAllDaysWithStatus().map((dayInfo, index) => (
                  <View key={index} style={styles.hoursRow}>
                    <Text style={styles.dayName}>{dayInfo.dayName}</Text>
                    <Text style={[
                      styles.timeRange,
                      !dayInfo.isOpen && styles.closedTime
                    ]}>
                      {dayInfo.isOpen 
                        ? `${formatTime(dayInfo.openTime)} - ${formatTime(dayInfo.closeTime)}`
                        : 'Cerrado'
                      }
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Servicios */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Servicios Disponibles</Text>
              {services.length > 0 ? (
                services.map((service) => (
                  <View key={service.id} style={styles.serviceCard}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <Text style={styles.serviceDescription}>{service.description}</Text>
                    <View style={styles.serviceFooter}>
                      <Text style={styles.servicePrice}>${service.price}</Text>
                      <Text style={styles.serviceDuration}>{service.durationMinutes} min</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>No hay servicios disponibles</Text>
              )}
            </View>

            {/* Mapa */}
            {company.latitude && company.longitude && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ubicación</Text>
                <View style={styles.mapContainer}>
                  <MapView
                    style={styles.map}
                    provider={PROVIDER_GOOGLE}
                    initialRegion={{
                      latitude: parseFloat(company.latitude),
                      longitude: parseFloat(company.longitude),
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                  >
                    <Marker
                      coordinate={{
                        latitude: parseFloat(company.latitude),
                        longitude: parseFloat(company.longitude),
                      }}
                      title={company.name}
                      description={company.address}
                    />
                  </MapView>
                </View>
              </View>
            )}
          </View>
        )}

        {activeTab === "booking" && (
          <View style={styles.tabContent}>
            <View style={styles.bookingContainer}>
              {/* Paso 1: Selección de servicio */}
              <ServiceSelector
                services={services}
                selectedService={selectedService}
                onSelectService={handleServiceSelect}
              />

              {/* Paso 2: Selección de fecha */}
              <DateSelector
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                minAdvanceDays={company?.minAdvanceDays || 0}
                maxAdvanceDays={company?.maxAdvanceDays || 30}
                disabled={!selectedService}
              />

              {/* Paso 3: Selección de horario */}
              <TimeSlotSelector
                slots={availableSlots}
                selectedSlot={selectedTimeSlot}
                onSelectSlot={handleTimeSlotSelect}
                loading={loadingSlots}
                error={slotsError}
                disabled={!selectedService || !selectedDate}
              />

              {/* Paso 4: Formulario de reserva */}
              {selectedService && selectedDate && selectedTimeSlot && (
                <BookingForm
                  service={selectedService}
                  date={selectedDate}
                  timeSlot={selectedTimeSlot}
                  companyId={company.id}
                  onBookingSuccess={handleBookingSuccess}
                />
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingTop: 10,
  },
  companyInfo: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 10,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 15,
  },
  logoPlaceholder: {
    fontSize: 60,
  },
  companyName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 5,
  },
  companyCategory: {
    fontSize: 16,
    color: "#FF6B35",
    textAlign: "center",
    marginBottom: 10,
  },
  companyDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 20,
  },
  contactInfo: {
    gap: 10,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  contactText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 25,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  activeTab: {
    backgroundColor: "#FF6B35",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6B35",
  },
  activeTabText: {
    color: "white",
  },
  tabContent: {
    padding: 20,
  },
  bookingContainer: {
    gap: 20,
  },
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  hoursContainer: {
    gap: 10,
  },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  dayName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  timeRange: {
    fontSize: 16,
    color: "#666",
  },
  closedTime: {
    color: "#999",
    fontStyle: "italic",
  },
  serviceCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  serviceDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  serviceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6B35",
  },
  serviceDuration: {
    fontSize: 14,
    color: "#666",
  },
  noDataText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  bookingInfo: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
  },
  bookingTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  bookingDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  bookButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  bookButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});

export default CompanyDetailScreen;
