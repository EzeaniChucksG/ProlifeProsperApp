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
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/services/api';
import { getAdminUser } from '@/services/adminAuth';

interface Organization {
  id: number;
  name: string;
  slug: string;
  ein?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  description?: string;
  mission?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  socialFacebook?: string;
  socialTwitter?: string;
  socialInstagram?: string;
}

type TabType = 'details' | 'branding' | 'contact' | 'social';

export default function OrganizationProfileScreen() {
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Organization>>({});

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    const adminUser = await getAdminUser();
    if (adminUser?.organizationId) {
      setOrganizationId(adminUser.organizationId);
      loadOrganization(adminUser.organizationId);
    } else {
      Alert.alert('Error', 'No organization found for this admin');
      setLoading(false);
    }
  };

  const loadOrganization = async (orgId: number) => {
    try {
      setLoading(true);
      const org = await api.get<Organization>(`/organizations/${orgId}`);
      setOrganization(org);
      setFormData(org);
    } catch (error) {
      console.error('Error loading organization:', error);
      Alert.alert('Error', 'Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organizationId) {
      Alert.alert('Error', 'No organization ID available');
      return;
    }
    
    try {
      setSaving(true);
      await api.patch(`/organizations/${organizationId}/settings`, formData);
      Alert.alert('Success', 'Organization profile updated successfully!');
      loadOrganization(organizationId);
    } catch (error) {
      console.error('Error saving organization:', error);
      Alert.alert('Error', 'Failed to update organization profile');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof Organization, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const tabs = [
    { key: 'details' as TabType, label: 'Details', icon: 'information-circle-outline' },
    { key: 'branding' as TabType, label: 'Branding', icon: 'color-palette-outline' },
    { key: 'contact' as TabType, label: 'Contact', icon: 'call-outline' },
    { key: 'social' as TabType, label: 'Social', icon: 'share-social-outline' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0d72b9" />
        <Text style={styles.loadingText}>Loading organization...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0d72b9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Organization Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#0d72b9" />
          ) : (
            <Ionicons name="checkmark" size={28} color="#0d72b9" />
          )}
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon as any}
                size={20}
                color={activeTab === tab.key ? '#0d72b9' : '#666'}
              />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content}>
        {/* Details Tab */}
        {activeTab === 'details' && (
          <View style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Organization Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.name || ''}
                onChangeText={(text) => updateField('name', text)}
                placeholder="Your Organization Name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>URL Slug</Text>
              <TextInput
                style={styles.input}
                value={formData.slug || ''}
                onChangeText={(text) => updateField('slug', text.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="your-organization"
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
              <Text style={styles.hint}>URL: /org/{formData.slug || 'your-slug'}</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>EIN (Tax ID)</Text>
              <TextInput
                style={styles.input}
                value={formData.ein || ''}
                onChangeText={(text) => updateField('ein', text)}
                placeholder="12-3456789"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Mission Statement</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.mission || ''}
                onChangeText={(text) => updateField('mission', text)}
                placeholder="What is your organization's mission?"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description || ''}
                onChangeText={(text) => updateField('description', text)}
                placeholder="Tell donors about your organization..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={6}
              />
            </View>
          </View>
        )}

        {/* Branding Tab */}
        {activeTab === 'branding' && (
          <View style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Logo URL</Text>
              <TextInput
                style={styles.input}
                value={formData.logoUrl || ''}
                onChangeText={(text) => updateField('logoUrl', text)}
                placeholder="https://example.com/logo.png"
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Primary Color</Text>
              <View style={styles.colorPickerRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={formData.primaryColor || ''}
                  onChangeText={(text) => updateField('primaryColor', text)}
                  placeholder="#0d72b9"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
                <View
                  style={[
                    styles.colorPreview,
                    { backgroundColor: formData.primaryColor || '#0d72b9' },
                  ]}
                />
              </View>
              <Text style={styles.hint}>Used for buttons, links, and accents</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Secondary Color</Text>
              <View style={styles.colorPickerRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={formData.secondaryColor || ''}
                  onChangeText={(text) => updateField('secondaryColor', text)}
                  placeholder="#26b578"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
                <View
                  style={[
                    styles.colorPreview,
                    { backgroundColor: formData.secondaryColor || '#26b578' },
                  ]}
                />
              </View>
              <Text style={styles.hint}>Used for success states and highlights</Text>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#0d72b9" />
              <Text style={styles.infoText}>
                Colors will be applied to your donation pages, receipts, and public profile
              </Text>
            </View>
          </View>
        )}

        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <View style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Email <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.email || ''}
                onChangeText={(text) => updateField('email', text)}
                placeholder="contact@organization.org"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={formData.phone || ''}
                onChangeText={(text) => updateField('phone', text)}
                placeholder="(555) 123-4567"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Website</Text>
              <TextInput
                style={styles.input}
                value={formData.website || ''}
                onChangeText={(text) => updateField('website', text)}
                placeholder="https://yourorganization.org"
                placeholderTextColor="#999"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                value={formData.address || ''}
                onChangeText={(text) => updateField('address', text)}
                placeholder="123 Main Street"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 2 }]}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  value={formData.city || ''}
                  onChangeText={(text) => updateField('city', text)}
                  placeholder="City"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={styles.input}
                  value={formData.state || ''}
                  onChangeText={(text) => updateField('state', text.toUpperCase())}
                  placeholder="NY"
                  placeholderTextColor="#999"
                  maxLength={2}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>ZIP Code</Text>
              <TextInput
                style={styles.input}
                value={formData.zipCode || ''}
                onChangeText={(text) => updateField('zipCode', text)}
                placeholder="12345"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={5}
              />
            </View>
          </View>
        )}

        {/* Social Tab */}
        {activeTab === 'social' && (
          <View style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Facebook</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="logo-facebook" size={20} color="#1877f2" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputWithPadding]}
                  value={formData.socialFacebook || ''}
                  onChangeText={(text) => updateField('socialFacebook', text)}
                  placeholder="facebook.com/yourpage"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Twitter / X</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="logo-twitter" size={20} color="#1da1f2" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputWithPadding]}
                  value={formData.socialTwitter || ''}
                  onChangeText={(text) => updateField('socialTwitter', text)}
                  placeholder="twitter.com/yourhandle"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Instagram</Text>
              <View style={styles.inputWithIcon}>
                <Ionicons name="logo-instagram" size={20} color="#e4405f" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputWithPadding]}
                  value={formData.socialInstagram || ''}
                  onChangeText={(text) => updateField('socialInstagram', text)}
                  placeholder="instagram.com/yourhandle"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#0d72b9" />
              <Text style={styles.infoText}>
                Social links will appear on your donation pages and receipts
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
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
  tabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabScrollContent: {
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#0d72b9',
  },
  tabText: {
    fontSize: 15,
    color: '#666',
  },
  tabTextActive: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0d72b9',
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
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
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
  },
  colorPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorPreview: {
    width: 50,
    height: 50,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  inputWithIcon: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    top: 16,
    zIndex: 1,
  },
  inputWithPadding: {
    paddingLeft: 44,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e7f2fa',
    padding: 12,
    borderRadius: 10,
    gap: 10,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d72b9',
    padding: 16,
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 20,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});
