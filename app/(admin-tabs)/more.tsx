import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { storage } from '@/services/storage';

export default function MoreScreen() {
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await storage.removeItem('admin_user');
            await storage.removeItem('admin_token');
            router.replace('/(admin-auth)/admin-login');
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      section: 'Tools',
      items: [
        { icon: 'qr-code-outline', label: 'QR Code Generator', route: '/admin/qr-generator' },
        { icon: 'mail-outline', label: 'Send Receipts', route: '/admin/send-receipt' },
        { icon: 'chatbubbles-outline', label: 'Donor Messages', route: '/admin/donor-chat' },
        { icon: 'notifications-outline', label: 'Push Notifications', comingSoon: true },
      ],
    },
    {
      section: 'Manage',
      items: [
        { icon: 'megaphone-outline', label: 'Campaigns', comingSoon: true },
        { icon: 'people-outline', label: 'Donors', comingSoon: true },
        { icon: 'calendar-outline', label: 'Events', comingSoon: true },
        { icon: 'card-outline', label: 'Payment Methods', comingSoon: true },
      ],
    },
    {
      section: 'Settings',
      items: [
        { icon: 'business-outline', label: 'Organization Profile', comingSoon: true },
        { icon: 'settings-outline', label: 'App Settings', comingSoon: true },
        { icon: 'shield-checkmark-outline', label: 'Security', comingSoon: true },
        { icon: 'help-circle-outline', label: 'Help & Support', comingSoon: true },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
      </View>

      <View style={styles.orgCard}>
        <View style={styles.orgIcon}>
          <Ionicons name="business" size={32} color="#0d72b9" />
        </View>
        <View style={styles.orgInfo}>
          <Text style={styles.orgName}>Life Choice Pregnancy Center</Text>
          <Text style={styles.orgEmail}>admin@lifechoicepc.org</Text>
        </View>
        <TouchableOpacity style={styles.editButton}>
          <Ionicons name="create-outline" size={20} color="#0d72b9" />
        </TouchableOpacity>
      </View>

      {menuItems.map((section) => (
        <View key={section.section} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.section}</Text>
          {section.items.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              onPress={() => {
                if ((item as any).route) {
                  router.push((item as any).route);
                } else {
                  Alert.alert('Coming Soon', `${item.label} feature is under development.`);
                }
              }}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon as any} size={24} color="#0d72b9" />
                <Text style={styles.menuItemText}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>
      ))}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={24} color="#E63946" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>ProLifeProsper Nonprofit App</Text>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
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
  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  orgIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e7f2fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  orgEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  editButton: {
    padding: 8,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    paddingHorizontal: 20,
    paddingVertical: 12,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#fff',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E63946',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E63946',
  },
  appInfo: {
    alignItems: 'center',
    padding: 20,
  },
  appInfoText: {
    fontSize: 13,
    color: '#999',
  },
  appVersion: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 4,
  },
});
