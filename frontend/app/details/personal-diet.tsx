import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export default function PersonalDietScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    target_calories: '2000',
    goal: 'balanced',
    duration_days: '30',
    preferences: [] as string[],
    restrictions: [] as string[]
  });

  const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

  const goals = [
    { id: 'weight_loss', name: t('weightLoss') || 'Kilo Verme', icon: '📉' },
    { id: 'muscle_gain', name: t('muscleGain') || 'Kas Yapma', icon: '💪' },
    { id: 'balanced', name: t('balanced') || 'Dengeli', icon: '⚖️' },
    { id: 'maintenance', name: t('maintenance') || 'Koruma', icon: '🎯' }
  ];

  const preferenceOptions = [
    'Türk Mutfağı', 'Akdeniz Mutfağı', 'Vejeteryan', 'Protein Ağırlıklı',
    'Düşük Karbonhidrat', 'Yüksek Protein', 'Gluten-Free', 'Dairy-Free'
  ];

  const restrictionOptions = [
    'Laktozsuz', 'Glutensiz', 'Şekersiz', 'Kırmızı Et Yok',
    'Deniz Ürünleri Yok', 'Fındık Alerjisi', 'Yumurta Alerjisi'
  ];

  const togglePreference = (pref: string) => {
    setFormData(prev => ({
      ...prev,
      preferences: prev.preferences.includes(pref)
        ? prev.preferences.filter(p => p !== pref)
        : [...prev.preferences, pref]
    }));
  };

  const toggleRestriction = (rest: string) => {
    setFormData(prev => ({
      ...prev,
      restrictions: prev.restrictions.includes(rest)
        ? prev.restrictions.filter(r => r !== rest)
        : [...prev.restrictions, rest]
    }));
  };

  const handleGenerate = async () => {
    if (!formData.name.trim()) {
      Alert.alert(t('error') || 'Hata', t('pleaseEnterDietName') || 'Lütfen diyet adı girin');
      return;
    }

    const calories = parseInt(formData.target_calories);
    if (isNaN(calories) || calories < 1000 || calories > 5000) {
      Alert.alert(t('error') || 'Hata', t('caloriesRange') || 'Kalori 1000-5000 arasında olmalı');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('session_token');

      const response = await fetch(`${backendUrl}/api/diet/generate-personal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          target_calories: calories,
          goal: formData.goal,
          duration_days: parseInt(formData.duration_days),
          preferences: formData.preferences,
          restrictions: formData.restrictions
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to generate diet');
      }

      Alert.alert(
        t('success') || 'Başarılı',
        t('dietCreatedSuccessfully') || 'Diyet başarıyla oluşturuldu!',
        [
          {
            text: t('viewDiet') || 'Görüntüle',
            onPress: () => {
              router.push({
                pathname: '/details/diet-program',
                params: { dietId: data.diet.diet_id }
              });
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('Diet generation error:', error);
      Alert.alert(
        t('error') || 'Hata',
        error.message || t('dietGenerationFailed') || 'Diyet oluşturulamadı'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('createPersonalDiet') || 'Kişisel Diyet Oluştur'}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Diet Name */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('dietName') || 'Diyet Adı'}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('enterDietName') || 'Örn: Kişisel Kilo Verme Programım'}
            placeholderTextColor={Colors.lightText}
            value={formData.name}
            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
          />
        </View>

        {/* Target Calories */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('targetCalories') || 'Hedef Kalori (günlük)'}</Text>
          <TextInput
            style={styles.input}
            placeholder="2000"
            placeholderTextColor={Colors.lightText}
            keyboardType="numeric"
            value={formData.target_calories}
            onChangeText={(text) => setFormData(prev => ({ ...prev, target_calories: text }))}
          />
        </View>

        {/* Goal Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('goal') || 'Hedef'}</Text>
          <View style={styles.goalsGrid}>
            {goals.map((goal) => (
              <TouchableOpacity
                key={goal.id}
                style={[
                  styles.goalCard,
                  formData.goal === goal.id && styles.goalCardActive
                ]}
                onPress={() => setFormData(prev => ({ ...prev, goal: goal.id }))}
              >
                <Text style={styles.goalIcon}>{goal.icon}</Text>
                <Text style={[
                  styles.goalText,
                  formData.goal === goal.id && styles.goalTextActive
                ]}>
                  {goal.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Duration */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('duration') || 'Süre (Gün)'}</Text>
          <View style={styles.durationButtons}>
            {['7', '14', '30'].map((days) => (
              <TouchableOpacity
                key={days}
                style={[
                  styles.durationButton,
                  formData.duration_days === days && styles.durationButtonActive
                ]}
                onPress={() => setFormData(prev => ({ ...prev, duration_days: days }))}
              >
                <Text style={[
                  styles.durationText,
                  formData.duration_days === days && styles.durationTextActive
                ]}>
                  {days} {t('days') || 'gün'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('preferences') || 'Tercihler'}</Text>
          <View style={styles.chipsContainer}>
            {preferenceOptions.map((pref) => (
              <TouchableOpacity
                key={pref}
                style={[
                  styles.chip,
                  formData.preferences.includes(pref) && styles.chipActive
                ]}
                onPress={() => togglePreference(pref)}
              >
                <Text style={[
                  styles.chipText,
                  formData.preferences.includes(pref) && styles.chipTextActive
                ]}>
                  {pref}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Restrictions */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('restrictions') || 'Kısıtlamalar'}</Text>
          <View style={styles.chipsContainer}>
            {restrictionOptions.map((rest) => (
              <TouchableOpacity
                key={rest}
                style={[
                  styles.chip,
                  formData.restrictions.includes(rest) && styles.chipActive
                ]}
                onPress={() => toggleRestriction(rest)}
              >
                <Text style={[
                  styles.chipText,
                  formData.restrictions.includes(rest) && styles.chipTextActive
                ]}>
                  {rest}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity
          style={[styles.generateButton, loading && styles.generateButtonDisabled]}
          onPress={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.generateButtonText}>
                {t('generateDiet') || 'AI ile Diyet Oluştur'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.premiumNote}>
          💎 {t('premiumFeature') || 'Premium Özellik'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: 10,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: Colors.darkText,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  goalCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  goalCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  goalIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  goalText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.darkText,
  },
  goalTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  durationButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  durationButton: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  durationButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.darkText,
  },
  durationTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: Colors.darkText,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  generateButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  premiumNote: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.lightText,
    marginTop: 10,
    marginBottom: 30,
  },
});
