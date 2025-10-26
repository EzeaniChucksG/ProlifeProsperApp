import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Share,
} from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { mockCampaigns, mockOrganizations } from '@/services/mockData';

type QRType = 'campaign' | 'organization';

export default function QRGeneratorScreen() {
  const router = useRouter();
  const [qrType, setQRType] = useState<QRType>('campaign');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [generatedQR, setGeneratedQR] = useState<string>('');

  const campaigns = mockCampaigns;
  const organizations = mockOrganizations;

  const filteredCampaigns = campaigns.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrganizations = organizations.filter((o) =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGenerate = () => {
    if (!selectedId) {
      Alert.alert('Selection Required', 'Please select a campaign or organization first.');
      return;
    }

    const qrValue = `prolifeprosper://${qrType}/${selectedId}`;
    setGeneratedQR(qrValue);
    Alert.alert('Success', 'QR Code generated successfully!');
  };

  const handleShare = async () => {
    if (!generatedQR) {
      Alert.alert('No QR Code', 'Please generate a QR code first.');
      return;
    }

    try {
      const selectedItem =
        qrType === 'campaign'
          ? campaigns.find((c) => c.id === selectedId)
          : organizations.find((o) => o.id === selectedId);

      await Share.share({
        message: `Scan this QR code to donate to ${selectedItem?.name}!\n\n${generatedQR}`,
        title: 'Donation QR Code',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleReset = () => {
    setGeneratedQR('');
    setSelectedId(null);
    setSearchQuery('');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0d72b9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Code Generator</Text>
        <View style={{ width: 24 }} />
      </View>

      {!generatedQR ? (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Type</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, qrType === 'campaign' && styles.typeButtonActive]}
                onPress={() => {
                  setQRType('campaign');
                  setSelectedId(null);
                }}
              >
                <Ionicons
                  name="megaphone-outline"
                  size={24}
                  color={qrType === 'campaign' ? '#fff' : '#0d72b9'}
                />
                <Text
                  style={[styles.typeButtonText, qrType === 'campaign' && styles.typeButtonTextActive]}
                >
                  Campaign
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeButton, qrType === 'organization' && styles.typeButtonActive]}
                onPress={() => {
                  setQRType('organization');
                  setSelectedId(null);
                }}
              >
                <Ionicons
                  name="business-outline"
                  size={24}
                  color={qrType === 'organization' ? '#fff' : '#0d72b9'}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    qrType === 'organization' && styles.typeButtonTextActive,
                  ]}
                >
                  Organization
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Select {qrType === 'campaign' ? 'Campaign' : 'Organization'}
            </Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <View style={styles.itemsList}>
              {qrType === 'campaign'
                ? filteredCampaigns.map((campaign) => (
                    <TouchableOpacity
                      key={campaign.id}
                      style={[
                        styles.itemCard,
                        selectedId === campaign.id && styles.itemCardSelected,
                      ]}
                      onPress={() => setSelectedId(campaign.id)}
                    >
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{campaign.name}</Text>
                        <Text style={styles.itemDetail}>
                          Goal: ${campaign.goal?.toLocaleString() || '0'}
                        </Text>
                      </View>
                      {selectedId === campaign.id && (
                        <Ionicons name="checkmark-circle" size={24} color="#26b578" />
                      )}
                    </TouchableOpacity>
                  ))
                : filteredOrganizations.map((org) => (
                    <TouchableOpacity
                      key={org.id}
                      style={[styles.itemCard, selectedId === org.id && styles.itemCardSelected]}
                      onPress={() => setSelectedId(org.id)}
                    >
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{org.name}</Text>
                        <Text style={styles.itemDetail}>Organization</Text>
                      </View>
                      {selectedId === org.id && (
                        <Ionicons name="checkmark-circle" size={24} color="#26b578" />
                      )}
                    </TouchableOpacity>
                  ))}
            </View>
          </View>

          <TouchableOpacity style={styles.generateButton} onPress={handleGenerate}>
            <Ionicons name="qr-code-outline" size={24} color="#fff" />
            <Text style={styles.generateButtonText}>Generate QR Code</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.qrContainer}>
            <Text style={styles.qrTitle}>QR Code Generated!</Text>
            <Text style={styles.qrSubtitle}>
              Scan this code to donate to{' '}
              {qrType === 'campaign'
                ? campaigns.find((c) => c.id === selectedId)?.name
                : organizations.find((o) => o.id === selectedId)?.name}
            </Text>

            <View style={styles.qrCodeWrapper}>
              <QRCode value={generatedQR} size={250} backgroundColor="#fff" color="#0d72b9" />
            </View>

            <View style={styles.qrInfo}>
              <Ionicons name="information-circle-outline" size={20} color="#666" />
              <Text style={styles.qrInfoText}>
                Donors can scan this with their phone camera or the ProLifeProsper app
              </Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color="#0d72b9" />
              <Text style={styles.secondaryButtonText}>Share QR Code</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleReset}>
              <Ionicons name="refresh-outline" size={20} color="#0d72b9" />
              <Text style={styles.secondaryButtonText}>Generate New</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.usageSection}>
            <Text style={styles.usageSectionTitle}>How to Use</Text>
            <View style={styles.usageItem}>
              <Ionicons name="print-outline" size={24} color="#0d72b9" />
              <Text style={styles.usageText}>Print and display at events or booths</Text>
            </View>
            <View style={styles.usageItem}>
              <Ionicons name="mail-outline" size={24} color="#0d72b9" />
              <Text style={styles.usageText}>Include in email campaigns or newsletters</Text>
            </View>
            <View style={styles.usageItem}>
              <Ionicons name="share-social-outline" size={24} color="#0d72b9" />
              <Text style={styles.usageText}>Share on social media or websites</Text>
            </View>
          </View>
        </>
      )}
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
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0d72b9',
    backgroundColor: '#fff',
  },
  typeButtonActive: {
    backgroundColor: '#0d72b9',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0d72b9',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
  },
  itemsList: {
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemCardSelected: {
    borderColor: '#26b578',
    backgroundColor: '#f0fdf4',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 14,
    color: '#666',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0d72b9',
    padding: 16,
    margin: 20,
    borderRadius: 10,
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  qrContainer: {
    backgroundColor: '#fff',
    padding: 30,
    margin: 10,
    borderRadius: 15,
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  qrSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  qrCodeWrapper: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  qrInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  qrInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    padding: 20,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0d72b9',
    backgroundColor: '#fff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0d72b9',
  },
  usageSection: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 10,
    marginTop: 0,
    borderRadius: 15,
  },
  usageSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
  },
  usageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  usageText: {
    flex: 1,
    fontSize: 15,
    color: '#666',
  },
});
