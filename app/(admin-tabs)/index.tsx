import { StyleSheet, View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { mockDonations, mockCampaigns } from '@/services/mockData';
import { useRouter } from 'expo-router';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    todayDonations: 0,
    todayAmount: 0,
    weekAmount: 0,
    monthAmount: 0,
    totalDonors: 0,
    activeCampaigns: 0,
  });

  const [recentDonations, setRecentDonations] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = () => {
    // Calculate stats from mock data
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todayDonations = mockDonations.filter(
      d => new Date(d.createdAt) >= today
    );
    const weekDonations = mockDonations.filter(
      d => new Date(d.createdAt) >= weekAgo
    );
    const monthDonations = mockDonations.filter(
      d => new Date(d.createdAt) >= monthAgo
    );

    setStats({
      todayDonations: todayDonations.length,
      todayAmount: todayDonations.reduce((sum, d) => sum + parseFloat(d.amount), 0),
      weekAmount: weekDonations.reduce((sum, d) => sum + parseFloat(d.amount), 0),
      monthAmount: monthDonations.reduce((sum, d) => sum + parseFloat(d.amount), 0),
      totalDonors: new Set(mockDonations.map(d => `${d.donorFirstName} ${d.donorLastName}`)).size,
      activeCampaigns: mockCampaigns.filter(c => c.isActive).length,
    });

    // Get 5 most recent donations
    setRecentDonations(
      [...mockDonations]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    loadDashboardData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back!</Text>
          <Text style={styles.orgName}>Life Choice Pregnancy Center</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={28} color="#333" />
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStatsSection}>
        <Text style={styles.sectionTitle}>Today</Text>
        <View style={styles.quickStatsGrid}>
          <View style={[styles.quickStatCard, styles.primaryCard]}>
            <Ionicons name="cash-outline" size={32} color="#fff" />
            <Text style={styles.quickStatValue}>${stats.todayAmount.toFixed(2)}</Text>
            <Text style={styles.quickStatLabel}>Donations Received</Text>
          </View>
          <View style={styles.quickStatCard}>
            <Ionicons name="people-outline" size={28} color="#0d72b9" />
            <Text style={[styles.quickStatValue, styles.quickStatValueDark]}>
              {stats.todayDonations}
            </Text>
            <Text style={[styles.quickStatLabel, styles.quickStatLabelDark]}>
              Donors
            </Text>
          </View>
        </View>
      </View>

      {/* Period Stats */}
      <View style={styles.periodStatsSection}>
        <View style={styles.periodStatCard}>
          <Text style={styles.periodStatLabel}>This Week</Text>
          <Text style={styles.periodStatValue}>${stats.weekAmount.toFixed(2)}</Text>
        </View>
        <View style={styles.periodStatCard}>
          <Text style={styles.periodStatLabel}>This Month</Text>
          <Text style={styles.periodStatValue}>${stats.monthAmount.toFixed(2)}</Text>
        </View>
      </View>

      {/* Key Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Ionicons name="heart-outline" size={24} color="#26b578" />
            <Text style={styles.metricValue}>{stats.totalDonors}</Text>
            <Text style={styles.metricLabel}>Total Donors</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="megaphone-outline" size={24} color="#0d72b9" />
            <Text style={styles.metricValue}>{stats.activeCampaigns}</Text>
            <Text style={styles.metricLabel}>Active Campaigns</Text>
          </View>
        </View>
      </View>

      {/* Recent Donations */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Donations</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllLink}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {recentDonations.map((donation) => (
          <View key={donation.id} style={styles.donationCard}>
            <View style={styles.donationIcon}>
              <Ionicons name="cash" size={24} color="#26b578" />
            </View>
            <View style={styles.donationInfo}>
              <Text style={styles.donationName}>
                {donation.donorFirstName} {donation.donorLastName}
              </Text>
              <Text style={styles.donationDate}>
                {new Date(donation.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.donationAmount}>${donation.amount}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(admin-tabs)/terminal')}
          >
            <Ionicons name="card-outline" size={32} color="#0d72b9" />
            <Text style={styles.actionText}>Terminal Mode</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/admin/qr-generator')}
          >
            <Ionicons name="qr-code-outline" size={32} color="#0d72b9" />
            <Text style={styles.actionText}>Generate QR</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/admin/send-receipt')}
          >
            <Ionicons name="mail-outline" size={32} color="#0d72b9" />
            <Text style={styles.actionText}>Send Receipt</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/admin/donor-chat')}
          >
            <Ionicons name="chatbubbles-outline" size={32} color="#0d72b9" />
            <Text style={styles.actionText}>Donor Chat</Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  orgName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#E63946',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  quickStatsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  primaryCard: {
    backgroundColor: '#0d72b9',
    borderColor: '#0d72b9',
  },
  quickStatValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
    marginBottom: 4,
  },
  quickStatValueDark: {
    color: '#0d72b9',
  },
  quickStatLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  quickStatLabelDark: {
    color: '#666',
  },
  periodStatsSection: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  periodStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  periodStatLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  periodStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#26b578',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllLink: {
    color: '#0d72b9',
    fontSize: 15,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  donationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  donationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E7F6F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  donationInfo: {
    flex: 1,
  },
  donationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  donationDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  donationAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#26b578',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
});
