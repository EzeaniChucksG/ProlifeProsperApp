import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/services/api';

interface Donor {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  totalDonated: string;
  donationCount: number;
  firstDonationAt: Date;
  lastDonationAt: Date;
  isRecurring?: boolean;
  isVip?: boolean;
}

interface DonationHistory {
  id: number;
  amount: string;
  campaignName?: string;
  createdAt: Date;
  status: string;
  isRecurring: boolean;
}

type FilterType = 'all' | 'vip' | 'recurring' | 'recent' | 'lapsed';

export default function DonorManagementScreen() {
  const router = useRouter();
  const [donors, setDonors] = useState<Donor[]>([]);
  const [filteredDonors, setFilteredDonors] = useState<Donor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedDonor, setSelectedDonor] = useState<Donor | null>(null);
  const [donorHistory, setDonorHistory] = useState<DonationHistory[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadDonors();
  }, []);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [donors, searchQuery, filter]);

  const loadDonors = async () => {
    try {
      setLoading(true);
      // Assuming organization ID 1 for demo
      const response = await api.get<Donor[]>('/organizations/1/donors');
      setDonors(response);
    } catch (error) {
      console.error('Error loading donors:', error);
      // Use mock data as fallback
      setDonors(getMockDonors());
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSearch = () => {
    let result = [...donors];

    // Apply filter
    switch (filter) {
      case 'vip':
        result = result.filter((d) => parseFloat(d.totalDonated) > 1000);
        break;
      case 'recurring':
        result = result.filter((d) => d.isRecurring);
        break;
      case 'recent':
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        result = result.filter((d) => new Date(d.lastDonationAt) > thirtyDaysAgo);
        break;
      case 'lapsed':
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        result = result.filter((d) => new Date(d.lastDonationAt) < sixtyDaysAgo);
        break;
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.firstName.toLowerCase().includes(query) ||
          d.lastName.toLowerCase().includes(query) ||
          d.email.toLowerCase().includes(query)
      );
    }

    // Sort by total donated (highest first)
    result.sort((a, b) => parseFloat(b.totalDonated) - parseFloat(a.totalDonated));

    setFilteredDonors(result);
  };

  const handleViewDonor = async (donor: Donor) => {
    setSelectedDonor(donor);
    setShowDetailModal(true);

    // Load donor's donation history
    try {
      // In real app, this would fetch from /api/donors/:id/donations
      setDonorHistory(getMockDonationHistory(donor.id));
    } catch (error) {
      console.error('Error loading donor history:', error);
    }
  };

  const handleSendMessage = (donor: Donor) => {
    Alert.alert(
      'Send Message',
      `Send a message to ${donor.firstName} ${donor.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => {
            router.push('/admin/donor-chat');
          },
        },
      ]
    );
  };

  const getDonorSegment = (donor: Donor): string => {
    const total = parseFloat(donor.totalDonated);
    if (total > 5000) return '🌟 Diamond Donor';
    if (total > 2000) return '💎 Platinum Donor';
    if (total > 1000) return '🏆 Gold Donor';
    if (donor.isRecurring) return '❤️ Monthly Supporter';
    return '🎁 Supporter';
  };

  const getSegmentColor = (donor: Donor): string => {
    const total = parseFloat(donor.totalDonated);
    if (total > 5000) return '#9333ea';
    if (total > 2000) return '#0d72b9';
    if (total > 1000) return '#f59e0b';
    if (donor.isRecurring) return '#ef4444';
    return '#26b578';
  };

  const filterButtons = [
    { key: 'all' as FilterType, label: 'All', icon: 'people-outline' },
    { key: 'vip' as FilterType, label: 'VIP ($1000+)', icon: 'star-outline' },
    { key: 'recurring' as FilterType, label: 'Recurring', icon: 'repeat-outline' },
    { key: 'recent' as FilterType, label: 'Recent (30d)', icon: 'time-outline' },
    { key: 'lapsed' as FilterType, label: 'Lapsed (60d+)', icon: 'alert-circle-outline' },
  ];

  const stats = {
    total: donors.length,
    vip: donors.filter((d) => parseFloat(d.totalDonated) > 1000).length,
    recurring: donors.filter((d) => d.isRecurring).length,
    totalRaised: donors.reduce((sum, d) => sum + parseFloat(d.totalDonated), 0),
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0d72b9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Donors</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#0d72b9" />
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Donors</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="cash" size={24} color="#26b578" />
          <Text style={styles.statValue}>${stats.totalRaised.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Total Raised</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="star" size={24} color="#f59e0b" />
          <Text style={styles.statValue}>{stats.vip}</Text>
          <Text style={styles.statLabel}>VIP Donors</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="repeat" size={24} color="#ef4444" />
          <Text style={styles.statValue}>{stats.recurring}</Text>
          <Text style={styles.statLabel}>Recurring</Text>
        </View>
      </ScrollView>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search donors by name or email..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {filterButtons.map((btn) => (
          <TouchableOpacity
            key={btn.key}
            style={[styles.filterButton, filter === btn.key && styles.filterButtonActive]}
            onPress={() => setFilter(btn.key)}
          >
            <Ionicons
              name={btn.icon as any}
              size={16}
              color={filter === btn.key ? '#fff' : '#666'}
            />
            <Text style={[styles.filterText, filter === btn.key && styles.filterTextActive]}>
              {btn.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Donor List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0d72b9" />
          <Text style={styles.loadingText}>Loading donors...</Text>
        </View>
      ) : (
        <ScrollView style={styles.listContainer}>
          {filteredDonors.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No donors found</Text>
              <Text style={styles.emptyMessage}>
                {searchQuery ? 'Try adjusting your search' : 'No donors match this filter'}
              </Text>
            </View>
          ) : (
            filteredDonors.map((donor) => (
              <TouchableOpacity
                key={donor.id}
                style={styles.donorCard}
                onPress={() => handleViewDonor(donor)}
              >
                <View style={styles.donorHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {donor.firstName[0]}
                      {donor.lastName[0]}
                    </Text>
                  </View>
                  <View style={styles.donorInfo}>
                    <Text style={styles.donorName}>
                      {donor.firstName} {donor.lastName}
                    </Text>
                    <Text style={styles.donorEmail}>{donor.email}</Text>
                    <View
                      style={[styles.segmentBadge, { backgroundColor: getSegmentColor(donor) }]}
                    >
                      <Text style={styles.segmentText}>{getDonorSegment(donor)}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.donorStats}>
                  <View style={styles.donorStat}>
                    <Text style={styles.statAmount}>${parseFloat(donor.totalDonated).toFixed(2)}</Text>
                    <Text style={styles.statLabel}>Total Given</Text>
                  </View>
                  <View style={styles.donorStat}>
                    <Text style={styles.statAmount}>{donor.donationCount}</Text>
                    <Text style={styles.statLabel}>Donations</Text>
                  </View>
                </View>

                <View style={styles.donorFooter}>
                  <Text style={styles.lastDonation}>
                    Last: {new Date(donor.lastDonationAt).toLocaleDateString()}
                  </Text>
                  <TouchableOpacity
                    style={styles.messageButton}
                    onPress={() => handleSendMessage(donor)}
                  >
                    <Ionicons name="chatbubble-outline" size={16} color="#0d72b9" />
                    <Text style={styles.messageButtonText}>Message</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Donor Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        {selectedDonor && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Donor Profile</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.profileSection}>
                <View style={[styles.avatar, styles.avatarLarge]}>
                  <Text style={[styles.avatarText, styles.avatarTextLarge]}>
                    {selectedDonor.firstName[0]}
                    {selectedDonor.lastName[0]}
                  </Text>
                </View>
                <Text style={styles.profileName}>
                  {selectedDonor.firstName} {selectedDonor.lastName}
                </Text>
                <Text style={styles.profileEmail}>{selectedDonor.email}</Text>
                {selectedDonor.phone && (
                  <Text style={styles.profilePhone}>{selectedDonor.phone}</Text>
                )}
                <View
                  style={[
                    styles.segmentBadge,
                    styles.segmentBadgeLarge,
                    { backgroundColor: getSegmentColor(selectedDonor) },
                  ]}
                >
                  <Text style={styles.segmentText}>{getDonorSegment(selectedDonor)}</Text>
                </View>
              </View>

              <View style={styles.summarySection}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>
                    ${parseFloat(selectedDonor.totalDonated).toFixed(2)}
                  </Text>
                  <Text style={styles.summaryLabel}>Lifetime Giving</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{selectedDonor.donationCount}</Text>
                  <Text style={styles.summaryLabel}>Total Donations</Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Donation History</Text>
                {donorHistory.map((donation) => (
                  <View key={donation.id} style={styles.historyItem}>
                    <View style={styles.historyLeft}>
                      <Ionicons
                        name={donation.isRecurring ? 'repeat' : 'cash-outline'}
                        size={20}
                        color="#26b578"
                      />
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyAmount}>
                          ${parseFloat(donation.amount).toFixed(2)}
                        </Text>
                        <Text style={styles.historyCampaign}>
                          {donation.campaignName || 'General Fund'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.historyDate}>
                      {new Date(donation.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.actionSection}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    setShowDetailModal(false);
                    handleSendMessage(selectedDonor);
                  }}
                >
                  <Ionicons name="chatbubble" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Send Message</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonSecondary]}
                  onPress={() => Alert.alert('Receipt', 'Send tax receipt to donor')}
                >
                  <Ionicons name="document-text-outline" size={20} color="#0d72b9" />
                  <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
                    Send Receipt
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

// Mock data helper functions
function getMockDonors(): Donor[] {
  return [
    {
      id: 1,
      email: 'sarah.johnson@email.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      phone: '(555) 234-5678',
      totalDonated: '6500.00',
      donationCount: 28,
      firstDonationAt: new Date('2023-01-15'),
      lastDonationAt: new Date('2025-10-20'),
      isRecurring: true,
      isVip: true,
    },
    {
      id: 2,
      email: 'michael.chen@email.com',
      firstName: 'Michael',
      lastName: 'Chen',
      totalDonated: '3200.00',
      donationCount: 15,
      firstDonationAt: new Date('2023-06-10'),
      lastDonationAt: new Date('2025-10-18'),
      isRecurring: true,
    },
    {
      id: 3,
      email: 'emily.rodriguez@email.com',
      firstName: 'Emily',
      lastName: 'Rodriguez',
      totalDonated: '1250.00',
      donationCount: 8,
      firstDonationAt: new Date('2024-02-20'),
      lastDonationAt: new Date('2025-09-30'),
      isRecurring: false,
      isVip: true,
    },
  ];
}

function getMockDonationHistory(donorId: number): DonationHistory[] {
  return [
    {
      id: 1,
      amount: '100.00',
      campaignName: 'Baby Essentials Fund',
      createdAt: new Date('2025-10-20'),
      status: 'completed',
      isRecurring: true,
    },
    {
      id: 2,
      amount: '50.00',
      campaignName: 'Monthly Support',
      createdAt: new Date('2025-09-20'),
      status: 'completed',
      isRecurring: true,
    },
    {
      id: 3,
      amount: '250.00',
      createdAt: new Date('2025-08-15'),
      status: 'completed',
      isRecurring: false,
    },
  ];
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
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  statsContainer: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginRight: 10,
    minWidth: 110,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#eee',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#0d72b9',
    borderColor: '#0d72b9',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  donorCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  donorHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0d72b9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarTextLarge: {
    fontSize: 32,
  },
  donorInfo: {
    flex: 1,
  },
  donorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  donorEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  segmentBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  segmentBadgeLarge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  donorStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  donorStat: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#26b578',
  },
  donorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastDonation: {
    fontSize: 13,
    color: '#999',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e7f2fa',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  messageButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0d72b9',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalContent: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
  },
  profileEmail: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  profilePhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  summarySection: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#26b578',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyInfo: {
    gap: 2,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  historyCampaign: {
    fontSize: 13,
    color: '#666',
  },
  historyDate: {
    fontSize: 13,
    color: '#999',
  },
  actionSection: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d72b9',
    padding: 16,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#0d72b9',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtonTextSecondary: {
    color: '#0d72b9',
  },
});
