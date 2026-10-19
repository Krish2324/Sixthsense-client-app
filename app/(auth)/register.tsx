import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Google from 'expo-auth-session/providers/google';
import { COLORS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';

// Google OAuth Client IDs
const GOOGLE_WEB_CLIENT_ID = '512681929226-37j50jbk2jvu09picvht72uhhdif2dut.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = '512681929226-l33c2jk48dve876u4mj3tsdq04r1on8k.apps.googleusercontent.com';
const GOOGLE_ANDROID_CLIENT_ID = '512681929226-ps4skp32f0q6qusn493nq9bdqummvqfv.apps.googleusercontent.com';

// Ensure WebBrowser redirect completes properly
WebBrowser.maybeCompleteAuthSession();

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.29.227:8000';

// Check if running in web browser
const isWeb = Platform.OS === 'web' || typeof document !== 'undefined';

// App logo
// Use local icon asset
const APP_LOGO_URL = require("../../assets/icon.png");

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register, socialLogin } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(1990);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  const years = Array.from({ length: 80 }, (_, i) => 2010 - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  // Check Apple availability
  useEffect(() => {
    const checkApple = async () => {
      if (Platform.OS === 'ios') {
        const available = await AppleAuthentication.isAvailableAsync();
        setIsAppleAvailable(available);
      }
    };
    checkApple();
  }, []);

  // GOOGLE SIGN-IN with OAuth
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  });

  // Handle Google Sign-In response
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleGoogleToken(authentication.accessToken);
      }
    }
  }, [response]);

  const handleGoogleToken = async (accessToken: string) => {
    setIsLoading(true);
    try {
      // Get user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const googleUser = await userInfoResponse.json();

      // Send to our backend
      const backendResponse = await fetch(`${BACKEND_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          google_id: googleUser.id,
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
        }),
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json();
        throw new Error(errorData.detail || 'Failed to authenticate with Google');
      }

      const data = await backendResponse.json();
      await socialLogin(data.access_token, data.user);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      console.error('Google Sign-Up error:', error);
      Alert.alert('Sign-Up Error', error.message || 'Failed to sign up with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);

    // Google OAuth Session via WebBrowser
    const sessionId = `gsess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const returnUrl = Linking.createURL('register');
    const authUrl = `${BACKEND_URL}/api/auth/google/authorize?session_id=${sessionId}&app_return_url=${encodeURIComponent(returnUrl)}`;

    let completed = false;
    const checkSession = async (): Promise<boolean> => {
      if (completed) return true;
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/google/poll-session/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'completed' && data.access_token && data.user) {
            completed = true;
            try { WebBrowser.dismissBrowser(); } catch {}
            await socialLogin(data.access_token, data.user);
            router.replace('/(tabs)/home');
            return true;
          }
        }
      } catch {}
      return false;
    };

    const pollInterval = setInterval(async () => {
      const done = await checkSession();
      if (done) clearInterval(pollInterval);
    }, 1000);

    try {
      await WebBrowser.openAuthSessionAsync(authUrl, returnUrl).catch(() => null);
      await checkSession();
    } catch (error: any) {
      console.error('Google Sign-Up error:', error);
      Alert.alert('Sign-Up Error', 'Failed to sign up with Google. Please try again.');
    } finally {
      clearInterval(pollInterval);
      setIsLoading(false);
    }
  };

  // APPLE SIGN-IN (iOS only)
  const handleAppleSignUp = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Apple Sign-Up', 'Apple Sign-Up is only available on iOS devices.');
      return;
    }
    
    setIsLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      // Send to backend for verification
      const backendResponse = await fetch(`${BACKEND_URL}/api/auth/apple/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity_token: credential.identityToken,
          user: credential.user,
          name: credential.fullName 
            ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
            : null,
          email: credential.email,
        }),
      });
      
      if (!backendResponse.ok) {
        const errorData = await backendResponse.json();
        throw new Error(errorData.detail || 'Failed to verify Apple credentials');
      }
      
      const data = await backendResponse.json();
      await socialLogin(data.access_token, data.user);
      router.replace('/(tabs)/home');
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        setIsLoading(false);
        return;
      }
      console.error('Apple Sign-Up error:', error);
      Alert.alert('Apple Sign-Up Failed', error.message || 'Please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateSelect = () => {
    const formattedDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    setBirthDate(formattedDate);
    setShowDatePicker(false);
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!agreedToTerms) {
      Alert.alert('Error', 'Please agree to the Terms & Conditions');
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        'Password Too Short',
        'Password must be at least 6 characters long.'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await register(email, password, name, birthDate || undefined);
      router.replace('/(tabs)/home');
    } catch (err: any) {
      const errMsg = err?.message || 'Registration failed. Please try again.';
      Alert.alert('Sign Up Error', errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#1A1333', '#0F0A1E', '#0F0A1E']}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(auth)/welcome');
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        {/* Header with Logo */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={APP_LOGO_URL}
              style={styles.logoImage}
            />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Get your first 4 minutes FREE on your first reading!</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor={COLORS.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons
                name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.inputContainer}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <Text style={[styles.input, { color: birthDate ? COLORS.textPrimary : COLORS.textMuted }]}>
              {birthDate || 'Birth Date (Optional)'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          {/* Date Picker Modal */}
          <Modal
            visible={showDatePicker}
            transparent
            animationType="slide"
          >
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerCancel}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.datePickerTitle}>Select Birth Date</Text>
                  <TouchableOpacity onPress={handleDateSelect}>
                    <Text style={styles.datePickerDone}>Done</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.datePickerRow}>
                  <View style={styles.datePickerColumn}>
                    <Text style={styles.datePickerLabel}>Year</Text>
                    <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                      {years.map((year) => (
                        <TouchableOpacity
                          key={year}
                          style={[styles.datePickerItem, selectedYear === year && styles.datePickerItemSelected]}
                          onPress={() => setSelectedYear(year)}
                        >
                          <Text style={[styles.datePickerItemText, selectedYear === year && styles.datePickerItemTextSelected]}>
                            {year}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  
                  <View style={styles.datePickerColumn}>
                    <Text style={styles.datePickerLabel}>Month</Text>
                    <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                      {months.map((month) => (
                        <TouchableOpacity
                          key={month}
                          style={[styles.datePickerItem, selectedMonth === month && styles.datePickerItemSelected]}
                          onPress={() => setSelectedMonth(month)}
                        >
                          <Text style={[styles.datePickerItemText, selectedMonth === month && styles.datePickerItemTextSelected]}>
                            {month}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  
                  <View style={styles.datePickerColumn}>
                    <Text style={styles.datePickerLabel}>Day</Text>
                    <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                      {days.map((day) => (
                        <TouchableOpacity
                          key={day}
                          style={[styles.datePickerItem, selectedDay === day && styles.datePickerItemSelected]}
                          onPress={() => setSelectedDay(day)}
                        >
                          <Text style={[styles.datePickerItemText, selectedDay === day && styles.datePickerItemTextSelected]}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </View>
            </View>
          </Modal>

          {/* Terms Checkbox */}
          <View style={styles.termsRow}>
            <TouchableOpacity
              style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
            >
              {agreedToTerms && <Ionicons name="checkmark" size={14} color="#FFF" />}
            </TouchableOpacity>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsLink} onPress={() => router.push('/terms')}>
                Terms & Conditions
              </Text>{' '}
              and{' '}
              <Text style={styles.termsLink} onPress={() => router.push('/terms')}>
                Privacy Policy
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.registerButtonText}>Create Account</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Bonus Banner */}
        <View style={styles.bonusBanner}>
          <Ionicons name="time" size={24} color={COLORS.secondary} />
          <View style={styles.bonusText}>
            <Text style={styles.bonusTitle}>First 4 Minutes FREE!</Text>
            <Text style={styles.bonusDesc}>On your first reading with any advisor</Text>
          </View>
        </View>

        {/* Social Login */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or sign up with</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialButtons}>
          <TouchableOpacity 
            style={[styles.socialButton, Platform.OS !== 'ios' && styles.socialButtonFull]}
            onPress={handleGoogleSignUp}
            disabled={isLoading}
          >
            <Ionicons name="logo-google" size={22} color={COLORS.textPrimary} />
            <Text style={styles.socialButtonText}>Google</Text>
          </TouchableOpacity>

          {/* Apple Sign-In - ONLY show on iOS native app */}
          {Platform.OS === 'ios' && isAppleAvailable ? (
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={handleAppleSignUp}
              disabled={isLoading}
            >
              <Ionicons name="logo-apple" size={22} color={COLORS.textPrimary} />
              <Text style={styles.socialButtonText}>Apple</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Login Link */}
        <View style={[styles.loginLink, { paddingBottom: insets.bottom + SPACING.lg }]}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.loginLinkText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 22,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  logoContainer: {
    marginBottom: SPACING.md,
    shadowColor: '#9B7BD4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  logoImage: {
    width: 70,
    height: 70,
    borderRadius: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  form: {
    gap: SPACING.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 56,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  termsText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  registerButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  buttonGradient: {
    flexDirection: 'row',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  registerButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  bonusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    gap: SPACING.md,
  },
  bonusText: {
    flex: 1,
  },
  bonusTitle: {
    color: COLORS.secondary,
    fontSize: 16,
    fontWeight: '700',
  },
  bonusDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textMuted,
    marginHorizontal: SPACING.md,
    fontSize: 14,
  },
  socialButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  socialButtonDisabled: {
    opacity: 0.75,
  },
  socialButtonFull: {
    flex: undefined,
    width: '100%',
  },
  socialButtonText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: SPACING.xl,
  },
  loginText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  loginLinkText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: COLORS.backgroundCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  datePickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  datePickerCancel: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  datePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  datePickerRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  datePickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  datePickerScroll: {
    height: 180,
  },
  datePickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 2,
  },
  datePickerItemSelected: {
    backgroundColor: COLORS.primary + '20',
  },
  datePickerItemText: {
    fontSize: 18,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  datePickerItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
