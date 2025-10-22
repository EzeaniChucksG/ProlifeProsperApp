import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function DonateScreen() {
  const { user } = useAuth();
  const router = useRouter();
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

  const [amount, setAmount] = useState(presetAmount || '');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('monthly');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple_pay' | 'google_pay'>('card');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const presetAmounts = [25, 50, 100, 250];

  const handleDonate = async () => {
    const donationAmount = parseFloat(amount);
    
    if (!donationAmount || donationAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!user?.email) {
      Alert.alert('Error', 'Please sign in to donate');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const targetOrgId = organizationId 
        ? parseInt(organizationId) 
        : (user.organizationId || 1);

      await api.createDonation({
        amount: donationAmount,
        currency: 'usd',
        donorEmail: user.email,
        donorFirstName: user.firstName || '',
        donorLastName: user.lastName || '',
        organizationId: targetOrgId,
        campaignId: campaignId ? parseInt(campaignId) : undefined,
        paymentMethod: paymentMethod,
        recurringFrequency: isRecurring ? frequency : undefined,
        isAnonymous: false,
      });

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
      console.error('Donation error:', error);
      Alert.alert('Error', error.message || 'Failed to process donation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
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
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Donation Type</Text>
        
        <TouchableOpacity
          style={[styles.typeButton, !isRecurring && styles.typeButtonActive]}
          onPress={() => setIsRecurring(false)}
        >
          <Text style={[styles.typeButtonText, !isRecurring && styles.typeButtonTextActive]}>
            One-Time Donation
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.typeButton, isRecurring && styles.typeButtonActive]}
          onPress={() => setIsRecurring(true)}
        >
          <Text style={[styles.typeButtonText, isRecurring && styles.typeButtonTextActive]}>
            Recurring Donation
          </Text>
        </TouchableOpacity>

        {isRecurring && (
          <View style={styles.frequencyContainer}>
            {['monthly', 'quarterly', 'annually'].map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[
                  styles.frequencyButton,
                  frequency === freq && styles.frequencyButtonActive,
                ]}
                onPress={() => setFrequency(freq)}
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
        <Text style={styles.sectionTitle}>Payment Method</Text>
        
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[
              styles.paymentMethodButton,
              styles.applePayButton,
              paymentMethod === 'apple_pay' && styles.paymentMethodActive,
            ]}
            onPress={() => setPaymentMethod('apple_pay')}
          >
            <Ionicons name="logo-apple" size={24} color="#000" />
            <Text style={styles.applePayText}>Pay</Text>
          </TouchableOpacity>
        )}

        {Platform.OS === 'android' && (
          <TouchableOpacity
            style={[
              styles.paymentMethodButton,
              styles.googlePayButton,
              paymentMethod === 'google_pay' && styles.paymentMethodActive,
            ]}
            onPress={() => setPaymentMethod('google_pay')}
          >
            <Ionicons name="logo-google" size={20} color="#fff" />
            <Text style={styles.googlePayText}>Google Pay</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.paymentMethodButton,
            styles.cardButton,
            paymentMethod === 'card' && styles.paymentMethodActive,
          ]}
          onPress={() => setPaymentMethod('card')}
        >
          <Ionicons name="card-outline" size={24} color="#0d72b9" />
          <Text style={styles.cardButtonText}>Credit or Debit Card</Text>
        </TouchableOpacity>

        <View style={styles.paymentNote}>
          <Ionicons name="lock-closed-outline" size={16} color="#26b578" />
          <Text style={styles.paymentNoteText}>
            Secure, encrypted payment processing
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
  backButtonText: {
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
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  paymentMethodActive: {
    borderColor: '#0d72b9',
    backgroundColor: '#e7f2fa',
  },
  applePayButton: {
    backgroundColor: '#fff',
    borderColor: '#000',
  },
  applePayText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginLeft: 8,
  },
  googlePayButton: {
    backgroundColor: '#4285F4',
    borderColor: '#4285F4',
  },
  googlePayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  cardButton: {
    backgroundColor: '#fff',
  },
  cardButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0d72b9',
    marginLeft: 12,
  },
  paymentNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  paymentNoteText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
});
