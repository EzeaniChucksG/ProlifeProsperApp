import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationSettings {
  enabled: boolean;
  newDonations: boolean;
  goalMilestones: boolean;
  vipDonors: boolean;
  recurringRenewal: boolean;
  largeGifts: boolean;
  dailySummary: boolean;
  weeklySummary: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  newDonations: true,
  goalMilestones: true,
  vipDonors: true,
  recurringRenewal: true,
  largeGifts: true,
  dailySummary: false,
  weeklySummary: true,
};

interface NotificationHistory {
  id: number;
  title: string;
  message: string;
  timestamp: Date;
  type: 'donation' | 'milestone' | 'vip' | 'summary';
  read: boolean;
}

const mockNotificationHistory: NotificationHistory[] = [
  {
    id: 1,
    title: 'New Donation Received!',
    message: 'Sarah Johnson donated $100 to Baby Essentials Fund',
    timestamp: new Date('2025-10-26T10:30:00'),
    type: 'donation',
    read: false,
  },
  {
    id: 2,
    title: 'Campaign Milestone Reached! 🎉',
    message: 'Baby Essentials Fund reached 75% of goal ($15,000)',
    timestamp: new Date('2025-10-25T15:20:00'),
    type: 'milestone',
    read: false,
  },
  {
    id: 3,
    title: 'VIP Donor Activity',
    message: 'Michael Chen (VIP) renewed monthly $500 donation',
    timestamp: new Date('2025-10-25T09:15:00'),
    type: 'vip',
    read: true,
  },
  {
    id: 4,
    title: 'New Donation Received!',
    message: 'Anonymous donated $50 to General Fund',
    timestamp: new Date('2025-10-24T14:00:00'),
    type: 'donation',
    read: true,
  },
  {
    id: 5,
    title: 'Weekly Summary',
    message: 'You received 15 donations totaling $2,350 this week',
    timestamp: new Date('2025-10-22T08:00:00'),
    type: 'summary',
    read: true,
  },
];

