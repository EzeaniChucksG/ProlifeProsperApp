import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '@/services/api';
import type { Campaign } from '@/types/api';

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCampaign();
  }, [id]);

  const loadCampaign = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getCampaign(parseInt(id));
      setCampaign(data);
    } catch (err: any) {
      console.error('Error loading campaign:', err);
      setError(err.message || 'Failed to load campaign');
      Alert.alert('Error', 'Failed to load campaign. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDonate = () => {
    if (!campaign) return;
    router.push({
      pathname: '/donate',
      params: { campaignId: campaign.id, campaignName: campaign.name },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0d72b9" />
      </View>
    );
  }

  if (error || !campaign) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Unable to load campaign</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCampaign}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const goal = parseFloat(campaign.goal || '0');
  const raised = parseFloat(campaign.raised || '0');
  const progress = goal > 0 ? (raised / goal) * 100 : 0;

  return (
    <View style={styles.container}>
      <ScrollView>
        {campaign.mainImageUrl && (
          <View style={styles.heroImage}>
            <Text style={styles.imagePlaceholder}>📷</Text>
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.title}>{campaign.name}</Text>
          
          {campaign.description && (
            <Text style={styles.description}>{campaign.description}</Text>
          )}

          {goal > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.statsRow}>
                <View>
                  <Text style={styles.raisedAmount}>${raised.toLocaleString()}</Text>
                  <Text style={styles.raisedLabel}>raised</Text>
                </View>
                <View style={styles.goalContainer}>
                  <Text style={styles.goalAmount}>${goal.toLocaleString()}</Text>
                  <Text style={styles.goalLabel}>goal</Text>
                </View>
              </View>

              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
              </View>
              
              <Text style={styles.progressText}>{progress.toFixed(0)}% funded</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.donateButton} onPress={handleDonate}>
          <Text style={styles.donateButtonText}>Donate Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#0d72b9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  heroImage: {
    height: 240,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    fontSize: 64,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    marginBottom: 24,
  },
  progressSection: {
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  raisedAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#26b578',
  },
  raisedLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  goalContainer: {
    alignItems: 'flex-end',
  },
  goalAmount: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  goalLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#26b578',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  donateButton: {
    backgroundColor: '#0d72b9',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  donateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
