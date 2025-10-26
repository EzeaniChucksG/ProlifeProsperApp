import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { mockDonations } from '@/services/mockData';

type SendMethod = 'email' | 'sms' | 'both';

interface DonationWithDonorInfo {
  id: number;
  amount: string;
  donorEmail?: string;
  donorFirstName?: string;
  donorLastName?: string;
  createdAt: Date;
}

export default function SendReceiptScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDonation, setSelectedDonation] = useState<number | null>(null);
  const [sendMethod, setSendMethod] = useState<SendMethod>('email');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const recentDonations = ([...mockDonations] as any[])
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20) as DonationWithDonorInfo[];

  const filteredDonations = recentDonations.filter((d) => {
    const searchLower = searchQuery.toLowerCase();
    const donorName = `${d.donorFirstName || ''} ${d.donorLastName || ''}`.toLowerCase();
    const amount = d.amount.toString();
    return donorName.includes(searchLower) || amount.includes(searchLower);
  });

  const selectedDonationData = recentDonations.find((d) => d.id === selectedDonation);

  const handleSend = async () => {
    if (!selectedDonation) {
      Alert.alert('Selection Required', 'Please select a donation to send a receipt for.');
      return;
    }

    if (sendMethod === 'email' || sendMethod === 'both') {
      if (!recipientEmail || !recipientEmail.includes('@')) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
      }
    }

    if (sendMethod === 'sms' || sendMethod === 'both') {
      if (!recipientPhone || recipientPhone.length < 10) {
        Alert.alert('Invalid Phone', 'Please enter a valid phone number.');
        return;
      }
    }

    setIsSending(true);

    setTimeout(() => {
      setIsSending(false);
      
      const methodText =
        sendMethod === 'both'
          ? 'email and SMS'
          : sendMethod === 'email'
          ? 'email'
          : 'SMS';

      Alert.alert(
        'Receipt Sent!',
        `Thank you receipt sent via ${methodText} to ${selectedDonationData?.donorFirstName || 'the donor'}.`,
        [
          {
            text: 'Send Another',
            onPress: handleReset,
          },
          {
            text: 'Done',
            onPress: () => router.back(),
          },
        ]
      );
    }, 1500);
  };

  const handleReset = () => {
    setSelectedDonation(null);
    setRecipientEmail('');
    setRecipientPhone('');
    setPersonalMessage('');
    setSearchQuery('');
  };

  const handleSelectDonation = (donationId: number) => {
    setSelectedDonation(donationId);
    const donation = recentDonations.find((d) => d.id === donationId);
    if (donation) {
      const email = donation.donorEmail || 'donor@example.com';
      setRecipientEmail(email);
      setRecipientPhone('555-123-4567');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#0d72b9" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send Thank You Receipt</Text>
          <View style={{ width: 24 }} />
        </View>

        {!selectedDonation ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Recent Donation</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by donor name or amount..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <View style={styles.donationsList}>
              {filteredDonations.map((donation) => (
                <TouchableOpacity
                  key={donation.id}
                  style={styles.donationCard}
                  onPress={() => handleSelectDonation(donation.id)}
                >
                  <View style={styles.donationHeader}>
                    <Text style={styles.donorName}>
                      {donation.donorFirstName || 'Anonymous'} {donation.donorLastName || ''}
                    </Text>
                    <Text style={styles.donationAmount}>${parseFloat(donation.amount).toLocaleString()}</Text>
                  </View>
                  <View style={styles.donationDetails}>
                    <Text style={styles.donationDate}>
                      {new Date(donation.createdAt).toLocaleDateString()}
                    </Text>
                    {donation.donorEmail && (
                      <Text style={styles.donationEmail}>{donation.donorEmail}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
              {filteredDonations.length === 0 && (
                <Text style={styles.emptyText}>No donations found</Text>
              )}
            </View>
          </View>
        ) : (
          <>
            <View style={styles.selectedDonationCard}>
              <View style={styles.selectedHeader}>
                <Text style={styles.selectedTitle}>Selected Donation</Text>
                <TouchableOpacity onPress={handleReset}>
                  <Text style={styles.changeLink}>Change</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedDonor}>
                  {selectedDonationData?.donorFirstName || 'Anonymous'}{' '}
                  {selectedDonationData?.donorLastName || ''}
                </Text>
                <Text style={styles.selectedAmount}>
                  ${selectedDonationData ? parseFloat(selectedDonationData.amount).toLocaleString() : '0'}
                </Text>
              </View>
              <Text style={styles.selectedDate}>
                {new Date(selectedDonationData?.createdAt || '').toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Send Method</Text>
              <View style={styles.methodSelector}>
                <TouchableOpacity
                  style={[styles.methodButton, sendMethod === 'email' && styles.methodButtonActive]}
                  onPress={() => setSendMethod('email')}
                >
                  <Ionicons
                    name="mail-outline"
                    size={24}
                    color={sendMethod === 'email' ? '#fff' : '#0d72b9'}
                  />
                  <Text
                    style={[
                      styles.methodButtonText,
                      sendMethod === 'email' && styles.methodButtonTextActive,
                    ]}
                  >
                    Email
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.methodButton, sendMethod === 'sms' && styles.methodButtonActive]}
                  onPress={() => setSendMethod('sms')}
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={24}
                    color={sendMethod === 'sms' ? '#fff' : '#0d72b9'}
                  />
                  <Text
                    style={[
                      styles.methodButtonText,
                      sendMethod === 'sms' && styles.methodButtonTextActive,
                    ]}
                  >
                    SMS
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.methodButton, sendMethod === 'both' && styles.methodButtonActive]}
                  onPress={() => setSendMethod('both')}
                >
                  <Ionicons
                    name="send-outline"
                    size={24}
                    color={sendMethod === 'both' ? '#fff' : '#0d72b9'}
                  />
                  <Text
                    style={[
                      styles.methodButtonText,
                      sendMethod === 'both' && styles.methodButtonTextActive,
                    ]}
                  >
                    Both
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {(sendMethod === 'email' || sendMethod === 'both') && (
              <View style={styles.section}>
                <Text style={styles.inputLabel}>Recipient Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="donor@example.com"
                  value={recipientEmail}
                  onChangeText={setRecipientEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            )}

            {(sendMethod === 'sms' || sendMethod === 'both') && (
              <View style={styles.section}>
                <Text style={styles.inputLabel}>Recipient Phone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="(555) 123-4567"
                  value={recipientPhone}
                  onChangeText={setRecipientPhone}
                  keyboardType="phone-pad"
                />
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.inputLabel}>Personal Message (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add a personal thank you message..."
                value={personalMessage}
                onChangeText={setPersonalMessage}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <Text style={styles.helpText}>
                This message will be included with the donation receipt
              </Text>
            </View>

            <View style={styles.previewSection}>
              <Text style={styles.previewTitle}>Receipt Preview</Text>
              <View style={styles.previewCard}>
                <Text style={styles.previewText}>
                  Dear {selectedDonationData?.donorFirstName || 'Friend'},
                </Text>
                <Text style={styles.previewText}>
                  Thank you for your generous donation of $
                  {selectedDonationData ? parseFloat(selectedDonationData.amount).toLocaleString() : '0'} to ProLifeProsper.
                </Text>
                {personalMessage && (
                  <Text style={[styles.previewText, styles.previewPersonal]}>
                    {personalMessage}
                  </Text>
                )}
                <Text style={styles.previewText}>
                  Your support makes a real difference in saving lives and supporting mothers in need.
                </Text>
                <Text style={styles.previewText}>With gratitude,</Text>
                <Text style={styles.previewText}>ProLifeProsper Team</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={isSending}
            >
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.sendButtonText}>
                {isSending ? 'Sending...' : 'Send Thank You Receipt'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
  },
  donationsList: {
    gap: 10,
  },
  donationCard: {
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  donationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  donorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  donationAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#26b578',
  },
  donationDetails: {
    gap: 4,
  },
  donationDate: {
    fontSize: 14,
    color: '#666',
  },
  donationEmail: {
    fontSize: 14,
    color: '#0d72b9',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
  selectedDonationCard: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 10,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#26b578',
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  changeLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0d72b9',
  },
  selectedInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedDonor: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  selectedAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#26b578',
  },
  selectedDate: {
    fontSize: 14,
    color: '#666',
  },
  methodSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  methodButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0d72b9',
    backgroundColor: '#fff',
  },
  methodButtonActive: {
    backgroundColor: '#0d72b9',
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0d72b9',
  },
  methodButtonTextActive: {
    color: '#fff',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  previewSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 10,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  previewCard: {
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 10,
    gap: 12,
  },
  previewText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  previewPersonal: {
    fontStyle: 'italic',
    color: '#0d72b9',
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#0d72b9',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#26b578',
    padding: 16,
    margin: 20,
    borderRadius: 10,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
