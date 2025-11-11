import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { providerService } from "../utils/api";
import UserDetailContext from "../context/UserDetailContext";

const { width, height } = Dimensions.get("window");

const ServicesScreen = ({ navigation }) => {
  const { userDetails } = useContext(UserDetailContext);
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [region, setRegion] = useState({
    latitude: -34.6037, // Buenos Aires por defecto
    longitude: -58.3816,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    const initializeScreen = async () => {
      try {
        await fetchCompanies();
      } catch (error) {
        console.error('Error initializing ServicesScreen:', error);
        Alert.alert("Error", "Error al cargar la pantalla. Intenta de nuevo.");
      }
    };
    
    initializeScreen();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await providerService.getAllCompanies();
      
      if (response.success && response.data) {
        const companiesData = response.data;
        setCompanies(companiesData);
        setFilteredCompanies(companiesData);
        
        // Calcular región del mapa basada en las empresas
        if (companiesData.length > 0) {
          calculateMapRegion(companiesData);
        }
      } else {
        Alert.alert("Error", "No se pudieron cargar las empresas");
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
      Alert.alert("Error", "Error al cargar las empresas");
    } finally {
      setLoading(false);
    }
  };

  const calculateMapRegion = (companiesData) => {
    const validCompanies = companiesData.filter(
      company => company.latitude && company.longitude
    );

    if (validCompanies.length === 0) return;

    const latitudes = validCompanies.map(c => parseFloat(c.latitude));
    const longitudes = validCompanies.map(c => parseFloat(c.longitude));

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const deltaLat = Math.max(maxLat - minLat, 0.01) * 1.2;
    const deltaLng = Math.max(maxLng - minLng, 0.01) * 1.2;

    setRegion({
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: deltaLat,
      longitudeDelta: deltaLng,
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() && !searchLocation.trim()) {
      setFilteredCompanies(companies);
      return;
    }

    setIsSearching(true);
    try {
      const response = await providerService.searchCompanies(
        searchQuery.trim() || null,
        searchLocation.trim() || null
      );

      if (response.success && response.data) {
        setFilteredCompanies(response.data);
        if (response.data.length > 0) {
          calculateMapRegion(response.data);
        }
      } else {
        setFilteredCompanies([]);
        Alert.alert("Sin resultados", "No se encontraron empresas con los criterios especificados");
      }
    } catch (error) {
      console.error("Error searching companies:", error);
      Alert.alert("Error", "Error al realizar la búsqueda");
    } finally {
      setIsSearching(false);
    }
  };

  const handleCompanyPress = (company) => {
    navigation.navigate("CompanyDetail", { 
      urlSlug: company.urlSlug,
      companyName: company.companyName 
    });
  };

  const renderCompanyCard = (company) => (
    <TouchableOpacity
      key={company.id}
      style={styles.companyCard}
      onPress={() => handleCompanyPress(company)}
    >
      <View style={styles.companyInfo}>
        <Text style={styles.companyName}>{company.companyName}</Text>
        <Text style={styles.companyCategory}>{company.category}</Text>
        <Text style={styles.companyAddress} numberOfLines={2}>
        <Ionicons name="location-outline" size={16} color="#666" />
        {company.address}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#FF6B35" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Cargando empresas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con búsqueda */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>MasDeporte</Text>
          {userDetails.isAuthenticated && (
            <TouchableOpacity
              style={styles.myAppointmentsButton}
              onPress={() => navigation.navigate('MyAppointments')}
            >
              <Ionicons name="calendar" size={20} color="white" />
              <Text style={styles.myAppointmentsText}>Mis Turnos</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.subtitle}>Encuentra tu club favorito</Text>
        
        {/* Barra de búsqueda */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="business-outline" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Nombre del club..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          <View style={styles.searchInputContainer}>
            <Ionicons name="location-outline" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Ubicación..."
              value={searchLocation}
              onChangeText={setSearchLocation}
            />
          </View>
          
          <TouchableOpacity
            style={[styles.searchButton, isSearching && styles.searchButtonDisabled]}
            onPress={handleSearch}
            disabled={isSearching}
          >
            <Ionicons name="search" size={20} color="white" />
            <Text style={styles.searchButtonText}>
              {isSearching ? "Buscando..." : "Buscar"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Toggle entre mapa y lista */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, showMap && styles.toggleButtonActive]}
          onPress={() => setShowMap(true)}
        >
          <Ionicons name="map" size={20} color={showMap ? "white" : "#FF6B35"} />
          <Text style={[styles.toggleText, showMap && styles.toggleTextActive]}>
            Mapa
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.toggleButton, !showMap && styles.toggleButtonActive]}
          onPress={() => setShowMap(false)}
        >
          <Ionicons name="list" size={20} color={!showMap ? "white" : "#FF6B35"} />
          <Text style={[styles.toggleText, !showMap && styles.toggleTextActive]}>
            Lista
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenido principal */}
      {showMap ? (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            region={region}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {filteredCompanies.map((company) => {
              if (!company.latitude || !company.longitude) return null;
              
              return (
                <Marker
                  key={company.id}
                  coordinate={{
                    latitude: parseFloat(company.latitude),
                    longitude: parseFloat(company.longitude),
                  }}
                  title={company.companyName}
                  description={company.category}
                  onPress={() => handleCompanyPress(company)}
                />
              );
            })}
          </MapView>
          
          <View style={styles.mapInfo}>
            <Text style={styles.mapInfoText}>
              {filteredCompanies.length} club{filteredCompanies.length !== 1 ? 'es' : ''} encontrado{filteredCompanies.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {filteredCompanies.length > 0 ? (
            filteredCompanies.map(renderCompanyCard)
          ) : (
            <View style={styles.noResultsContainer}>
              <Ionicons name="search" size={60} color="#ccc" />
              <Text style={styles.noResultsTitle}>No se encontraron clubes</Text>
              <Text style={styles.noResultsText}>
                Intenta con otros términos de búsqueda
              </Text>
            </View>
          )}
        </ScrollView>
      )}
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
  header: {
    backgroundColor: "#FF6B35",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
  },
  myAppointmentsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  myAppointmentsText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 20,
  },
  searchContainer: {
    gap: 10,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 45,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 25,
    height: 45,
    gap: 8,
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 25,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: "#FF6B35",
  },
  toggleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6B35",
  },
  toggleTextActive: {
    color: "white",
  },
  mapContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 15,
    overflow: "hidden",
  },
  map: {
    flex: 1,
  },
  mapInfo: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 10,
    borderRadius: 10,
  },
  mapInfoText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  listContainer: {
    flex: 1,
    padding: 20,
  },
  companyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  companyCategory: {
    fontSize: 14,
    color: "#FF6B35",
    fontWeight: "500",
    marginBottom: 4,
  },
  companyAddress: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  companyFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: "#666",
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  noResultsTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  noResultsText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});

export default ServicesScreen;
