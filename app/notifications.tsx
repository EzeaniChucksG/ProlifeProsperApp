import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { storage } from '@/services/storage';

interface NotificationSettings {
  donationReceipts: boolean;
  campaignUpdates: boolean;
  monthlyReports: boolean;
  thankYouMessages: boolean;
  goalMilestones: boolean;
  emergencyAlerts: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>({
    donationReceipts: true,
    campaignUpdates: true,
    monthlyReports: true,
    thankYouMessages: true,
    goalMilestones: true,
    emergencyAlerts: true,
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await storage.getItem('notification_settings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    try {
      await storage.setItem('notification_settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const notificationTypes = [
    {
      key: 'donationReceipts' as keyof NotificationSettings,
      title: 'Donation Receipts',
      description: 'Get receipts when you make a donation',
      icon: 'receipt-outline',
    },
    {
      key: 'campaignUpdates' as keyof NotificationSettings,
      title: 'Campaign Updates',
      description: 'Updates from campaigns you support',
      icon: 'megaphone-outline',
    },
    {
      key: 'monthlyReports' as keyof NotificationSettings,
      title: 'Monthly Impact Reports',
      description: 'See your monthly giving impact',
      icon: 'stats-chart-outline',
    },
    {
      key: 'thankYouMessages' as keyof NotificationSettings,
      title: 'Thank You Messages',
      description: 'Messages of gratitude from organizations',
      icon: 'heart-outline',
    },
    {
      key: 'goalMilestones' as keyof NotificationSettings,
      title: 'Goal Milestones',
      description: 'When campaigns reach their goals',
      icon: 'trophy-outline',
    },
    {
      key: 'emergencyAlerts' as keyof NotificationSettings,
      title: 'Emergency Alerts',
      description: 'Urgent needs from pregnancy centers',
      icon: 'alert-circle-outline',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Channels</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={24} color="#0d72b9" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive notifications on your device
                </Text>
              </View>
            </View>
            <Switch
              value={settings.pushEnabled}
              onValueChange={(value) => updateSetting('pushEnabled', value)}
              trackColor={{ false: '#ccc', true: '#0d72b9' }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="mail-outline" size={24} color="#0d72b9" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Email</Text>
                <Text style={styles.settingDescription}>
                  Receive updates via email
                </Text>
              </View>
            </View>
            <Switch
              value={settings.emailEnabled}
              onValueChange={(value) => updateSetting('emailEnabled', value)}
              trackColor={{ false: '#ccc', true: '#0d72b9' }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="chatbubble-outline" size={24} color="#0d72b9" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>SMS</Text>
                <Text style={styles.settingDescription}>
                  Receive text message updates
                </Text>
              </View>
            </View>
            <Switch
              value={settings.smsEnabled}
              onValueChange={(value) => updateSetting('smsEnabled', value)}
              trackColor={{ false: '#ccc', true: '#0d72b9' }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What You'll Receive</Text>
          
          {notificationTypes.map((type) => (
            <View key={type.key} style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name={type.icon as any} size={24} color="#0d72b9" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>{type.title}</Text>
                  <Text style={styles.settingDescription}>{type.description}</Text>
                </View>
              </View>
              <Switch
                value={settings[type.key]}
                onValueChange={(value) => updateSetting(type.key, value)}
                trackColor={{ false: '#ccc', true: '#0d72b9' }}
              />
            </View>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color="#0d72b9" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Manage Your Preferences</Text>
            <Text style={styles.infoText}>
              You can change these settings anytime. We'll only send you notifications about campaigns and organizations you support.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    paddingHorizontal: 20,
    paddingVertical: 12,
    textTransform: 'uppercase',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e7f2fa',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c5e3f6',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0d72b9',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});
