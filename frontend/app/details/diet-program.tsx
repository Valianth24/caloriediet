import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

interface Meal {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DayProgram {
  day: number;
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snacks?: Meal[];
}

interface DietPlan {
  diet_id: string;
  name: string;
  description: string;
  target_calories: number;
  duration_days: number;
  days: DayProgram[];
}

export default function DietProgramScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const dietId = params.dietId as string;

  const [loading, setLoading] = useState(true);
  const [diet, setDiet] = useState<DietPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);

  const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

  useEffect(() => {
    fetchDietPlan();
  }, [dietId]);

  const fetchDietPlan = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('session_token');

      const response = await fetch(`${backendUrl}/api/diet/my-diets`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      const foundDiet = data.diets.find((d: DietPlan) => d.diet_id === dietId);

      if (foundDiet) {
        setDiet(foundDiet);
      }
    } catch (error) {
      console.error('Error fetching diet:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMeal = (label: string, meal: Meal, icon: string) => (
    <View style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <Text style={styles.mealIcon}>{icon}</Text>
        <View style={styles.mealHeaderText}>
          <Text style={styles.mealLabel}>{label}</Text>
          <Text style={styles.mealName}>{meal.name}</Text>
        </View>
        <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
      </View>
      <View style={styles.macrosRow}>
        <View style={styles.macroItem}>
          <Text style={styles.macroLabel}>Protein</Text>
          <Text style={styles.macroValue}>{meal.protein}g</Text>
        </View>
        <View style={styles.macroItem}>
          <Text style={styles.macroLabel}>Karb</Text>
          <Text style={styles.macroValue}>{meal.carbs}g</Text>
        </View>
        <View style={styles.macroItem}>
          <Text style={styles.macroLabel}>Yağ</Text>
          <Text style={styles.macroValue}>{meal.fat}g</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!diet) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('dietNotFound') || 'Diyet bulunamadı'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentDay = diet.days.find(d => d.day === selectedDay) || diet.days[0];
  const totalDailyCalories = currentDay.breakfast.calories + currentDay.lunch.calories + 
    currentDay.dinner.calories + (currentDay.snacks?.reduce((sum, s) => sum + s.calories, 0) || 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.darkText} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>{diet.name}</Text>
          <Text style={styles.subtitle}>{diet.target_calories} kcal/gün</Text>
        </View>
      </View>

      {/* Day Selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.daySelector}
        contentContainerStyle={styles.daySelectorContent}
      >
        {diet.days.map((day) => (
          <TouchableOpacity
            key={day.day}
            style={[
              styles.dayButton,
              selectedDay === day.day && styles.dayButtonActive
            ]}
            onPress={() => setSelectedDay(day.day)}
          >
            <Text style={[
              styles.dayButtonText,
              selectedDay === day.day && styles.dayButtonTextActive
            ]}>
              {t('day') || 'Gün'} {day.day}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Daily Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{t('dailyTotal') || 'Günlük Toplam'}</Text>
          <Text style={styles.summaryCalories}>{totalDailyCalories} kcal</Text>
        </View>

        {/* Meals */}
        {renderMeal(t('breakfast') || 'Kahvaltı', currentDay.breakfast, '🌅')}
        {renderMeal(t('lunch') || 'Öğle Yemeği', currentDay.lunch, '☀️')}
        {renderMeal(t('dinner') || 'Akşam Yemeği', currentDay.dinner, '🌙')}

        {currentDay.snacks && currentDay.snacks.length > 0 && (
          <View style={styles.snacksSection}>
            <Text style={styles.snacksTitle}>🍎 {t('snacks') || 'Atıştırmalıklar'}</Text>
            {currentDay.snacks.map((snack, index) => (
              <View key={index} style={styles.snackCard}>
                <Text style={styles.snackName}>{snack.name}</Text>
                <Text style={styles.snackCalories}>{snack.calories} kcal</Text>
              </View>
            ))}
          </View>
        )}
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
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.lightText,
    marginTop: 2,
  },
  daySelector: {
    maxHeight: 50,
    marginBottom: 10,
  },
  daySelectorContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  dayButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dayButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.darkText,
  },
  dayButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summaryCard: {
    backgroundColor: Colors.primary + '15',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 5,
  },
  summaryCalories: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  mealCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  mealHeaderText: {
    flex: 1,
  },
  mealLabel: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 2,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
  },
  mealCalories: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 4,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
  },
  snacksSection: {
    marginTop: 10,
  },
  snacksTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: 10,
  },
  snackCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  snackName: {
    fontSize: 14,
    color: Colors.darkText,
  },
  snackCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.lightText,
  },
});
