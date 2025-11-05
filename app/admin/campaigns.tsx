import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/services/api';

interface Campaign {
  id: number;
  name: string;
  slug: string;
  description?: string;
  goal: string;
  raised?: string;
  status?: string;
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
  donationPageId: number;
}

type ViewMode = 'list' | 'create' | 'edit';

export default function CampaignManagementScreen() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    goal: '',
    donationPageId: 1, // Default donation page
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    // Filter campaigns based on search query
    if (searchQuery.trim() === '') {
      setFilteredCampaigns(campaigns);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredCampaigns(
        campaigns.filter(
          (c) =>
            c.name.toLowerCase().includes(query) ||
            c.description?.toLowerCase().includes(query) ||
            c.slug.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, campaigns]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      // Assuming organization ID 1 for demo - should come from auth context
      const response = await api.get('/organizations/1/campaigns');
      setCampaigns(response);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      Alert.alert('Error', 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      goal: '',
      donationPageId: 1,
    });
    setSelectedCampaign(null);
    setViewMode('create');
  };

  const handleEdit = (campaign: Campaign) => {
    setFormData({
      name: campaign.name,
      slug: campaign.slug,
      description: campaign.description || '',
      goal: campaign.goal,
      donationPageId: campaign.donationPageId,
    });
    setSelectedCampaign(campaign);
    setViewMode('edit');
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug || !formData.goal) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);

      if (viewMode === 'create') {
        // Create new campaign
        await api.post('/organizations/1/campaigns', {
          ...formData,
          organizationId: 1,
        });
        Alert.alert('Success', 'Campaign created successfully!');
      } else if (viewMode === 'edit' && selectedCampaign) {
        // Update existing campaign
        await api.put(`/campaigns/${selectedCampaign.id}`, formData);
        Alert.alert('Success', 'Campaign updated successfully!');
      }

      setViewMode('list');
      loadCampaigns();
    } catch (error) {
      console.error('Error saving campaign:', error);
      Alert.alert('Error', 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (campaign: Campaign) => {
    Alert.alert(
      'Delete Campaign',
      `Are you sure you want to delete "${campaign.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Check if campaign can be deleted
              const validation = await api.get(`/campaigns/${campaign.id}/deletion-validation`);
              
              if (!validation.canDelete) {
                Alert.alert(
                  'Cannot Delete',
                  `This campaign has ${validation.donationCount} donations and cannot be deleted. You can archive it instead.`
                );
                return;
              }

              await api.delete(`/campaigns/${campaign.id}`);
              Alert.alert('Success', 'Campaign deleted successfully');
              loadCampaigns();
            } catch (error) {
              console.error('Error deleting campaign:', error);
              Alert.alert('Error', 'Failed to delete campaign');
            }
          },
        },
      ]
    );
  };

  const handleArchive = async (campaign: Campaign) => {
    Alert.alert(
      'Archive Campaign',
      `Are you sure you want to archive "${campaign.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            try {
              await api.patch(`/campaigns/${campaign.id}/archive`);
              Alert.alert('Success', 'Campaign archived successfully');
              loadCampaigns();
            } catch (error) {
              console.error('Error archiving campaign:', error);
              Alert.alert('Error', 'Failed to archive campaign');
            }
          },
        },
      ]
    );
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setViewMode('list')}>
              <Ionicons name="arrow-back" size={24} color="#0d72b9" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {viewMode === 'create' ? 'Create Campaign' : 'Edit Campaign'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Campaign Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => {
                  setFormData({ ...formData, name: text });
                  // Auto-generate slug
                  if (viewMode === 'create') {
                    setFormData((prev) => ({ ...prev, name: text, slug: generateSlug(text) }));
                  }
                }}
                placeholder="e.g., Baby Essentials Fund"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                URL Slug <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.slug}
                onChangeText={(text) => setFormData({ ...formData, slug: generateSlug(text) })}
                placeholder="baby-essentials-fund"
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
              <Text style={styles.hint}>URL: /campaign/{formData.slug || 'your-slug'}</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Describe your campaign..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Goal Amount <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputWithIcon}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={[styles.input, styles.inputWithPadding]}
                  value={formData.goal}
                  onChangeText={(text) => setFormData({ ...formData, goal: text.replace(/[^0-9.]/g, '') })}
                  placeholder="5000"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {viewMode === 'create' ? 'Create Campaign' : 'Save Changes'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0d72b9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Campaigns</Text>
        <TouchableOpacity onPress={handleCreate}>
          <Ionicons name="add-circle" size={28} color="#0d72b9" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search campaigns..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0d72b9" />
          <Text style={styles.loadingText}>Loading campaigns...</Text>
        </View>
      ) : (
        <ScrollView style={styles.listContainer}>
          {filteredCampaigns.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="megaphone-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No campaigns found' : 'No campaigns yet'}
              </Text>
              <Text style={styles.emptyMessage}>
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Create your first campaign to start fundraising'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity style={styles.createButton} onPress={handleCreate}>
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.createButtonText}>Create Campaign</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredCampaigns.map((campaign) => {
              const raised = parseFloat(campaign.raised || '0');
              const goal = parseFloat(campaign.goal);
              const progress = goal > 0 ? (raised / goal) * 100 : 0;

              return (
                <View key={campaign.id} style={styles.campaignCard}>
                  <View style={styles.campaignHeader}>
                    <View style={styles.campaignInfo}>
                      <Text style={styles.campaignName}>{campaign.name}</Text>
                      <Text style={styles.campaignSlug}>/{campaign.slug}</Text>
                    </View>
                    <View style={styles.campaignActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEdit(campaign)}
                      >
                        <Ionicons name="create-outline" size={20} color="#0d72b9" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleArchive(campaign)}
                      >
                        <Ionicons name="archive-outline" size={20} color="#f59e0b" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDelete(campaign)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {campaign.description && (
                    <Text style={styles.campaignDescription} numberOfLines={2}>
                      {campaign.description}
                    </Text>
                  )}

                  <View style={styles.progressSection}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
                    </View>
                    <View style={styles.progressStats}>
                      <Text style={styles.raisedAmount}>${raised.toFixed(2)} raised</Text>
                      <Text style={styles.goalAmount}>of ${parseFloat(campaign.goal).toFixed(2)}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    padding: 12,
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d72b9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 20,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  campaignCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  campaignInfo: {
    flex: 1,
  },
  campaignName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  campaignSlug: {
    fontSize: 13,
    color: '#0d72b9',
  },
  campaignActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  campaignDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  progressSection: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e5e5',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#26b578',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  raisedAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#26b578',
  },
  goalAmount: {
    fontSize: 14,
    color: '#666',
  },
  formContainer: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  currencySymbol: {
    position: 'absolute',
    left: 14,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    zIndex: 1,
  },
  inputWithPadding: {
    paddingLeft: 32,
    flex: 1,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
  },
  saveButton: {
    backgroundColor: '#0d72b9',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
