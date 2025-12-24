import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTodayMeals, getDailySummary } from '../../utils/api';
import { Colors } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useStore } from '../../store/useStore';

interface Meal {
  meal_id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal_type: string;
  image_base64?: string;
  created_at: string;
}

export default function MealsDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, refreshData } = useStore();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [summary, setSummary] = useState({ total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [refreshData]);

  const loadData = async () => {
    try {
      const [mealsData, summaryData] = await Promise.all([
        getTodayMeals(),
        getDailySummary()
      ]);
      setMeals(Array.isArray(mealsData) ? mealsData as any[] : []);
      if (summaryData && typeof summaryData === 'object') {
        setSummary(summaryData as any);
      }
    } catch (error) {
      console.error('Error loading meals:', error);
      setMeals([]);
    } finally {
      setLoading(false);
    }
  };

  const getMealsByType = (type: string) => meals.filter(m => m.meal_type === type);
  const getMealTypeIcon = (type: string) => {
    switch (type) {
      case 'breakfast': return '🌅';
      case 'lunch': return '🌞';
      case 'dinner': return '🌙';
      case 'snack': return '☕';
      default: return '🍽️';
    }
  };

  const getMealTypeCalories = (type: string) => {
    return getMealsByType(type).reduce((sum, m) => sum + m.calories, 0);
  };

  const calorieGoal = user?.daily_calorie_goal || 2000;
  const percentage = Math.round((summary.total_calories / calorieGoal) * 100);

  const mealTypes = [
    { key: 'breakfast', label: t('breakfast') },
    { key: 'lunch', label: t('lunch') },
    { key: 'dinner', label: t('dinner') },
    { key: 'snack', label: t('snack') },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('todaysMeals')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summaryTitle}>{t('totalCalories')}</Text>
              <Text style={styles.summaryValue}>
                {summary.total_calories} / {calorieGoal} {t('kcal')}
              </Text>
            </View>
            <View style={styles.percentageCircle}>
              <Text style={styles.percentageText}>{percentage}%</Text>
            </View>
          </View>

          <View style={styles.macrosRow}>
            <View style={styles.macroItem}>
              <View style={[styles.macroIndicator, { backgroundColor: '#FF6B6B' }]} />
              <Text style={styles.macroLabel}>{t('protein')}</Text>
              <Text style={styles.macroValue}>{summary.total_protein.toFixed(1)}g</Text>
            </View>
            <View style={styles.macroItem}>
              <View style={[styles.macroIndicator, { backgroundColor: '#4ECDC4' }]} />
              <Text style={styles.macroLabel}>{t('carbs')}</Text>
              <Text style={styles.macroValue}>{summary.total_carbs.toFixed(1)}g</Text>
            </View>
            <View style={styles.macroItem}>
              <View style={[styles.macroIndicator, { backgroundColor: '#FFE66D' }]} />
              <Text style={styles.macroLabel}>{t('fat')}</Text>
              <Text style={styles.macroValue}>{summary.total_fat.toFixed(1)}g</Text>
            </View>
          </View>
        </View>

        {/* Meal Sections */}
        {mealTypes.map(({ key, label }) => {
          const typeMeals = getMealsByType(key);
          const typeCalories = getMealTypeCalories(key);
          
          return (
            <View key={key} style={styles.mealSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionLeft}>
                  <Text style={styles.mealTypeIcon}>{getMealTypeIcon(key)}</Text>
                  <Text style={styles.sectionTitle}>{label}</Text>
                </View>
                <Text style={styles.sectionCalories}>{typeCalories} {t('kcal')}</Text>
              </View>

              {typeMeals.length === 0 ? (
                <View style={styles.emptyMeal}>
                  <Ionicons name="restaurant-outline" size={24} color={Colors.lightText} />
                  <Text style={styles.emptyText}>{t('noMealsYet')}</Text>
                </View>
              ) : (
                typeMeals.map(meal => (
                  <View key={meal.meal_id} style={styles.mealItem}>
                    {meal.image_base64 ? (
                      <Image source={{ uri: meal.image_base64 }} style={styles.mealImage} />
                    ) : (
                      <View style={[styles.mealImage, styles.mealImagePlaceholder]}>
                        <Ionicons name="fast-food" size={24} color={Colors.lightText} />
                      </View>
                    )}
                    <View style={styles.mealInfo}>
                      <Text style={styles.mealName} numberOfLines={1}>{meal.name}</Text>
                      <Text style={styles.mealMacros}>
                        P: {meal.protein.toFixed(1)}g • K: {meal.carbs.toFixed(1)}g • Y: {meal.fat.toFixed(1)}g
                      </Text>
                    </View>
                    <View style={styles.mealCalories}>
                      <Text style={styles.mealCaloriesValue}>{meal.calories}</Text>
                      <Text style={styles.mealCaloriesUnit}>{t('kcal')}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          );
        })}

        <View style={{ height: 100 }} />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 14,
    color: Colors.lightText,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginTop: 4,
  },
  percentageCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  macroLabel: {
    fontSize: 12,
    color: Colors.lightText,
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
    marginTop: 2,
  },
  mealSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealTypeIcon: {
    fontSize: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  sectionCalories: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  emptyMeal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.lightText,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  mealImage: {
    width: 50,
    height: 50,
    borderRadius: 12,
    marginRight: 12,
  },
  mealImagePlaceholder: {
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: 4,
  },
  mealMacros: {
    fontSize: 12,
    color: Colors.lightText,
  },
  mealCalories: {
    alignItems: 'flex-end',
  },
  mealCaloriesValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  mealCaloriesUnit: {
    fontSize: 10,
    color: Colors.lightText,
  },
});
