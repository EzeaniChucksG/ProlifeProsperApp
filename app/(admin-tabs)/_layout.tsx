import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { storage } from '@/services/storage';

export default function AdminTabLayout() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const adminUserStr = await storage.getItem('admin_user');
      const adminToken = await storage.getItem('admin_token');
      
      // Check if both values exist
      if (!adminUserStr || !adminToken) {
        console.log('Admin auth: Missing credentials, redirecting to login');
        router.replace('/(admin-auth)/admin-login');
        setIsLoading(false);
        return;
      }

      // Try to parse admin user (validate it's valid JSON)
      try {
        JSON.parse(adminUserStr);
        // Valid admin session
        setIsAuthenticated(true);
        setIsLoading(false);
      } catch (parseError) {
        // Invalid JSON - clear and redirect
        console.error('Admin auth: Invalid session data, clearing and redirecting');
        await storage.removeItem('admin_user');
        await storage.removeItem('admin_token');
        router.replace('/(admin-auth)/admin-login');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Admin auth: Unexpected error, redirecting to login:', error);
      router.replace('/(admin-auth)/admin-login');
      setIsLoading(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return null; // Show nothing while checking auth
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0d72b9',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#eee',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="terminal"
        options={{
          title: 'Terminal',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
