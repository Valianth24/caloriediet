import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useStore } from '../../store/useStore';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/Colors';
import { updateProfile, updateGoals } from '../../utils/api';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import i18n, { languageList, changeLanguage } from '../../utils/i18n';
import ThemeSelector from '../../components/ThemeSelector';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { setUser } = useStore();
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    height: user?.height?.toString() || '',
    weight: user?.weight?.toString() || '',
    age: user?.age?.toString() || '',
    gender: user?.gender || 'male',
    activity_level: user?.activity_level || 'moderate',
    daily_calorie_goal: user?.daily_calorie_goal?.toString() || '',
    water_goal: user?.water_goal?.toString() || '',
    step_goal: user?.step_goal?.toString() || '',
  });

  const handleSave = async () => {
    try {
      // Validate input data
      const height = parseFloat(formData.height);
      const weight = parseFloat(formData.weight);
      const age = parseInt(formData.age);
      
      if (isNaN(height) || height < 100 || height > 250) {
        Alert.alert(t('error'), t('enterValidHeight') || 'Please enter a valid height');
        return;
      }
      if (isNaN(weight) || weight < 30 || weight > 300) {
        Alert.alert(t('error'), t('enterValidWeight') || 'Please enter a valid weight');
        return;
      }
      if (isNaN(age) || age < 10 || age > 120) {
        Alert.alert(t('error'), t('enterValidAge') || 'Please enter a valid age');
        return;
      }
      
      // Kalori hedefi sınırı kontrolü - minimum 1600
      const calorieGoal = parseInt(formData.daily_calorie_goal) || 2000;
      if (calorieGoal < 1600) {
        Alert.alert(
          t('warning') || 'Uyarı',
          t('minCalorieWarning') || 'Sağlık açısından günlük kalori hedefi 1600\'den düşük olmamalıdır. Hedef 1600 olarak ayarlandı.'
        );
      }
      
      const profileData = {
        height,
        weight,
        age,
        gender: formData.gender,
        activity_level: formData.activity_level,
      };

      const goalsData = {
        daily_calorie_goal: Math.max(calorieGoal, 1600), // Minimum 1600 kalori
        water_goal: parseInt(formData.water_goal) || 2500,
        step_goal: parseInt(formData.step_goal) || 10000,
      };

      console.log('[Profile] Saving profile data:', profileData);
      console.log('[Profile] Saving goals data:', goalsData);

      const [updatedProfile, updatedGoals] = await Promise.all([
        updateProfile(profileData),
        updateGoals(goalsData),
      ]);

      console.log('[Profile] Profile updated successfully');
      
      if (updatedGoals) {
        setUser(updatedGoals as any);
      }
      setEditing(false);
      Alert.alert(t('success'), t('profileUpdated'));
    } catch (error: any) {
      console.error('[Profile] Error updating profile:', error);
      
      let errorMessage = t('profileUpdateError');
      if (error?.message) {
        if (error.message.includes('Network')) {
          errorMessage = t('networkError') || 'Network error. Please check your connection.';
        } else if (error.message.includes('401')) {
          errorMessage = t('sessionExpired') || 'Session expired. Please login again.';
        }
      }
      
      Alert.alert(t('error'), errorMessage);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      t('logout'),
      t('logoutConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('logout'), style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      t('deleteAccount') || 'Hesabı Sil',
      t('deleteAccountConfirm') || 'Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm verileriniz silinecektir.',
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('delete') || 'Sil', 
          style: 'destructive', 
          onPress: async () => {
            try {
              // Call delete account API
              const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
              const token = await AsyncStorage.getItem('session_token');
              
              // For now, we redirect to the web deletion page
              // This complies with Google Play requirements
              const deleteUrl = `${API_BASE_URL}/account-deletion`;
              
              Alert.alert(
                t('deleteAccount') || 'Hesabı Sil',
                t('deleteAccountRedirect') || 'Hesabınızı silmek için web sayfasına yönlendirileceksiniz.',
                [
                  { text: t('cancel'), style: 'cancel' },
                  { 
                    text: t('continue') || 'Devam Et', 
                    onPress: async () => {
                      // Open deletion page in browser
                      const { Linking } = require('react-native');
                      await Linking.openURL(deleteUrl);
                    }
                  },
                ]
              );
            } catch (error) {
              console.error('Delete account error:', error);
              Alert.alert(t('error'), t('deleteAccountError') || 'Hesap silinemedi. Lütfen tekrar deneyin.');
            }
          }
        },
      ]
    );
  };

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [currentLang, setCurrentLang] = useState(i18n.language);

  useEffect(() => {
    setCurrentLang(i18n.language);
  }, [i18n.language]);

  const handleLanguageChange = async (langCode: string) => {
    try {
      await changeLanguage(langCode);
      setCurrentLang(langCode);
      setShowLanguageModal(false);
      Alert.alert(t('success'), t('languageChanged'));
    } catch (error) {
      Alert.alert(t('error'), 'Language change failed');
    }
  };

  const getCurrentLanguageInfo = () => {
    const lang = languageList.find(l => l.code === currentLang);
    return lang || languageList[0];
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          {user?.picture ? (
            <Image source={{ uri: user.picture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={40} color={colors.white} />
            </View>
          )}
          <Text style={[styles.name, { color: colors.darkText }]}>{user?.name}</Text>
          <Text style={[styles.email, { color: colors.lightText }]}>{user?.email}</Text>
        </View>

        {/* Profile Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('updateProfile')}</Text>
            <TouchableOpacity onPress={() => (editing ? handleSave() : setEditing(true))}>
              <Text style={styles.editButton}>{editing ? t('save') : 'Edit'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('height')}</Text>
                <TextInput
                  style={[styles.input, !editing && styles.inputDisabled]}
                  value={formData.height}
                  onChangeText={(text) => setFormData({ ...formData, height: text })}
                  keyboardType="numeric"
                  editable={editing}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('weight')}</Text>
                <TextInput
                  style={[styles.input, !editing && styles.inputDisabled]}
                  value={formData.weight}
                  onChangeText={(text) => setFormData({ ...formData, weight: text })}
                  keyboardType="numeric"
                  editable={editing}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('age')}</Text>
                <TextInput
                  style={[styles.input, !editing && styles.inputDisabled]}
                  value={formData.age}
                  onChangeText={(text) => setFormData({ ...formData, age: text })}
                  keyboardType="numeric"
                  editable={editing}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('gender')}</Text>
                <View style={styles.genderButtons}>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      formData.gender === 'male' && styles.genderButtonActive,
                      !editing && styles.buttonDisabled,
                    ]}
                    onPress={() => editing && setFormData({ ...formData, gender: 'male' })}
                    disabled={!editing}
                  >
                    <Text
                      style={[
                        styles.genderButtonText,
                        formData.gender === 'male' && styles.genderButtonTextActive,
                      ]}
                    >
                      {t('male')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      formData.gender === 'female' && styles.genderButtonActive,
                      !editing && styles.buttonDisabled,
                    ]}
                    onPress={() => editing && setFormData({ ...formData, gender: 'female' })}
                    disabled={!editing}
                  >
                    <Text
                      style={[
                        styles.genderButtonText,
                        formData.gender === 'female' && styles.genderButtonTextActive,
                      ]}
                    >
                      {t('female')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Goals</Text>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Calorie Goal (kcal)</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={formData.daily_calorie_goal}
                onChangeText={(text) => setFormData({ ...formData, daily_calorie_goal: text })}
                keyboardType="numeric"
                editable={editing}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Water Goal (ml)</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={formData.water_goal}
                onChangeText={(text) => setFormData({ ...formData, water_goal: text })}
                keyboardType="numeric"
                editable={editing}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Step Goal</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputDisabled]}
                value={formData.step_goal}
                onChangeText={(text) => setFormData({ ...formData, step_goal: text })}
                keyboardType="numeric"
                editable={editing}
              />
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingItem} onPress={() => setShowLanguageModal(true)}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIconBg}>
                  <Ionicons name="language" size={22} color={Colors.white} />
                </View>
                <View>
                  <Text style={styles.settingText}>{t('languageSettings')}</Text>
                  <Text style={styles.settingSubtext}>{getCurrentLanguageInfo().flag} {getCurrentLanguageInfo().name}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={22} color={Colors.lightText} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Theme Selector */}
        <ThemeSelector />

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={24} color={Colors.white} />
          <Text style={styles.logoutButtonText}>{t('logout')}</Text>
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={24} color={Colors.error} />
          <Text style={styles.deleteAccountButtonText}>{t('deleteAccount') || 'Hesabı Sil'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal visible={showLanguageModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectLanguage')}</Text>
              <TouchableOpacity 
                onPress={() => setShowLanguageModal(false)} 
                style={styles.closeButton}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={28} color={Colors.darkText} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>{t('languageSettings')}</Text>
            
            <ScrollView style={styles.languageList} showsVerticalScrollIndicator={false}>
              {languageList.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageItem,
                    currentLang === lang.code && styles.languageItemActive
                  ]}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <View style={styles.languageTextContainer}>
                    <Text style={[
                      styles.languageName,
                      currentLang === lang.code && styles.languageNameActive
                    ]}>{lang.name}</Text>
                    <Text style={styles.languageNative}>{lang.nativeName}</Text>
                  </View>
                  {currentLang === lang.code && (
                    <View style={styles.checkCircle}>
                      <Ionicons name="checkmark" size={18} color={Colors.white} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  email: {
    fontSize: 14,
    color: Colors.lightText,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  editButton: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: Colors.darkText,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: Colors.primary,
  },
  genderButtonText: {
    fontSize: 14,
    color: Colors.primary,
  },
  genderButtonTextActive: {
    color: Colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    color: Colors.darkText,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
    color: Colors.lightText,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  logoutButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  deleteAccountButtonText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 20,
  },
  closeButton: {
    padding: 12,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageList: {
    maxHeight: 450,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageItemActive: {
    backgroundColor: Colors.primary + '12',
    borderColor: Colors.primary,
  },
  languageFlag: {
    fontSize: 36,
    marginRight: 16,
  },
  languageTextContainer: {
    flex: 1,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.darkText,
  },
  languageNative: {
    fontSize: 13,
    color: Colors.lightText,
    marginTop: 2,
  },
  languageNameActive: {
    color: Colors.primary,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingSubtext: {
    fontSize: 13,
    color: Colors.lightText,
    marginTop: 2,
  },
});
