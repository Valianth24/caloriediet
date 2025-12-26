import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';
import { registerUser, loginUser, guestLogin, setAuthToken } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const { login, setUser } = useAuth();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'main' | 'login' | 'register'>('main');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('error'), t('emailRequired'));
      return;
    }
    setLoading(true);
    try {
      const data = await loginUser(email, password) as any;
      if (data && data.session_token) {
        setAuthToken(data.session_token);
        await AsyncStorage.setItem('session_token', data.session_token);
        setUser(data);
      }
    } catch (error: any) {
      Alert.alert(t('error'), error?.message || t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name) {
      Alert.alert(t('error'), t('fillAllFields'));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t('error'), t('passwordTooShort'));
      return;
    }
    setLoading(true);
    try {
      const data = await registerUser(email, password, name) as any;
      if (data && data.session_token) {
        setAuthToken(data.session_token);
        await AsyncStorage.setItem('session_token', data.session_token);
        setUser(data);
      }
    } catch (error: any) {
      Alert.alert(t('error'), error?.message || t('registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      const data = await guestLogin() as any;
      if (data && data.session_token) {
        setAuthToken(data.session_token);
        await AsyncStorage.setItem('session_token', data.session_token);
        setUser(data);
      }
    } catch (error: any) {
      Alert.alert(t('error'), t('guestLoginFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'login') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => setMode('main')}>
              <Ionicons name="arrow-back" size={24} color={Colors.darkText} />
            </TouchableOpacity>

            <View style={styles.formHeader}>
              <Ionicons name="log-in-outline" size={60} color={Colors.primary} />
              <Text style={styles.formTitle}>{t('loginTitle')}</Text>
              <Text style={styles.formSubtitle}>{t('loginSubtitle')}</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={Colors.lightText} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('email')}
                  placeholderTextColor={Colors.lightText}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.lightText} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('password')}
                  placeholderTextColor={Colors.lightText}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.lightText} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleEmailLogin} disabled={loading}>
                <Text style={styles.primaryButtonText}>{loading ? t('loggingIn') : t('login')}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setMode('register')}>
                <Text style={styles.switchText}>{t('dontHaveAccount')} <Text style={styles.switchLink}>{t('register')}</Text></Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (mode === 'register') {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => setMode('main')}>
              <Ionicons name="arrow-back" size={24} color={Colors.darkText} />
            </TouchableOpacity>

            <View style={styles.formHeader}>
              <Ionicons name="person-add-outline" size={60} color={Colors.primary} />
              <Text style={styles.formTitle}>{t('registerTitle')}</Text>
              <Text style={styles.formSubtitle}>{t('registerSubtitle')}</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={Colors.lightText} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('fullName')}
                  placeholderTextColor={Colors.lightText}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={Colors.lightText} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('email')}
                  placeholderTextColor={Colors.lightText}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.lightText} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('passwordHint')}
                  placeholderTextColor={Colors.lightText}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.lightText} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleRegister} disabled={loading}>
                <Text style={styles.primaryButtonText}>{loading ? t('registering') : t('register')}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setMode('login')}>
                <Text style={styles.switchText}>{t('alreadyHaveAccount')} <Text style={styles.switchLink}>{t('login')}</Text></Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Main login screen
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🍎</Text>
          </View>
          <Text style={styles.title}>CalorieDiet</Text>
          <Text style={styles.subtitle}>{t('welcome')}</Text>
        </View>

        <View style={styles.buttonContainer}>
          {/* Google Login */}
          <TouchableOpacity style={styles.googleButton} onPress={login}>
            <Ionicons name="logo-google" size={24} color="#FFF" />
            <Text style={styles.googleButtonText}>{t('loginWithGoogle')}</Text>
          </TouchableOpacity>

          {/* Email Login */}
          <TouchableOpacity style={styles.emailButton} onPress={() => setMode('login')}>
            <Ionicons name="mail-outline" size={24} color={Colors.primary} />
            <Text style={styles.emailButtonText}>{t('emailLogin')}</Text>
          </TouchableOpacity>

          {/* Register */}
          <TouchableOpacity style={styles.registerButton} onPress={() => setMode('register')}>
            <Ionicons name="person-add-outline" size={24} color={Colors.darkText} />
            <Text style={styles.registerButtonText}>{t('createAccount')}</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Guest Login */}
          <TouchableOpacity style={styles.guestButton} onPress={handleGuestLogin} disabled={loading}>
            <Ionicons name="person-outline" size={24} color={Colors.lightText} />
            <Text style={styles.guestButtonText}>{loading ? t('loggingIn') : t('guestLogin')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoEmoji: {
    fontSize: 50,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.lightText,
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
  },
  googleButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  emailButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: Colors.darkText,
  },
  registerButtonText: {
    color: Colors.darkText,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: Colors.lightText,
    fontSize: 14,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
  },
  guestButtonText: {
    color: Colors.lightText,
    fontSize: 16,
    fontWeight: '600',
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginTop: 16,
  },
  formSubtitle: {
    fontSize: 16,
    color: Colors.lightText,
    marginTop: 8,
  },
  form: {
    width: '100%',
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.darkText,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchText: {
    textAlign: 'center',
    color: Colors.lightText,
    fontSize: 14,
    marginTop: 16,
  },
  switchLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
