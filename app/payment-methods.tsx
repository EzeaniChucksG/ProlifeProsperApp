import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { storage } from '@/services/storage';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'wallet';
  last4: string;
  brand?: string;
  expiryMonth?: string;
  expiryYear?: string;
  bankName?: string;
  walletType?: 'apple_pay' | 'google_pay';
  isDefault: boolean;
}

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const savedMethods = await storage.getItem('payment_methods');
      if (savedMethods) {
        setPaymentMethods(JSON.parse(savedMethods));
      } else {
        // Mock payment methods for demo
        const mockMethods: PaymentMethod[] = [
          {
            id: '1',
            type: 'card',
            last4: '4242',
            brand: 'Visa',
            expiryMonth: '12',
            expiryYear: '25',
            isDefault: true,
          },
          {
            id: '2',
            type: 'card',
            last4: '5555',
            brand: 'Mastercard',
            expiryMonth: '08',
            expiryYear: '26',
            isDefault: false,
          },
          {
            id: '3',
            type: 'wallet',
            last4: '',
            walletType: 'apple_pay',
            isDefault: false,
          },
        ];
        setPaymentMethods(mockMethods);
        await storage.setItem('payment_methods', JSON.stringify(mockMethods));
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    const updatedMethods = paymentMethods.map(method => ({
      ...method,
      isDefault: method.id === id,
    }));
    setPaymentMethods(updatedMethods);
    await storage.setItem('payment_methods', JSON.stringify(updatedMethods));
    Alert.alert('Success', 'Default payment method updated');
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updatedMethods = paymentMethods.filter(m => m.id !== id);
            setPaymentMethods(updatedMethods);
            await storage.setItem('payment_methods', JSON.stringify(updatedMethods));
          },
        },
      ]
    );
  };

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    if (method.type === 'card') {
      return 'card-outline';
    } else if (method.type === 'bank') {
      return 'business-outline';
    } else if (method.walletType === 'apple_pay') {
      return 'logo-apple';
    } else if (method.walletType === 'google_pay') {
      return 'logo-google';
    }
    return 'wallet-outline';
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    if (method.type === 'card') {
      return `${method.brand} •••• ${method.last4}`;
    } else if (method.type === 'bank') {
      return `${method.bankName} •••• ${method.last4}`;
    } else if (method.walletType === 'apple_pay') {
      return 'Apple Pay';
    } else if (method.walletType === 'google_pay') {
      return 'Google Pay';
    }
    return 'Payment Method';
  };

  const getPaymentMethodSubtext = (method: PaymentMethod) => {
    if (method.type === 'card') {
      return `Expires ${method.expiryMonth}/${method.expiryYear}`;
    }
    return '';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : paymentMethods.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Payment Methods</Text>
            <Text style={styles.emptyText}>
              Add a payment method to make donations faster
            </Text>
          </View>
        ) : (
          <View style={styles.methodsList}>
            {paymentMethods.map((method) => (
              <View key={method.id} style={styles.methodCard}>
                <View style={styles.methodIconContainer}>
                  <Ionicons
                    name={getPaymentMethodIcon(method) as any}
                    size={28}
                    color="#0d72b9"
                  />
                </View>

                <View style={styles.methodInfo}>
                  <View style={styles.methodHeader}>
                    <Text style={styles.methodLabel}>
                      {getPaymentMethodLabel(method)}
                    </Text>
                    {method.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    )}
                  </View>
                  {getPaymentMethodSubtext(method) && (
                    <Text style={styles.methodSubtext}>
                      {getPaymentMethodSubtext(method)}
                    </Text>
                  )}

                  <View style={styles.methodActions}>
                    {!method.isDefault && (
                      <Pressable
                        onPress={() => handleSetDefault(method.id)}
                        style={styles.actionButton}
                      >
                        <Text style={styles.actionButtonText}>Set as Default</Text>
                      </Pressable>
                    )}
                    <Pressable
                      onPress={() => handleDelete(method.id)}
                      style={styles.actionButton}
                    >
                      <Text style={[styles.actionButtonText, styles.deleteText]}>
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <Pressable
          style={styles.addButton}
          onPress={() => Alert.alert('Add Payment Method', 'Payment method addition flow would open here with Stripe/payment provider integration')}
        >
          <Ionicons name="add-circle-outline" size={24} color="#0d72b9" />
          <Text style={styles.addButtonText}>Add Payment Method</Text>
        </Pressable>

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#26b578" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Secure & Encrypted</Text>
            <Text style={styles.infoText}>
              Your payment information is encrypted and securely stored. We never store your full card number.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  methodsList: {
    padding: 16,
    gap: 12,
  },
  methodCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  methodIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e7f2fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  methodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: '#26b578',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  methodSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  methodActions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    paddingVertical: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0d72b9',
  },
  deleteText: {
    color: '#e53935',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0d72b9',
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0d72b9',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f0f9f5',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d0edd8',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#26b578',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});
