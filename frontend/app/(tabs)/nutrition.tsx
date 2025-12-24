import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTodayMeals } from '../../utils/api';
import { Colors } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store/useStore';

interface Meal {
  meal_id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image_base64: string;
  meal_type: string;
  timestamp: string;
}

export default function NutritionScreen() {
  const { t } = useTranslation();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { refreshData } = useStore();

  const loadMeals = async () => {
    try {
      const data = await getTodayMeals() as any[];
      setMeals(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading meals:', error);
      setMeals([]);
    }
  };

  useEffect(() => {
    loadMeals();
  }, [refreshData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMeals();
    setRefreshing(false);
  };

  const groupedMeals = meals.reduce((acc, meal) => {
    if (!acc[meal.meal_type]) {
      acc[meal.meal_type] = [];
    }
    acc[meal.meal_type].push(meal);
    return acc;
  }, {} as Record<string, Meal[]>);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        <Text style={styles.title}>{t('todaysMenu')}</Text>
        <Text style={styles.date}>{new Date().toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' })}</Text>

        {Object.keys(groupedMeals).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant" size={60} color={Colors.lightText} />
            <Text style={styles.emptyText}>{t('noMealsYet')}</Text>
            <Text style={styles.emptySubtext}>{t('trackYourMeals')}</Text>
          </View>
        ) : (
          <View style={styles.mealGroups}>
            {['breakfast', 'lunch', 'dinner', 'snack'].map((mealType) => {
              const typeMeals = groupedMeals[mealType];
              if (!typeMeals || typeMeals.length === 0) return null;

              return (
                <View key={mealType} style={styles.mealGroup}>
                  <Text style={styles.mealTypeTitle}>{t(mealType)}</Text>
                  {typeMeals.map((meal) => (
                    <View key={meal.meal_id} style={styles.mealCard}>
                      <Image source={{ uri: meal.image_base64 }} style={styles.mealImage} />
                      <View style={styles.mealInfo}>
                        <Text style={styles.mealName}>{meal.name}</Text>
                        <View style={styles.mealMacros}>
                          <View style={styles.macroTag}>
                            <Text style={styles.macroText}>{meal.calories} kcal</Text>
                          </View>
                          <View style={styles.macroTag}>
                            <Text style={styles.macroText}>P: {meal.protein}g</Text>
                          </View>
                          <View style={styles.macroTag}>
                            <Text style={styles.macroText}>C: {meal.carbs}g</Text>
                          </View>
                          <View style={styles.macroTag}>
                            <Text style={styles.macroText}>F: {meal.fat}g</Text>
                          </View>
                        </View>
                      </View>
                      <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
                    </View>
                  ))}
                </View>
              );
            })}
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
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.darkText,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.lightText,
    marginTop: 8,
  },
  mealGroups: {
    gap: 24,
  },
  mealGroup: {
    gap: 12,
  },
  mealTypeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  mealCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    gap: 12,
    alignItems: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mealImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  mealInfo: {
    flex: 1,
    gap: 8,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
  },
  mealMacros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  macroTag: {
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  macroText: {
    fontSize: 12,
    color: Colors.darkText,
  },
});
