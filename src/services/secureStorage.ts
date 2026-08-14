import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = '__6th_sense_client_token';
const USER_KEY = '__6th_sense_client_user';

// ADV-016: Use hardware-backed SecureStore with AsyncStorage web fallback
export const setSecureItem = async (key: string, value: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch (error) {
    console.error(`SecureStore setItem error for ${key}:`, error);
    await AsyncStorage.setItem(key, value);
  }
};

export const getSecureItem = async (key: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(key);
    }
    const val = await SecureStore.getItemAsync(key);
    return val ?? await AsyncStorage.getItem(key);
  } catch (error) {
    console.error(`SecureStore getItem error for ${key}:`, error);
    return await AsyncStorage.getItem(key);
  }
};

export const removeSecureItem = async (key: string): Promise<void> => {
  try {
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(key);
    }
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error(`SecureStore removeItem error for ${key}:`, error);
    await AsyncStorage.removeItem(key);
  }
};

// CLI-025: Strip PII fields before storing user data
const sanitizeUserForStorage = (user: any): any => {
  const sanitized = { ...user };
  delete sanitized.ssn;
  delete sanitized.tax_id;
  delete sanitized.card_number;
  delete sanitized.cvv;
  return sanitized;
};

export const saveAuthData = async (token: string, user: any): Promise<void> => {
  const sanitizedUser = sanitizeUserForStorage(user);
  await setSecureItem(TOKEN_KEY, token);
  await setSecureItem(USER_KEY, JSON.stringify(sanitizedUser));
};

export const getAuthData = async (): Promise<{ token: string | null; user: any | null }> => {
  const token = await getSecureItem(TOKEN_KEY);
  const userStr = await getSecureItem(USER_KEY);
  const user = userStr ? JSON.parse(userStr) : null;
  return { token, user };
};

export const clearAuthData = async (): Promise<void> => {
  await removeSecureItem(TOKEN_KEY);
  await removeSecureItem(USER_KEY);
};
