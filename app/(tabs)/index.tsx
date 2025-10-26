import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import { api } from '@/services/api';
import { storage } from '@/services/storage';
import type { Organization, Campaign } from '@/types/api';
import { useRouter } from 'expo-router';
import { calculateImpactStats } from '@/services/mockData';

export default function HomeScreen() {
  const user = useAppSelector(state => state.auth.user);
  const router = useRouter();
  const [savedOrgs, setSavedOrgs] = useState<Organization[]>([]);
  const [featuredCampaigns, setFeaturedCampaigns] = useState<Campaign[]>([]);
  const [quickDonateAmount, setQuickDonateAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [impactStats, setImpactStats] = useState({
    totalGiven: 0,
    donationCount: 0,
    livesSaved: 0,
    organizationsSupported: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [campaigns, savedOrgIds] = await Promise.all([
        api.getCampaigns().catch(() => []),
        storage.getSavedOrganizations(),
      ]);
      
      setFeaturedCampaigns(campaigns.slice(0, 3));
      
      if (savedOrgIds.length > 0) {
        const orgs = await Promise.all(
          savedOrgIds.slice(0, 3).map(id => api.getOrganization(id).catch(() => null))
        );
        setSavedOrgs(orgs.filter(Boolean) as Organization[]);
      }

      // Calculate real impact stats from mock donations
      const stats = calculateImpactStats();
      setImpactStats(stats);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Connection Issue', 'Unable to load campaigns. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const quickAmounts = [10, 25, 50, 100];

  const handleQuickDonate = (amount: number) => {
    setQuickDonateAmount(amount.toString());
    router.push({
      pathname: '/donate',
      params: { amount: amount.toString() },
    });
  };

  const handleCustomDonate = () => {
    const amount = parseFloat(quickDonateAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    router.push({
      pathname: '/donate',
      params: { amount: quickDonateAmount },
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{user?.firstName || 'Donor'}!</Text>
      </View>

      <View style={styles.impactDashboard}>
        <Text style={styles.impactTitle}>Your Impact</Text>
        <View style={styles.impactGrid}>
          <View style={styles.impactCard}>
            <Text style={styles.impactValue}>${impactStats.totalGiven.toLocaleString()}</Text>
            <Text style={styles.impactLabel}>Total Given</Text>
          </View>
          <View style={styles.impactCard}>
            <Text style={styles.impactValue}>{impactStats.donationCount}</Text>
            <Text style={styles.impactLabel}>Donations</Text>
          </View>
        </View>
        <View style={styles.impactGrid}>
          <View style={styles.impactCard}>
            <Text style={[styles.impactValue, styles.impactHighlight]}>
              {impactStats.livesSaved}
            </Text>
            <Text style={styles.impactLabel}>Lives Saved</Text>
          </View>
          <View style={styles.impactCard}>
            <Text style={styles.impactValue}>{impactStats.organizationsSupported}</Text>
            <Text style={styles.impactLabel}>Organizations</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Donate</Text>
        <View style={styles.quickAmountGrid}>
          {quickAmounts.map((amount) => (
            <TouchableOpacity
              key={amount}
              style={styles.quickAmountButton}
              onPress={() => handleQuickDonate(amount)}
            >
              <Text style={styles.quickAmountText}>${amount}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.customAmountContainer}>
          <TextInput
            style={styles.customAmountInput}
            placeholder="Custom amount"
            keyboardType="numeric"
            value={quickDonateAmount}
            onChangeText={setQuickDonateAmount}
          />
          <TouchableOpacity style={styles.donateButton} onPress={handleCustomDonate}>
            <Text style={styles.donateButtonText}>Give</Text>
          </TouchableOpacity>
        </View>
      </View>

      {savedOrgs.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Saved Organizations</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {savedOrgs.map((org) => (
            <TouchableOpacity
              key={org.id}
              style={styles.orgCard}
              onPress={() => router.push({ pathname: '/donate', params: { organizationId: org.id.toString(), organizationName: org.name } })}
            >
              <View style={styles.orgIcon}>
                <Text style={styles.orgIconText}>{org.name[0]}</Text>
              </View>
              <View style={styles.orgInfo}>
                <Text style={styles.orgName}>{org.name}</Text>
                <Text style={styles.orgLocation}>
                  {org.city}, {org.state}
                </Text>
              </View>
              <Text style={styles.orgArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {featuredCampaigns.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Campaigns</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/campaigns')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {featuredCampaigns.map((campaign) => {
            const goal = parseFloat(campaign.goal || '0');
            const raised = parseFloat(campaign.raised || '0');
            const progress = goal > 0 ? (raised / goal) * 100 : 0;

            return (
              <TouchableOpacity
                key={campaign.id}
                style={styles.campaignCard}
                onPress={() => router.push(`/campaign/${campaign.id}`)}
              >
                <Text style={styles.campaignName}>{campaign.name}</Text>
                
                {goal > 0 && (
                  <>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
                    </View>
                    <View style={styles.statsRow}>
                      <Text style={styles.raised}>${raised.toLocaleString()}</Text>
                      <Text style={styles.goal}>of ${goal.toLocaleString()}</Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.qrButton}
          onPress={() => router.push('/scan')}
        >
          <Text style={styles.qrButtonIcon}>📷</Text>
          <Text style={styles.qrButtonText}>Scan QR Code to Donate</Text>
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
    backgroundColor: '#0d72b9',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 32,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#0d72b9',
    fontWeight: '600',
  },
  quickAmountGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickAmountText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0d72b9',
  },
  customAmountContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  customAmountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
  },
  donateButton: {
    backgroundColor: '#0d72b9',
    paddingHorizontal: 32,
    borderRadius: 8,
    justifyContent: 'center',
  },
  donateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  orgIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e7f2fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orgIconText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0d72b9',
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  orgLocation: {
    fontSize: 14,
    color: '#666',
  },
  orgArrow: {
    fontSize: 24,
    color: '#ccc',
  },
  campaignCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  campaignName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
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
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  raised: {
    fontSize: 14,
    fontWeight: '600',
    color: '#26b578',
  },
  goal: {
    fontSize: 14,
    color: '#666',
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0d72b9',
    borderStyle: 'dashed',
  },
  qrButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  qrButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0d72b9',
  },
  impactDashboard: {
    backgroundColor: '#f9f9f9',
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  impactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  impactGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  impactCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  impactValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0d72b9',
    marginBottom: 4,
  },
  impactHighlight: {
    color: '#26b578',
  },
  impactLabel: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
});
