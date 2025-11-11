import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { appointmentService } from "../utils/api";
import { useContext } from "react";
import UserDetailContext from "../context/UserDetailContext";

const MyAppointmentsScreen = ({ navigation }) => {
  const { userDetails } = useContext(UserDetailContext);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [activeTab, setActiveTab] = useState("list");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await appointmentService.getUserAppointments();
      
      if (response.success) {
        setAppointments(response.data || []);
      } else {
        setError(response.message || "Error al cargar los turnos");
      }
    } catch (err) {
      console.error("Error loading appointments:", err);
      setError("Error al cargar los turnos");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  const isSameDay = (dateTimeISO, yyyyMmDd) => {
    if (!dateTimeISO || !yyyyMmDd) return false;
    const dateOnly = String(dateTimeISO).split("T")[0];
    return dateOnly === yyyyMmDd;
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const serviceMatch = (appointment.serviceName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const statusMatch =
        statusFilter === "all" || appointment.status === statusFilter;
      const dateMatch = !dateFilter || isSameDay(appointment.startTime, dateFilter);
      return serviceMatch && statusMatch && dateMatch;
    });
  }, [appointments, searchTerm, statusFilter, dateFilter]);

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;
    
    try {
      setLoading(true);
      const response = await appointmentService.cancelAppointment(selectedAppointment.id);
      
      if (response.success) {
        setAppointments((prev) =>
          prev.map((app) =>
            app.id === selectedAppointment.id ? { ...app, status: "CANCELLED" } : app
          )
        );
        Alert.alert("Éxito", "Turno cancelado correctamente");
        setShowCancelModal(false);
        setSelectedAppointment(null);
      } else {
        Alert.alert("Error", response.message || "Error al cancelar el turno");
      }
    } catch (err) {
      console.error("Error canceling appointment:", err);
      Alert.alert("Error", "Error al cancelar el turno");
    } finally {
      setLoading(false);
    }
  };

  const openCancelModal = (appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setSelectedAppointment(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "CONFIRMED": return "#28A745";
      case "CANCELLED": return "#DC3545";
      default: return "#6C757D";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "CONFIRMED": return "Confirmado";
      case "CANCELLED": return "Cancelado";
      default: return "Desconocido";
    }
  };

  const groupByDate = useMemo(() => {
    const groups = {};
    for (const app of filteredAppointments) {
      const key = String(app.startTime).split("T")[0];
      if (!groups[key]) groups[key] = [];
      groups[key].push(app);
    }
    return Object.keys(groups)
      .sort()
      .map((dateKey) => ({ dateKey, items: groups[dateKey] }));
  }, [filteredAppointments]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderAppointmentCard = (appointment) => (
    <View key={appointment.id} style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <Text style={styles.serviceName}>{appointment.serviceName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
          <Text style={styles.statusText}>{getStatusText(appointment.status)}</Text>
        </View>
      </View>
      
      <View style={styles.appointmentInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="business" size={16} color="#666" />
          <Text style={styles.infoText}>
            {appointment.companyName || appointment.providerName || "Sin información"}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={16} color="#666" />
          <Text style={styles.infoText}>
            {formatDate(appointment.startTime)}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Ionicons name="time" size={16} color="#666" />
          <Text style={styles.infoText}>
            {formatTime(appointment.startTime)}
          </Text>
        </View>
      </View>
      
      {(appointment.status === "PENDING" || appointment.status === "CONFIRMED") && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => openCancelModal(appointment)}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancelar Turno</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading && appointments.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Cargando tus turnos...</Text>
      </View>
    );
  }

  if (error && appointments.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color="#FF6B35" />
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadAppointments}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mis Turnos</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadAppointments} disabled={loading}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "list" && styles.activeTab]}
          onPress={() => setActiveTab("list")}
        >
          <Ionicons name="list" size={20} color={activeTab === "list" ? "white" : "#FF6B35"} />
          <Text style={[styles.tabText, activeTab === "list" && styles.activeTabText]}>
            Lista
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === "calendar" && styles.activeTab]}
          onPress={() => setActiveTab("calendar")}
        >
          <Ionicons name="calendar" size={20} color={activeTab === "calendar" ? "white" : "#FF6B35"} />
          <Text style={[styles.tabText, activeTab === "calendar" && styles.activeTabText]}>
            Calendario
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por servicio..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
        
        <View style={styles.filterRow}>
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Estado:</Text>
            <View style={styles.statusFilter}>
              {["all","CONFIRMED", "CANCELLED"].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    statusFilter === status && styles.statusOptionActive
                  ]}
                  onPress={() => setStatusFilter(status)}
                >
                  <Text style={[
                    styles.statusOptionText,
                    statusFilter === status && styles.statusOptionTextActive
                  ]}>
                    {status === "all" ? "Todos" : getStatusText(status)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Contenido */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredAppointments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={60} color="#ccc" />
            <Text style={styles.emptyTitle}>No hay turnos</Text>
            <Text style={styles.emptyText}>
              {searchTerm || statusFilter !== "all" || dateFilter
                ? "No se encontraron turnos con los filtros aplicados"
                : "No tienes turnos reservados aún"
              }
            </Text>
          </View>
        ) : activeTab === "list" ? (
          filteredAppointments.map(renderAppointmentCard)
        ) : (
          groupByDate.map(({ dateKey, items }) => (
            <View key={dateKey} style={styles.calendarDay}>
              <Text style={styles.calendarDate}>{formatDate(dateKey)}</Text>
              {items
                .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                .map(renderAppointmentCard)
              }
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal de cancelación */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={closeCancelModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirmar cancelación</Text>
              <TouchableOpacity onPress={closeCancelModal}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalText}>
                ¿Estás seguro de que deseas cancelar este turno? Esta acción no se puede deshacer.
              </Text>
              {selectedAppointment && (
                <View style={styles.modalAppointmentInfo}>
                  <Text style={styles.modalAppointmentText}>
                    {selectedAppointment.serviceName}
                  </Text>
                  <Text style={styles.modalAppointmentText}>
                    {formatDate(selectedAppointment.startTime)} - {formatTime(selectedAppointment.startTime)}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={closeCancelModal}
                disabled={loading}
              >
                <Text style={styles.modalButtonSecondaryText}>Volver</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={handleCancelAppointment}
                disabled={loading}
              >
                <Text style={styles.modalButtonPrimaryText}>
                  {loading ? "Cancelando..." : "Confirmar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FF6B35",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  refreshButton: {
    padding: 5,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 20,
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
  filtersContainer: {
    backgroundColor: "white",
    margin: 20,
    borderRadius: 12,
    padding: 15,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 12,
  },
  filterRow: {
    gap: 10,
  },
  filterContainer: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  statusFilter: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  statusOptionActive: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  statusOptionText: {
    fontSize: 14,
    color: "#666",
  },
  statusOptionTextActive: {
    color: "white",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  appointmentCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  appointmentInfo: {
    gap: 8,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  cancelButton: {
    backgroundColor: "#DC3545",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  calendarDay: {
    marginBottom: 20,
  },
  calendarDate: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 15,
    width: "100%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  modalBody: {
    padding: 20,
  },
  modalText: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
    marginBottom: 15,
  },
  modalAppointmentInfo: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 8,
  },
  modalAppointmentText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    gap: 10,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
    alignItems: "center",
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#DC3545",
    alignItems: "center",
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    color: "white",
    fontWeight: "600",
  },
});

export default MyAppointmentsScreen;
