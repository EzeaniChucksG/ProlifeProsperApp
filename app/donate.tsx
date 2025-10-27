import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useState, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppSelector } from '@/store/hooks';
import { Ionicons } from '@expo/vector-icons';
import { useGettrxConfig } from '@/hooks/useGettrxConfig';
import { GettrxPaymentForm, GettrxPaymentFormRef } from '@/components/GettrxPaymentForm';
import { Config } from '@/constants/Config';

export default function DonateScreen() {
  const user = useAppSelector(state => state.auth.user);
  const router = useRouter();
  const paymentFormRef = useRef<GettrxPaymentFormRef>(null);
  
  const { 
    campaignId, 
    campaignName, 
    organizationId,
    organizationName,
    amount: presetAmount 
  } = useLocalSearchParams<{
    campaignId?: string;
    campaignName?: string;
    organizationId?: string;
    organizationName?: string;
    amount?: string;
  }>();

  const targetOrgId = organizationId ? parseInt(organizationId) : 1;
  
  const { config, loading: configLoading, error: configError } = useGettrxConfig(targetOrgId);

  const [amount, setAmount] = useState(presetAmount || '');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly' | 'annually'>('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentToken, setPaymentToken] = useState<string | null>(null);

  const presetAmounts = [25, 50, 100, 250];

  const handleTokenReceived = (token: string) => {
    console.log('Payment token received from GETTRX');
    setPaymentToken(token);
    processPayment(token);
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment form error:', error);
    Alert.alert('Payment Error', error);
    setIsSubmitting(false);
  };

  const processPayment = async (token: string) => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to donate');
      return;
    }

    try {
      setIsSubmitting(true);

      const donationAmount = parseFloat(amount);
      
      const response = await fetch(`${Config.API_BASE_URL}/gettrx/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentToken: token,
          amount: donationAmount,
          organizationId: targetOrgId,
          campaignId: campaignId ? parseInt(campaignId) : undefined,
          donorInfo: {
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
          },
          anonymous: false,
          savePaymentMethod: isRecurring,
          setupFutureUsage: isRecurring ? 'off_session' : undefined,
          donationType: isRecurring ? 'recurring' : 'one-time',
          recurringInterval: isRecurring ? frequency : undefined,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Payment failed');
      }

      console.log('Payment successful:', result);

      Alert.alert(
        'Success!',
        `Thank you for your ${isRecurring ? 'recurring ' : ''}donation of $${donationAmount.toFixed(2)}!`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Payment processing error:', error);
      Alert.alert('Payment Failed', error.message || 'Failed to process donation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDonate = () => {
    const donationAmount = parseFloat(amount);
    
    if (!donationAmount || donationAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!user?.email) {
      Alert.alert('Error', 'Please sign in to donate');
      return;
    }

    if (!config) {
      Alert.alert('Error', 'Payment system not ready. Please try again.');
      return;
    }

    setIsSubmitting(true);
    
    if (paymentFormRef.current) {
      paymentFormRef.current.createToken();
    } else {
      Alert.alert('Error', 'Payment form not ready');
      setIsSubmitting(false);
    }
  };

  if (configLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0d72b9" />
        <Text style={styles.loadingText}>Loading payment system...</Text>
      </View>
    );
  }

  if (configError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#dc3545" />
        <Text style={styles.errorTitle}>Payment System Error</Text>
        <Text style={styles.errorMessage}>{configError}</Text>
        <TouchableOpacity style={styles.backButton2} onPress={() => router.back()}>
          <Text style={styles.backButtonText2}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonTextHeader}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Make a Donation</Text>
      </View>

      {(campaignName || organizationName) && (
        <View style={styles.campaignBanner}>
          <Text style={styles.campaignLabel}>
            {campaignName ? 'Supporting Campaign:' : 'Supporting Organization:'}
          </Text>
          <Text style={styles.campaignName}>{campaignName || organizationName}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Donation Amount</Text>
        
        <View style={styles.presetGrid}>
          {presetAmounts.map((preset) => (
            <TouchableOpacity
              key={preset}
              style={[
                styles.presetButton,
                amount === preset.toString() && styles.presetButtonActive,
              ]}
              onPress={() => setAmount(preset.toString())}
              disabled={isSubmitting}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  amount === preset.toString() && styles.presetButtonTextActive,
                ]}
              >
                ${preset}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.customInput}
          placeholder="Custom amount"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          editable={!isSubmitting}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Donation Type</Text>
        
        <TouchableOpacity
          style={[styles.typeButton, !isRecurring && styles.typeButtonActive]}
          onPress={() => setIsRecurring(false)}
          disabled={isSubmitting}
        >
          <Text style={[styles.typeButtonText, !isRecurring && styles.typeButtonTextActive]}>
            One-Time Donation
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typeButton, isRecurring && styles.typeButtonActive]}
          onPress={() => setIsRecurring(true)}
          disabled={isSubmitting}
        >
          <Text style={[styles.typeButtonText, isRecurring && styles.typeButtonTextActive]}>
            Recurring Donation
          </Text>
        </TouchableOpacity>

        {isRecurring && (
          <View style={styles.frequencyContainer}>
            {(['monthly', 'quarterly', 'annually'] as const).map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[
                  styles.frequencyButton,
                  frequency === freq && styles.frequencyButtonActive,
                ]}
                onPress={() => setFrequency(freq)}
                disabled={isSubmitting}
              >
                <Text
                  style={[
                    styles.frequencyButtonText,
                    frequency === freq && styles.frequencyButtonTextActive,
                  ]}
                >
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Information</Text>
        <Text style={styles.sectionSubtitle}>Enter your card details securely</Text>
        
        {config && (
          <GettrxPaymentForm
            ref={paymentFormRef}
            publishableKey={config.publishableKey}
            accountId={config.accountId}
            amount={parseFloat(amount) || 0}
            onToken={handleTokenReceived}
            onError={handlePaymentError}
            donationType={isRecurring ? 'recurring' : 'one-time'}
          />
        )}

        <View style={styles.securityNote}>
          <Ionicons name="lock-closed-outline" size={16} color="#26b578" />
          <Text style={styles.securityNoteText}>
            Secure, encrypted payment processing via GETTRX
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleDonate}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              Complete Donation ${parseFloat(amount || '0').toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  backButton2: {
    marginTop: 24,
    backgroundColor: '#0d72b9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText2: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonTextHeader: {
    fontSize: 28,
    color: '#0d72b9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  campaignBanner: {
    backgroundColor: '#e7f2fa',
    padding: 16,
  },
  campaignLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  campaignName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0d72b9',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    marginTop: -8,
  },
  presetGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  presetButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetButtonActive: {
    backgroundColor: '#e7f2fa',
    borderColor: '#0d72b9',
  },
  presetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  presetButtonTextActive: {
    color: '#0d72b9',
  },
  customInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    backgroundColor: '#fff',
  },
  typeButton: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeButtonActive: {
    backgroundColor: '#e7f2fa',
    borderColor: '#0d72b9',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  typeButtonTextActive: {
    color: '#0d72b9',
  },
  frequencyContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  frequencyButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  frequencyButtonActive: {
    backgroundColor: '#0d72b9',
    borderColor: '#0d72b9',
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  frequencyButtonTextActive: {
    color: '#fff',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  securityNoteText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  footer: {
    padding: 20,
    marginTop: 16,
  },
  submitButton: {
    backgroundColor: '#0d72b9',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
