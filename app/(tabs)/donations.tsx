import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import type { Donation } from '@/types/api';
import { useAppSelector } from '@/store/hooks';

export default function DonationsScreen() {
  const user = useAppSelector(state => state.auth.user);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'one_time' | 'recurring'>('all');

  useEffect(() => {
    loadDonations();
  }, []);

  const loadDonations = async () => {
    try {
      setIsLoading(true);
      const data = await api.getDonations();
      setDonations(data);
    } catch (error) {
      console.error('Error loading donations:', error);
      Alert.alert('Connection Issue', 'Unable to load donation history. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDonations = donations.filter(donation => {
    if (filter === 'one_time') return !donation.isRecurring;
    if (filter === 'recurring') return donation.isRecurring;
    return true;
  });

  const totalGiven = donations.reduce((sum, d) => sum + parseFloat(d.amount), 0);
  const donationCount = donations.length;

  const renderDonationCard = ({ item }: { item: Donation }) => {
    const amount = parseFloat(item.amount);
    const date = new Date(item.donatedAt).toLocaleDateString();

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.amount}>${amount.toFixed(2)}</Text>
            <Text style={styles.date}>{date}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        {item.campaignId && (
          <Text style={styles.campaign}>Campaign #{item.campaignId}</Text>
        )}

        <View style={styles.details}>
          <Text style={styles.detailText}>
            {item.isRecurring ? `🔄 ${item.recurringFrequency}` : '💳 One-time'}
          </Text>
          <Text style={styles.detailText}>
            {item.paymentMethod}
          </Text>
        </View>

        {item.receiptUrl && (
          <TouchableOpacity style={styles.receiptButton}>
            <Text style={styles.receiptButtonText}>View Receipt</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Giving</Text>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>${totalGiven.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total Given</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{donationCount}</Text>
            <Text style={styles.statLabel}>Donations</Text>
          </View>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'one_time' && styles.filterButtonActive]}
          onPress={() => setFilter('one_time')}
        >
          <Text style={[styles.filterText, filter === 'one_time' && styles.filterTextActive]}>One-Time</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'recurring' && styles.filterButtonActive]}
          onPress={() => setFilter('recurring')}
        >
          <Text style={[styles.filterText, filter === 'recurring' && styles.filterTextActive]}>Recurring</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0d72b9" />
        </View>
      ) : (
        <FlatList
          data={filteredDonations}
          renderItem={renderDonationCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No donations yet</Text>
              <Text style={styles.emptySubtext}>Start making a difference today!</Text>
            </View>
          }
        />
      )}
    </View>
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
    backgroundColor: '#0d72b9',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  stats: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 16,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#fff',
  },
  filterButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#0d72b9',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#26b578',
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: '#e7f5ec',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    color: '#26b578',
    fontWeight: '600',
  },
  campaign: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  details: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
  },
  receiptButton: {
    borderWidth: 1,
    borderColor: '#0d72b9',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  receiptButtonText: {
    color: '#0d72b9',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
});
