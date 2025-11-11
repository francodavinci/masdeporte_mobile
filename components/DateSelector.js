import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const DateSelector = ({ 
  selectedDate, 
  onDateSelect, 
  minAdvanceDays = 0, 
  maxAdvanceDays = 30,
  disabled = false 
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Generar fechas disponibles
  const generateAvailableDates = () => {
    const today = new Date();
    const dates = [];
    
    for (let i = minAdvanceDays; i <= maxAdvanceDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  const availableDates = generateAvailableDates();

  // Agrupar fechas por mes
  const groupDatesByMonth = () => {
    const groups = {};
    availableDates.forEach(date => {
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(date);
    });
    return groups;
  };

  const monthGroups = groupDatesByMonth();

  const formatDate = (date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const formatMonth = (date) => {
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long'
    });
  };

  const isDateSelected = (date) => {
    if (!selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getDayName = (date) => {
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dayNames[date.getDay()];
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const getCurrentMonthDates = () => {
    const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;
    return monthGroups[monthKey] || [];
  };

  const currentMonthDates = getCurrentMonthDates();

  if (disabled) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Selecciona una fecha</Text>
        <View style={styles.disabledContainer}>
          <Ionicons name="calendar-outline" size={40} color="#ccc" />
          <Text style={styles.disabledText}>
            Primero selecciona un servicio
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona una fecha</Text>
      
      {/* Navegación del mes */}
      <View style={styles.monthNavigation}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigateMonth(-1)}
        >
          <Ionicons name="chevron-back" size={20} color="#FF6B35" />
        </TouchableOpacity>
        
        <Text style={styles.monthTitle}>
          {formatMonth(currentMonth)}
        </Text>
        
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => navigateMonth(1)}
        >
          <Ionicons name="chevron-forward" size={20} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      {/* Fechas disponibles */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.datesContainer}
      >
        {currentMonthDates.map((date, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dateCard,
              isDateSelected(date) && styles.selectedDateCard,
              isToday(date) && styles.todayCard,
            ]}
            onPress={() => onDateSelect(date)}
          >
            <Text style={[
              styles.dayName,
              isDateSelected(date) && styles.selectedDayName,
              isToday(date) && !isDateSelected(date) && styles.todayDayName,
            ]}>
              {getDayName(date)}
            </Text>
            <Text style={[
              styles.dayNumber,
              isDateSelected(date) && styles.selectedDayNumber,
              isToday(date) && !isDateSelected(date) && styles.todayDayNumber,
            ]}>
              {date.getDate()}
            </Text>
            <Text style={[
              styles.monthName,
              isDateSelected(date) && styles.selectedMonthName,
              isToday(date) && !isDateSelected(date) && styles.todayMonthName,
            ]}>
              {date.toLocaleDateString('es-ES', { month: 'short' })}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Información de políticas */}
      {(minAdvanceDays > 0 || maxAdvanceDays < 365) && (
        <View style={styles.policyInfo}>
          <Ionicons name="information-circle-outline" size={16} color="#666" />
          <Text style={styles.policyText}>
            Puedes reservar entre {minAdvanceDays} y {maxAdvanceDays} días de anticipación
          </Text>
        </View>
      )}
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
  monthNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#FFF5F2",
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  datesContainer: {
    paddingHorizontal: 5,
    gap: 10,
  },
  dateCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    width: 80,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedDateCard: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  todayCard: {
    borderColor: "#28A745",
  },
  dayName: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
    marginBottom: 5,
  },
  selectedDayName: {
    color: "white",
  },
  todayDayName: {
    color: "#28A745",
    fontWeight: "600",
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  selectedDayNumber: {
    color: "white",
  },
  todayDayNumber: {
    color: "#28A745",
  },
  monthName: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
  },
  selectedMonthName: {
    color: "white",
  },
  todayMonthName: {
    color: "#28A745",
  },
  policyInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    paddingHorizontal: 5,
    gap: 8,
  },
  policyText: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
});

export default DateSelector;
