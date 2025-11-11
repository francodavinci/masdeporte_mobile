import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ServiceSelector = ({ services, selectedService, onSelectService }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price);
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selecciona un servicio</Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.servicesContainer}
      >
        {services.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={[
              styles.serviceCard,
              selectedService?.id === service.id && styles.selectedServiceCard,
            ]}
            onPress={() => onSelectService(service)}
          >
            <View style={styles.serviceHeader}>
              <Text
                style={[
                  styles.serviceName,
                  selectedService?.id === service.id && styles.selectedServiceName,
                ]}
                numberOfLines={2}
              >
                {service.name}
              </Text>
              <View style={styles.servicePrice}>
                <Text
                  style={[
                    styles.priceText,
                    selectedService?.id === service.id && styles.selectedPriceText,
                  ]}
                >
                  {formatPrice(service.price)}
                </Text>
              </View>
            </View>
            
            <Text
              style={[
                styles.serviceDescription,
                selectedService?.id === service.id && styles.selectedServiceDescription,
              ]}
              numberOfLines={3}
            >
              {service.description}
            </Text>
            
            <View style={styles.serviceFooter}>
              <View style={styles.durationContainer}>
                <Ionicons 
                  name="time-outline" 
                  size={16} 
                  color={selectedService?.id === service.id ? "#FF6B35" : "#666"} 
                />
                <Text
                  style={[
                    styles.durationText,
                    selectedService?.id === service.id && styles.selectedDurationText,
                  ]}
                >
                  {formatDuration(service.durationMinutes)}
                </Text>
              </View>
              
              <View style={styles.selectionIndicator}>
                {selectedService?.id === service.id && (
                  <Ionicons name="checkmark-circle" size={24} color="#FF6B35" />
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  servicesContainer: {
    paddingHorizontal: 5,
    gap: 15,
  },
  serviceCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    width: 280,
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
  selectedServiceCard: {
    borderColor: "#FF6B35",
    backgroundColor: "#FFF5F2",
  },
  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 10,
  },
  selectedServiceName: {
    color: "#FF6B35",
  },
  servicePrice: {
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  selectedServicePrice: {
    backgroundColor: "#FF6B35",
  },
  priceText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  selectedPriceText: {
    color: "white",
  },
  serviceDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 15,
  },
  selectedServiceDescription: {
    color: "#555",
  },
  serviceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  durationContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  durationText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  selectedDurationText: {
    color: "#FF6B35",
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ServiceSelector;
