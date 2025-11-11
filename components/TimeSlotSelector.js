import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const TimeSlotSelector = ({ 
  slots = [], 
  selectedSlot, 
  onSelectSlot, 
  loading = false,
  error = null,
  disabled = false 
}) => {
  const formatTime = (timeString) => {
    if (!timeString) return "";
    // Si viene en formato HH:mm:ss, tomar solo HH:mm
    return timeString.substring(0, 5);
  };

  const isSlotSelected = (slot) => {
    if (!selectedSlot || !slot) return false;
    return slot === selectedSlot;
  };

  const groupSlotsByTime = () => {
    const groups = {};
    slots.forEach(slot => {
      const time = formatTime(slot);
      if (!groups[time]) {
        groups[time] = [];
      }
      groups[time].push(slot);
    });
    return groups;
  };

  const slotGroups = groupSlotsByTime();

  if (disabled) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Selecciona un horario</Text>
        <View style={styles.disabledContainer}>
          <Ionicons name="time-outline" size={40} color="#ccc" />
          <Text style={styles.disabledText}>
            Primero selecciona un servicio y fecha
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Selecciona un horario</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Cargando horarios disponibles...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Selecciona un horario</Text>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={40} color="#FF6B35" />
          <Text style={styles.errorTitle}>Error al cargar horarios</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  if (slots.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Selecciona un horario</Text>
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={40} color="#ccc" />
          <Text style={styles.emptyTitle}>No hay horarios disponibles</Text>
          <Text style={styles.emptyText}>
            No se encontraron horarios para la fecha seleccionada
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona un horario</Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.slotsContainer}
      >
        {Object.entries(slotGroups).map(([time, timeSlots]) => (
          <View key={time} style={styles.timeGroup}>
            <Text style={styles.timeLabel}>{time}</Text>
            <View style={styles.slotsRow}>
              {timeSlots.map((slot, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.slotButton,
                    isSlotSelected(slot) && styles.selectedSlotButton,
                  ]}
                  onPress={() => onSelectSlot(slot)}
                >
                  <Text style={[
                    styles.slotText,
                    isSlotSelected(slot) && styles.selectedSlotText,
                  ]}>
                    {formatTime(slot)}
                  </Text>
                  {isSlotSelected(slot) && (
                    <Ionicons 
                      name="checkmark-circle" 
                      size={16} 
                      color="white" 
                      style={styles.checkIcon}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Información adicional */}
      <View style={styles.infoContainer}>
        <Ionicons name="information-circle-outline" size={16} color="#666" />
        <Text style={styles.infoText}>
          Los horarios mostrados están disponibles para reservar
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  disabledContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e9ecef",
    borderStyle: "dashed",
  },
  disabledText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
    textAlign: "center",
  },
  loadingContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 10,
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: "#FFF5F2",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFE5E5",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6B35",
    marginTop: 10,
    marginBottom: 5,
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 10,
    marginBottom: 5,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  slotsContainer: {
    paddingHorizontal: 5,
    gap: 15,
  },
  timeGroup: {
    alignItems: "center",
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 10,
  },
  slotsRow: {
    flexDirection: "row",
    gap: 8,
  },
  slotButton: {
    backgroundColor: "white",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "#e9ecef",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: 80,
    justifyContent: "center",
  },
  selectedSlotButton: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  slotText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  selectedSlotText: {
    color: "white",
  },
  checkIcon: {
    marginLeft: 2,
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    paddingHorizontal: 5,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
});

export default TimeSlotSelector;
