import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { mockDonations, mockCampaigns } from '@/services/mockData';

export default function AnalyticsScreen() {
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month');

  // Calculate analytics from mock data
  const totalDonations = mockDonations.length;
  const totalAmount = mockDonations.reduce((sum, d) => sum + parseFloat(d.amount), 0);
  const averageDonation = totalAmount / totalDonations;
  const recurringDonors = mockDonations.filter(d => d.isRecurring).length;

  const topCampaign = mockCampaigns.reduce((top, campaign) => {
    const raised = parseFloat(campaign.raised || '0');
    const topRaised = parseFloat(top.raised || '0');
    return raised > topRaised ? campaign : top;
  }, mockCampaigns[0]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
      </View>

      <View style={styles.timeframeSelector}>
        <TouchableOpacity
          style={[styles.timeframeButton, timeframe === 'week' && styles.timeframeButtonActive]}
          onPress={() => setTimeframe('week')}
        >
          <Text style={[styles.timeframeText, timeframe === 'week' && styles.timeframeTextActive]}>
            Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeframeButton, timeframe === 'month' && styles.timeframeButtonActive]}
          onPress={() => setTimeframe('month')}
        >
          <Text style={[styles.timeframeText, timeframe === 'month' && styles.timeframeTextActive]}>
            Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeframeButton, timeframe === 'year' && styles.timeframeButtonActive]}
          onPress={() => setTimeframe('year')}
        >
          <Text style={[styles.timeframeText, timeframe === 'year' && styles.timeframeTextActive]}>
            Year
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="cash-outline" size={32} color="#26b578" />
            <Text style={styles.statValue}>${totalAmount.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total Raised</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="people-outline" size={32} color="#0d72b9" />
            <Text style={styles.statValue}>{totalDonations}</Text>
            <Text style={styles.statLabel}>Total Donors</Text>
          </View>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="trending-up-outline" size={32} color="#E07856" />
            <Text style={styles.statValue}>${averageDonation.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Avg Donation</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="repeat-outline" size={32} color="#9B59B6" />
            <Text style={styles.statValue}>{recurringDonors}</Text>
            <Text style={styles.statLabel}>Recurring</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Campaign</Text>
        <View style={styles.campaignCard}>
          <View style={styles.campaignHeader}>
            <Text style={styles.campaignName}>{topCampaign.name}</Text>
            <View style={styles.campaignBadge}>
              <Ionicons name="trophy" size={16} color="#FFD700" />
            </View>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(
                    (parseFloat(topCampaign.raised || '0') / parseFloat(topCampaign.goal || '1')) * 100,
                    100
                  )}%`,
                },
              ]}
            />
          </View>
          <View style={styles.campaignStats}>
            <Text style={styles.campaignRaised}>
              ${parseFloat(topCampaign.raised || '0').toLocaleString()} raised
            </Text>
            <Text style={styles.campaignGoal}>
              of ${parseFloat(topCampaign.goal || '0').toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Donation Methods</Text>
        <View style={styles.methodsList}>
          {[
            { method: 'Credit Card', count: 5, icon: 'card-outline' },
            { method: 'Apple Pay', count: 2, icon: 'logo-apple' },
            { method: 'Google Pay', count: 1, icon: 'logo-google' },
          ].map((item) => (
            <View key={item.method} style={styles.methodRow}>
              <View style={styles.methodInfo}>
                <Ionicons name={item.icon as any} size={24} color="#0d72b9" />
                <Text style={styles.methodName}>{item.method}</Text>
              </View>
              <Text style={styles.methodCount}>{item.count} donations</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Donor Insights</Text>
        <View style={styles.insightCard}>
          <Ionicons name="star" size={24} color="#FFD700" />
          <View style={styles.insightText}>
            <Text style={styles.insightTitle}>Top Donor</Text>
            <Text style={styles.insightDescription}>John Doe - $500 total</Text>
          </View>
        </View>
        <View style={styles.insightCard}>
          <Ionicons name="time-outline" size={24} color="#0d72b9" />
          <View style={styles.insightText}>
            <Text style={styles.insightTitle}>Peak Giving Time</Text>
            <Text style={styles.insightDescription}>Sundays at 10am - 12pm</Text>
          </View>
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
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  timeframeSelector: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 1,
    marginBottom: 16,
  },
  timeframeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  timeframeButtonActive: {
    backgroundColor: '#0d72b9',
  },
  timeframeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  timeframeTextActive: {
    color: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  campaignCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  campaignName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  campaignBadge: {
    backgroundColor: '#FFF9E6',
    padding: 8,
    borderRadius: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#26b578',
  },
  campaignStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  campaignRaised: {
    fontSize: 14,
    fontWeight: '600',
    color: '#26b578',
  },
  campaignGoal: {
    fontSize: 14,
    color: '#666',
  },
  methodsList: {
    gap: 12,
  },
  methodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  methodCount: {
    fontSize: 14,
    color: '#666',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  insightText: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  insightDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});
