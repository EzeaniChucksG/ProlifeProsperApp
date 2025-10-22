import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config } from '@/constants/Config';
import type { User } from '@/types/api';

export const storage = {
  // Auth token management
  async setAuthToken(token: string): Promise<void> {
    await AsyncStorage.setItem(Config.STORAGE_KEYS.AUTH_TOKEN, token);
  },

  async getAuthToken(): Promise<string | null> {
    return AsyncStorage.getItem(Config.STORAGE_KEYS.AUTH_TOKEN);
  },

  async removeAuthToken(): Promise<void> {
    await AsyncStorage.removeItem(Config.STORAGE_KEYS.AUTH_TOKEN);
  },

  // User data management
  async setUserData(user: User): Promise<void> {
    await AsyncStorage.setItem(
      Config.STORAGE_KEYS.USER_DATA,
      JSON.stringify(user)
    );
  },

  async getUserData(): Promise<User | null> {
    const data = await AsyncStorage.getItem(Config.STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  },

  async removeUserData(): Promise<void> {
    await AsyncStorage.removeItem(Config.STORAGE_KEYS.USER_DATA);
  },

  // Saved organizations (favorites)
  async getSavedOrganizations(): Promise<number[]> {
    const data = await AsyncStorage.getItem(Config.STORAGE_KEYS.SAVED_ORGS);
    return data ? JSON.parse(data) : [];
  },

  async saveOrganization(organizationId: number): Promise<void> {
    const saved = await this.getSavedOrganizations();
    if (!saved.includes(organizationId)) {
      saved.push(organizationId);
      await AsyncStorage.setItem(
        Config.STORAGE_KEYS.SAVED_ORGS,
        JSON.stringify(saved)
      );
    }
  },

  async unsaveOrganization(organizationId: number): Promise<void> {
    const saved = await this.getSavedOrganizations();
    const filtered = saved.filter(id => id !== organizationId);
    await AsyncStorage.setItem(
      Config.STORAGE_KEYS.SAVED_ORGS,
      JSON.stringify(filtered)
    );
  },

  // Clear all data
  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([
      Config.STORAGE_KEYS.AUTH_TOKEN,
      Config.STORAGE_KEYS.USER_DATA,
      Config.STORAGE_KEYS.SAVED_ORGS,
    ]);
  },
};
