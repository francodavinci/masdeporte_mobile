import React, { useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { paymentsService, couponService } from "../utils/api";
import UserDetailContext from "../context/UserDetailContext";

const BookingForm = ({
  service,
  date,
  timeSlot,
  companyId,
  onBookingSuccess
}) => {
  const { userDetails } = useContext(UserDetailContext);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [showCouponInput, setShowCouponInput] = useState(false);

  // Calcular el precio total con descuento
  const totalPriceWithDiscount = appliedCoupon && appliedCoupon.discountAmount
    ? Math.max(0, service.price - appliedCoupon.discountAmount)
    : service.price;

  // Calcular el monto de la seña (25% del precio total CON descuento)
  const depositAmount = totalPriceWithDiscount * 0.25;
  const remainingAmount = totalPriceWithDiscount - depositAmount;

  const formatPrice = (price) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return "";
    return timeString.substring(0, 5);
  };

  // Función para aplicar cupón usando el nuevo endpoint
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      Alert.alert('Código requerido', 'Por favor ingresa un código de cupón');
      return;
    }

    setIsApplyingCoupon(true);
    try {
      const response = await couponService.mobileHandleCoupon({
        couponCode: couponCode.trim().toUpperCase(),
        companyId: companyId,
        originalAmount: service.price,
        userEmail: userDetails.email
      });

      if (response.success) {
        const couponData = response.data;
        if (couponData && couponData.discountAmount !== undefined) {
          setAppliedCoupon(couponData);
          Alert.alert('¡Cupón aplicado!', response.message || '¡Cupón aplicado exitosamente!');
          setCouponCode('');
          setShowCouponInput(false);
        } else {
          throw new Error('Datos del cupón inválidos');
        }
      } else {
        throw new Error(response.message || 'Error aplicando cupón');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Error aplicando cupón';
      Alert.alert('Error', errorMessage);
      setAppliedCoupon(null);
    } finally {
      setIsApplyingCoupon(false);
    }
  };


  const handleBooking = async () => {
    if (!userDetails.isAuthenticated) {
      Alert.alert(
        "Iniciar sesión requerido",
        "Debes iniciar sesión para reservar un turno",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Iniciar sesión", onPress: () => {} }
        ]
      );
      return;
    }

    try {
      setLoading(true);

      // Crear la preferencia de pago
      const paymentData = {
        title: `Seña - ${service.name}`,
        description: `Seña del 25% para reserva de ${service.name} - ${formatDate(date)} ${formatTime(timeSlot)}`,
        amount: depositAmount,
        quantity: 1,
        currency: "ARS",
        external_reference: `appointment_${Date.now()}`,
        serviceId: service.id,
        companyId: companyId,
        userEmail: userDetails.email,
        startTime: `${date.toISOString().split('T')[0]}T${timeSlot}:00`,
        notes: notes,
        userId: userDetails.userId || null,
        // Información del cupón aplicado
        appliedCoupon: appliedCoupon,
        originalAmount: service.price,
        totalAmountWithDiscount: totalPriceWithDiscount,
        // URLs de callback para mobile usando deep links
        back_urls: {
          success: "masdeporte://payment?status=success",
          failure: "masdeporte://payment?status=failure",
          pending: "masdeporte://payment?status=pending"
        },
        payment_methods: {
          excluded_payment_methods: [],
          excluded_payment_types: [],
          installments: 12,
          default_installments: 1
        },
        notification_url: "https://masdeportebackend.up.railway.app/api/mercadopago/notifications",
        auto_return: "approved",
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        payer: {
          email: userDetails.email,
          name: userDetails.name || "Usuario",
          surname: userDetails.surname || "MasDeporte"
        }
      };

      console.log('💳 Payment data being sent:', paymentData);

      const preference = await paymentsService.createPaymentPreference(paymentData);
      console.log('💳 Payment preference response:', preference);

      if (preference.success) {
        const paymentUrl = preference.data.init_point;
        console.log('🔗 Payment URL received:', paymentUrl);

        const supported = await Linking.canOpenURL(paymentUrl);
        if (supported) {
          // Mostrar el Alert PRIMERO, antes de abrir la URL
          // Cuando se abre la URL, la app va al background y el Alert no se muestra
          Alert.alert(
            "Pago en Proceso",
            "Serás redirigido a Mercado Pago para completar el pago. Después del pago, serás redirigido automáticamente a la app.",
            [
              {
                text: "Ir a Mercado Pago",
                onPress: async () => {
                  try {
                    // Abrir la URL después de que el usuario presione el botón
                    await Linking.openURL(paymentUrl);
                    // Opcional: ejecutar callback después de un pequeño delay
                    setTimeout(() => {
                      if (onBookingSuccess) {
                        onBookingSuccess();
                      }
                    }, 500);
                  } catch (error) {
                    console.error('Error al abrir URL de pago:', error);
                    Alert.alert("Error", "No se pudo abrir Mercado Pago. Intenta de nuevo.");
                  }
                }
              }
            ],
            { cancelable: false }
          );
        } else {
          Alert.alert("Error", "No se puede abrir el enlace de pago");
        }
      } else {
        console.error('❌ Payment preference failed:', preference);
        Alert.alert("Error", preference.message || "Error al crear el pago");
      }

    } catch (error) {
      console.error("Error al procesar el pago:", error);
      Alert.alert("Error", "Error al procesar el pago. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={["bottom"]}>
      <View style={styles.container}>
      {/* Resumen de la reserva */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Resumen de la reserva</Text>

        <View style={styles.summaryItem}>
          <Ionicons name="business-outline" size={20} color="#666" />
          <Text style={styles.summaryLabel}>Servicio:</Text>
          <Text style={styles.summaryValue}>{service.name}</Text>
        </View>

        <View style={styles.summaryItem}>
          <Ionicons name="calendar-outline" size={20} color="#666" />
          <Text style={styles.summaryLabel}>Fecha:</Text>
          <Text style={styles.summaryValue}>{formatDate(date)}</Text>
        </View>

        <View style={styles.summaryItem}>
          <Ionicons name="time-outline" size={20} color="#666" />
          <Text style={styles.summaryLabel}>Hora:</Text>
          <Text style={styles.summaryValue}>{formatTime(timeSlot)}</Text>
        </View>

        <View style={styles.summaryItem}>
          <Ionicons name="hourglass-outline" size={20} color="#666" />
          <Text style={styles.summaryLabel}>Duración:</Text>
          <Text style={styles.summaryValue}>{service.durationMinutes} minutos</Text>
        </View>
      </View>

      {/* Selector de cupones */}
      {userDetails.isAuthenticated && (
        <View style={styles.couponCard}>
          {appliedCoupon && appliedCoupon.discountAmount !== undefined ? (
            <View style={styles.appliedCoupon}>
              <View style={styles.couponInfo}>
                <Ionicons name="ticket-outline" size={24} color="#fff" />
                <View style={styles.couponDetails}>
                  <Text style={styles.couponCode}>{appliedCoupon.coupon?.code}</Text>
                  <Text style={styles.couponDiscount}>
                    -{formatPrice(appliedCoupon.discountAmount || 0)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.removeCouponButton}
                onPress={() => setAppliedCoupon(null)}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.couponInputSection}>
              {!showCouponInput ? (
                <TouchableOpacity
                  style={styles.applyCouponButton}
                  onPress={() => setShowCouponInput(true)}
                >
                  <Ionicons name="ticket-outline" size={20} color="#FF6B35" />
                  <Text style={styles.applyCouponText}>¿Tienes un cupón?</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.couponForm}>
                  <View style={styles.inputGroup}>
                    <TextInput
                      style={styles.couponInput}
                      value={couponCode}
                      onChangeText={(text) => setCouponCode(text.toUpperCase())}
                      placeholder="Código de cupón"
                      placeholderTextColor="#999"
                      maxLength={20}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={[styles.applyButton, (!couponCode.trim() || isApplyingCoupon) && styles.applyButtonDisabled]}
                      onPress={handleApplyCoupon}
                      disabled={isApplyingCoupon || !couponCode.trim()}
                    >
                      {isApplyingCoupon ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={styles.applyButtonText}>Aplicar</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowCouponInput(false);
                      setCouponCode('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* Detalles de pago */}
      <View style={styles.paymentCard}>
        <Text style={styles.paymentTitle}>Detalles de pago</Text>

        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Precio original del servicio:</Text>
          <Text style={styles.paymentValue}>{formatPrice(service.price)}</Text>
        </View>

        {appliedCoupon && appliedCoupon.discountAmount && appliedCoupon.discountAmount > 0 && (
          <>
            <View style={styles.paymentRow}>
              <Text style={[styles.paymentLabel, styles.discountLabel]}>Descuento aplicado:</Text>
              <Text style={[styles.paymentValue, styles.discountValue]}>
                -{formatPrice(appliedCoupon.discountAmount)}
              </Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={[styles.paymentLabel, styles.finalPriceLabel]}>Precio con descuento:</Text>
              <Text style={[styles.paymentValue, styles.finalPriceValue]}>
                {formatPrice(totalPriceWithDiscount)}
              </Text>
            </View>
          </>
        )}

        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Seña a pagar (25%):</Text>
          <Text style={styles.paymentValue}>{formatPrice(depositAmount)}</Text>
        </View>

        <View style={[styles.paymentRow, styles.paymentRowTotal]}>
          <Text style={styles.paymentLabelTotal}>Saldo restante a pagar:</Text>
          <Text style={styles.paymentValueTotal}>{formatPrice(remainingAmount)}</Text>
        </View>
      </View>

      {/* Notas adicionales */}
      <View style={styles.notesCard}>
        <Text style={styles.notesTitle}>Notas adicionales (opcional)</Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Agrega cualquier información adicional que quieras compartir"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Botón de reserva */}
      <TouchableOpacity
        style={[styles.bookButton, loading && styles.bookButtonDisabled]}
        onPress={handleBooking}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Ionicons name="card-outline" size={20} color="white" />
        )}
        <Text style={styles.bookButtonText}>
          {loading ? "Procesando pago..." : "Pagar seña y confirmar reserva"}
        </Text>
      </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  couponCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  appliedCoupon: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  couponInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  couponDetails: {
    flexDirection: "column",
    gap: 2,
  },
  couponCode: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  couponDiscount: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  removeCouponButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  couponInputSection: {
    marginTop: 6,
    gap: 10,
  },
  applyCouponButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255, 107, 53, 0.08)",
    borderWidth: 1,
    borderColor: "#FF6B35",
    borderRadius: 10,
    paddingVertical: 12,
  },
  applyCouponText: {
    color: "#FF6B35",
    fontSize: 14,
    fontWeight: "600",
  },
  couponForm: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#F8F9FA",
    fontSize: 14,
    color: "#333",
  },
  applyButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonDisabled: {
    backgroundColor: "#ccc",
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelButton: {
    alignSelf: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
    minWidth: 60,
  },
  summaryValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    flex: 1,
  },
  paymentCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  discountLabel: {
    color: "#333",
  },
  discountValue: {
    color: "#4CAF50",
    fontWeight: "700",
  },
  finalPriceLabel: {
    color: "#333",
    fontWeight: "600",
  },
  finalPriceValue: {
    color: "#FF6B35",
    fontWeight: "700",
  },
  paymentRowTotal: {
    borderTopWidth: 1,
    borderTopColor: "#DEE2E6",
    paddingTop: 10,
    marginTop: 10,
  },
  paymentLabel: {
    fontSize: 14,
    color: "#666",
  },
  paymentLabelTotal: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  paymentValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  paymentValueTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF6B35",
  },
  notesCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#F8F9FA",
  },
  bookButton: {
    backgroundColor: "#FF6B35",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    borderRadius: 12,
    gap: 10,
    marginBottom: 32,
  },
  bookButtonDisabled: {
    backgroundColor: "#ccc",
  },
  bookButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default BookingForm;