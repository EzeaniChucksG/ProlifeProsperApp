import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { storage } from '@/services/storage';
import { useAppDispatch } from '@/store/hooks';
import { logout as donorLogout } from '@/store/slices/authSlice';
import { api } from '@/services/api';

export default function AdminLoginScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }

    setIsLoading(true);

    try {
      // FIRST: Log out of donor account if logged in
      console.log('Admin login: Logging out of donor account (if any)...');
      await dispatch(donorLogout());
      
      // Small delay to ensure donor logout completes
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Real API authentication
      console.log('Admin login: Authenticating with backend API...');
      const response = await api.post('/auth/signin', {
        email,
        password,
      });

      if (!response.user || !response.token) {
        throw new Error('Invalid response from server');
      }

      // Verify user has admin role
      if (response.user.role !== 'admin' && response.user.role !== 'super_admin' && response.user.role !== 'staff_member') {
        Alert.alert(
          'Access Denied', 
          'This account does not have admin privileges. Please use the donor app instead.'
        );
        setIsLoading(false);
        return;
      }

      // Get organization name if not included
      let organizationName = 'Your Organization';
      if (response.user.organizationId) {
        try {
          const org = await api.get(`/organizations/${response.user.organizationId}`);
          organizationName = org.name || organizationName;
        } catch (orgError) {
          console.error('Error fetching organization:', orgError);
        }
      }

      const adminUser = {
        id: response.user.id,
        email: response.user.email,
        firstName: response.user.firstName || 'Admin',
        lastName: response.user.lastName || 'User',
        role: response.user.role,
        organizationId: response.user.organizationId,
        organizationName,
      };

      // Save admin auth state
      console.log('Admin login: Saving admin user to storage...');
      await storage.setItem('admin_user', JSON.stringify(adminUser));
      await storage.setItem('admin_token', response.token);
      
      // Small delay to ensure storage is fully committed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Navigate to admin dashboard
      console.log('Admin login: Navigating to admin tabs...');
      router.replace('/(admin-tabs)');
    } catch (error: any) {
      console.error('Admin login error:', error);
      const errorMessage = error?.message || error?.error || 'Unable to sign in. Please check your credentials.';
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="business-outline" size={64} color="#0d72b9" />
          <Text style={styles.title}>Organization Admin</Text>
          <Text style={styles.subtitle}>Sign in to manage your organization</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Organization Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryButtonText}>← Back to Donor App</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#0d72b9',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  linkText: {
    color: '#0d72b9',
    fontSize: 16,
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  secondaryButton: {
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
