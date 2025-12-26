import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addMeal } from '../../utils/api';
import { useStore } from '../../store/useStore';
import { Colors } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

export default function MealDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { triggerRefresh } = useStore();
  
  const baseName = params.name as string;
  const baseCalories = parseFloat(params.calories as string);
  const baseProtein = parseFloat(params.protein as string);
  const baseCarbs = parseFloat(params.carbs as string);
  const baseFat = parseFloat(params.fat as string);
  
  const [grams, setGrams] = useState('100');
  const [mealType, setMealType] = useState('lunch');
  const [loading, setLoading] = useState(false);

  const gramsNum = parseFloat(grams) || 100;
  const ratio = gramsNum / 100;

  const calculatedCalories = Math.round(baseCalories * ratio);
  const calculatedProtein = (baseProtein * ratio).toFixed(1);
  const calculatedCarbs = (baseCarbs * ratio).toFixed(1);
  const calculatedFat = (baseFat * ratio).toFixed(1);

  const handleAddMeal = async () => {
    try {
      setLoading(true);
      await addMeal({
        name: `${baseName} (${grams}g)`,
        calories: calculatedCalories,
        protein: parseFloat(calculatedProtein),
        carbs: parseFloat(calculatedCarbs),
        fat: parseFloat(calculatedFat),
        image_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        meal_type: mealType,
      });
      triggerRefresh();
      alert(t('mealAdded'));
      router.back();
    } catch (error) {
      console.error('Error adding meal:', error);
      alert(t('mealAddError'));
    } finally {
      setLoading(false);
    }
  };

  const quickGrams = [50, 100, 150, 200, 250, 300];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={28} color={Colors.darkText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{baseName}</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Food Icon */}
          <View style={styles.foodIcon}>
            <Ionicons name="restaurant" size={60} color={Colors.primary} />
          </View>

          {/* Gram Input */}
          <View style={styles.gramSection}>
            <Text style={styles.sectionTitle}>{t('amountGrams')}</Text>
            <TextInput
              style={styles.gramInput}
              value={grams}
              onChangeText={setGrams}
              keyboardType="numeric"
              placeholder="100"
            />
            
            {/* Quick Gram Buttons */}
            <View style={styles.quickGrams}>
              {quickGrams.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.quickGramButton,
                    grams === String(g) && styles.quickGramButtonActive,
                  ]}
                  onPress={() => setGrams(String(g))}
                >
                  <Text
                    style={[
                      styles.quickGramText,
                      grams === String(g) && styles.quickGramTextActive,
                    ]}
                  >
                    {g}g
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Calculated Values */}
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>{t('nutritionValues')} ({gramsNum}g)</Text>
            
            <View style={styles.calorieDisplay}>
              <Text style={styles.calorieValue}>{calculatedCalories}</Text>
              <Text style={styles.calorieLabel}>{t('kcal')}</Text>
            </View>

            <View style={styles.macroGrid}>
              <View style={styles.macroCard}>
                <Ionicons name="leaf" size={24} color={Colors.success} />
                <Text style={styles.macroValue}>{calculatedProtein}g</Text>
                <Text style={styles.macroLabel}>{t('protein')}</Text>
              </View>
              <View style={styles.macroCard}>
                <Ionicons name="fast-food" size={24} color={Colors.warning} />
                <Text style={styles.macroValue}>{calculatedCarbs}g</Text>
                <Text style={styles.macroLabel}>{t('carbohydrate')}</Text>
              </View>
              <View style={styles.macroCard}>
                <Ionicons name="water" size={24} color={Colors.orange} />
                <Text style={styles.macroValue}>{calculatedFat}g</Text>
                <Text style={styles.macroLabel}>{t('fat')}</Text>
              </View>
            </View>
          </View>

          {/* Meal Type Selection */}
          <View style={styles.mealTypeSection}>
            <Text style={styles.sectionTitle}>{t('selectMeal')}</Text>
            <View style={styles.mealTypeRow}>
              {[
                { key: 'breakfast', icon: 'sunny', label: t('breakfast') },
                { key: 'lunch', icon: 'restaurant', label: t('lunch') },
                { key: 'dinner', icon: 'moon', label: t('dinner') },
                { key: 'snack', icon: 'cafe', label: t('snack') },
              ].map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.mealTypeCard,
                    mealType === type.key && styles.mealTypeCardActive,
                  ]}
                  onPress={() => setMealType(type.key)}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={24}
                    color={mealType === type.key ? Colors.white : Colors.primary}
                  />
                  <Text
                    style={[
                      styles.mealTypeLabel,
                      mealType === type.key && styles.mealTypeLabelActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Add Button */}
          <TouchableOpacity
            style={[styles.addButton, loading && styles.addButtonDisabled]}
            onPress={handleAddMeal}
            disabled={loading}
          >
            <Ionicons name="add-circle" size={24} color={Colors.white} />
            <Text style={styles.addButtonText}>{t('addToMealBtn')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    padding: 12,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  foodIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  gramSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: 12,
  },
  gramInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 20,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: Colors.darkText,
    marginBottom: 16,
  },
  quickGrams: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickGramButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  quickGramButtonActive: {
    backgroundColor: Colors.primary,
  },
  quickGramText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  quickGramTextActive: {
    color: Colors.white,
  },
  resultsCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: 16,
    textAlign: 'center',
  },
  calorieDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  calorieValue: {
    fontSize: 56,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  calorieLabel: {
    fontSize: 16,
    color: Colors.lightText,
    marginTop: 4,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  macroCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginTop: 8,
  },
  macroLabel: {
    fontSize: 11,
    color: Colors.lightText,
    marginTop: 4,
  },
  mealTypeSection: {
    marginBottom: 24,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  mealTypeCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mealTypeCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  mealTypeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.darkText,
    marginTop: 4,
  },
  mealTypeLabelActive: {
    color: Colors.white,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
