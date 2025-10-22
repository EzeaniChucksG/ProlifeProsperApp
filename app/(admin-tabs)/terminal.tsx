import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

export default function TerminalModeScreen() {
  const [amount, setAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleNumberInput = (num: string) => {
    if (num === 'C') {
      setAmount('');
    } else if (num === '←') {
      setAmount(amount.slice(0, -1));
    } else if (num === '.') {
      if (!amount.includes('.')) {
        setAmount(amount + '.');
      }
    } else {
      setAmount(amount + num);
    }
  };

  const handleProcessPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid donation amount.');
      return;
    }

    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      Alert.alert(
        'Payment Successful!',
        `$${parseFloat(amount).toFixed(2)} donation received`,
        [
          {
            text: 'Send Receipt',
            onPress: () => Alert.alert('Receipt Sent', 'Thank you email sent to donor'),
          },
          {
            text: 'New Transaction',
            style: 'default',
            onPress: () => {
              setAmount('');
              setDonorName('');
              setDonorEmail('');
            },
          },
        ]
      );
    }, 2000);
  };

  const numberButtons = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '←', '0', '.'];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Terminal Mode</Text>
        <Text style={styles.subtitle}>Accept donations at events</Text>
      </View>

      <View style={styles.display}>
        <Text style={styles.currency}>$</Text>
        <Text style={styles.amount}>{amount || '0.00'}</Text>
      </View>

      <View style={styles.numpadSection}>
        <View style={styles.numpad}>
          {numberButtons.map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.numButton,
                (num === '←' || num === '.') && styles.numButtonSpecial,
              ]}
              onPress={() => handleNumberInput(num)}
            >
              <Text style={styles.numButtonText}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.clearButton]}
          onPress={() => handleNumberInput('C')}
        >
          <Text style={styles.clearButtonText}>CLEAR</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.donorInfoSection}>
        <Text style={styles.sectionLabel}>Donor Information (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Donor Name"
          value={donorName}
          onChangeText={setDonorName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email for Receipt"
          value={donorEmail}
          onChangeText={setDonorEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity
        style={[styles.processButton, isProcessing && styles.processButtonDisabled]}
        onPress={handleProcessPayment}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <Text style={styles.processButtonText}>Processing...</Text>
        ) : (
          <>
            <Ionicons name="card" size={24} color="#fff" />
            <Text style={styles.processButtonText}>Process Payment</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.noticeBox}>
        <Ionicons name="information-circle-outline" size={20} color="#0d72b9" />
        <Text style={styles.noticeText}>
          Terminal mode allows you to accept donations in-person at events using your phone as a payment terminal.
        </Text>
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
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  display: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 32,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#0d72b9',
  },
  currency: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#0d72b9',
    marginRight: 8,
  },
  amount: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#333',
  },
  numpadSection: {
    padding: 16,
  },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  numButton: {
    width: '30%',
    aspectRatio: 1.5,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  numButtonSpecial: {
    backgroundColor: '#f5f5f5',
  },
  numButtonText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#333',
  },
  clearButton: {
    backgroundColor: '#E63946',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  donorInfoSection: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  processButton: {
    backgroundColor: '#26b578',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    margin: 16,
    borderRadius: 12,
  },
  processButtonDisabled: {
    opacity: 0.6,
  },
  processButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: '#e7f2fa',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    gap: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});