export default function PushNotificationsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [notifications, setNotifications] = useState(mockNotificationHistory);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('admin_notification_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem('admin_notification_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      Alert.alert('Error', 'Failed to save notification settings');
    }
  };

  const toggleSetting = (key: keyof NotificationSettings) => {
    if (key === 'enabled') {
      const newEnabled = !settings.enabled;
      const newSettings = { ...settings, enabled: newEnabled };
      saveSettings(newSettings);
      
      if (newEnabled) {
        Alert.alert(
          'Notifications Enabled',
          'You will now receive push notifications for important events.'
        );
      }
    } else {
      const newSettings = { ...settings, [key]: !settings[key] };
      saveSettings(newSettings);
    }
  };

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
    Alert.alert('Success', 'All notifications marked as read');
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes < 1 ? 'Just now' : `${minutes}m ago`;
    }
    if (hours < 24) {
      return `${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'donation':
        return 'cash-outline';
      case 'milestone':
        return 'trophy-outline';
      case 'vip':
        return 'star-outline';
      case 'summary':
        return 'stats-chart-outline';
      default:
        return 'notifications-outline';
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0d72b9" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Push Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Notification Settings</Text>
          <View style={styles.masterToggle}>
            <Text style={[styles.toggleLabel, settings.enabled && styles.toggleLabelActive]}>
              {settings.enabled ? 'Enabled' : 'Disabled'}
            </Text>
            <Switch
              value={settings.enabled}
              onValueChange={() => toggleSetting('enabled')}
              trackColor={{ false: '#ccc', true: '#0d72b9' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Real-Time Alerts</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="cash-outline" size={24} color="#0d72b9" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>New Donations</Text>
                <Text style={styles.settingDescription}>Get notified instantly for all donations</Text>
              </View>
            </View>
            <Switch
              value={settings.newDonations}
              onValueChange={() => toggleSetting('newDonations')}
              disabled={!settings.enabled}
              trackColor={{ false: '#ccc', true: '#0d72b9' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="trophy-outline" size={24} color="#0d72b9" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Goal Milestones</Text>
                <Text style={styles.settingDescription}>25%, 50%, 75%, 100% progress updates</Text>
              </View>
            </View>
            <Switch
              value={settings.goalMilestones}
              onValueChange={() => toggleSetting('goalMilestones')}
              disabled={!settings.enabled}
              trackColor={{ false: '#ccc', true: '#0d72b9' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="star-outline" size={24} color="#0d72b9" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>VIP Donor Activity</Text>
                <Text style={styles.settingDescription}>Track your top supporters</Text>
              </View>
            </View>
            <Switch
              value={settings.vipDonors}
              onValueChange={() => toggleSetting('vipDonors')}
              disabled={!settings.enabled}
              trackColor={{ false: '#ccc', true: '#0d72b9' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="repeat-outline" size={24} color="#0d72b9" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Recurring Renewals</Text>
                <Text style={styles.settingDescription}>Monthly subscription payments</Text>
              </View>
            </View>
            <Switch
              value={settings.recurringRenewal}
              onValueChange={() => toggleSetting('recurringRenewal')}
              disabled={!settings.enabled}
              trackColor={{ false: '#ccc', true: '#0d72b9' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="trending-up-outline" size={24} color="#0d72b9" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Large Gifts ($500+)</Text>
                <Text style={styles.settingDescription}>Major donation alerts</Text>
              </View>
            </View>
            <Switch
              value={settings.largeGifts}
              onValueChange={() => toggleSetting('largeGifts')}
              disabled={!settings.enabled}
              trackColor={{ false: '#ccc', true: '#0d72b9' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Summary Reports</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="today-outline" size={24} color="#0d72b9" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Daily Summary</Text>
                <Text style={styles.settingDescription}>End-of-day report (8 PM)</Text>
              </View>
            </View>
            <Switch
              value={settings.dailySummary}
              onValueChange={() => toggleSetting('dailySummary')}
              disabled={!settings.enabled}
              trackColor={{ false: '#ccc', true: '#0d72b9' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="calendar-outline" size={24} color="#0d72b9" />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Weekly Summary</Text>
                <Text style={styles.settingDescription}>Monday mornings (8 AM)</Text>
              </View>
            </View>
            <Switch
              value={settings.weeklySummary}
              onValueChange={() => toggleSetting('weeklySummary')}
              disabled={!settings.enabled}
              trackColor={{ false: '#ccc', true: '#0d72b9' }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.notificationHeader}>
          <Text style={styles.sectionTitle}>
            Recent Notifications {unreadCount > 0 && `(${unreadCount})`}
          </Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead}>
              <Text style={styles.markAllRead}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.notificationsList}>
          {notifications.map((notif) => (
            <TouchableOpacity
              key={notif.id}
              style={[styles.notificationCard, !notif.read && styles.notificationCardUnread]}
              onPress={() => markAsRead(notif.id)}
            >
              <View style={styles.notificationIcon}>
                <Ionicons
                  name={getNotificationIcon(notif.type) as any}
                  size={24}
                  color="#0d72b9"
                />
              </View>
              <View style={styles.notificationContent}>
                <Text style={[styles.notificationTitle, !notif.read && styles.notificationTitleUnread]}>
                  {notif.title}
                </Text>
                <Text style={styles.notificationMessage}>{notif.message}</Text>
                <Text style={styles.notificationTime}>{formatTime(notif.timestamp)}</Text>
              </View>
              {!notif.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  masterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  toggleLabelActive: {
    color: '#0d72b9',
  },
  settingsGroup: {
    marginBottom: 30,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  markAllRead: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0d72b9',
  },
  notificationsList: {
    gap: 10,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    position: 'relative',
  },
  notificationCardUnread: {
    backgroundColor: '#f0f9ff',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e6f2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notificationTitleUnread: {
    fontWeight: '700',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0d72b9',
    position: 'absolute',
    top: 15,
    right: 15,
  },
});
