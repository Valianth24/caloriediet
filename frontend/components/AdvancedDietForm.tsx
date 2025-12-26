import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

interface AdvancedDietFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (dietData: any) => void;
}

export default function AdvancedDietForm({ visible, onClose, onSubmit }: AdvancedDietFormProps) {
  // Personal Info
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(70);
  const [age, setAge] = useState('25');
  const [gender, setGender] = useState<'male' | 'female'>('male');

  // Goal
  const [goal, setGoal] = useState<'lose' | 'gain' | 'maintain' | 'muscle'>('lose');

  // Activity Level
  const [activityLevel, setActivityLevel] = useState<'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'>('moderate');

  // Diet Preference
  const [dietType, setDietType] = useState<'balanced' | 'low_carb' | 'high_protein' | 'vegetarian' | 'vegan' | 'keto'>('balanced');

  // Restrictions
  const [restrictions, setRestrictions] = useState('');

  // Meals per day
  const [mealsPerDay, setMealsPerDay] = useState(3);

  // Diet name
  const [dietName, setDietName] = useState('');

  // Calculate BMR using Mifflin-St Jeor Equation
  const calculateBMR = () => {
    const ageNum = parseInt(age) || 25;
    if (gender === 'male') {
      return (10 * weight) + (6.25 * height) - (5 * ageNum) + 5;
    } else {
      return (10 * weight) + (6.25 * height) - (5 * ageNum) - 161;
    }
  };

  // Calculate TDEE (Total Daily Energy Expenditure)
  const calculateTDEE = () => {
    const bmr = calculateBMR();
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    return bmr * activityMultipliers[activityLevel];
  };

  // Calculate target calories based on goal
  const calculateTargetCalories = () => {
    const tdee = calculateTDEE();
    const goalAdjustments = {
      lose: -500,
      gain: 500,
      maintain: 0,
      muscle: 300,
    };
    return Math.round(tdee + goalAdjustments[goal]);
  };

  // Get macro distribution based on diet type
  const getMacroDistribution = () => {
    const distributions = {
      balanced: { protein: 30, carbs: 40, fat: 30 },
      low_carb: { protein: 40, carbs: 20, fat: 40 },
      high_protein: { protein: 50, carbs: 30, fat: 20 },
      vegetarian: { protein: 25, carbs: 45, fat: 30 },
      vegan: { protein: 20, carbs: 50, fat: 30 },
      keto: { protein: 25, carbs: 5, fat: 70 },
    };
    return distributions[dietType];
  };

  const handleSubmit = () => {
    if (!dietName.trim()) {
      alert('Lütfen diyet adı girin');
      return;
    }

    const targetCalories = calculateTargetCalories();
    const macros = getMacroDistribution();

    const dietData = {
      name: dietName,
      personalInfo: {
        height,
        weight,
        age: parseInt(age),
        gender,
      },
      goal,
      activityLevel,
      dietType,
      restrictions,
      mealsPerDay,
      targetCalories,
      macros,
      bmr: Math.round(calculateBMR()),
      tdee: Math.round(calculateTDEE()),
    };

    onSubmit(dietData);
  };

  const goalOptions = [
    { key: 'lose', icon: 'trending-down', label: 'Kilo Vermek', desc: '-500 kcal' },
    { key: 'gain', icon: 'trending-up', label: 'Kilo Almak', desc: '+500 kcal' },
    { key: 'maintain', icon: 'remove', label: 'Korumak', desc: '±0 kcal' },
    { key: 'muscle', icon: 'fitness', label: 'Kas Yapmak', desc: '+300 kcal' },
  ];

  const activityOptions = [
    { key: 'sedentary', label: 'Hareketsiz', desc: 'Ofis işi, az hareket' },
    { key: 'light', label: 'Az Hareketli', desc: 'Haftada 1-3 gün egzersiz' },
    { key: 'moderate', label: 'Orta', desc: 'Haftada 3-5 gün egzersiz' },
    { key: 'active', label: 'Aktif', desc: 'Haftada 6-7 gün egzersiz' },
    { key: 'very_active', label: 'Çok Aktif', desc: 'Günde 2 kez egzersiz' },
  ];

  const dietTypeOptions = [
    { key: 'balanced', label: 'Dengeli', desc: 'P:30% K:40% Y:30%' },
    { key: 'low_carb', label: 'Düşük Karb', desc: 'P:40% K:20% Y:40%' },
    { key: 'high_protein', label: 'Yüksek Protein', desc: 'P:50% K:30% Y:20%' },
    { key: 'vegetarian', label: 'Vejetaryen', desc: 'Bitkisel ağırlıklı' },
    { key: 'vegan', label: 'Vegan', desc: 'Sadece bitkisel' },
    { key: 'keto', label: 'Keto', desc: 'P:25% K:5% Y:70%' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Kişisel Diyet Oluştur</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={Colors.darkText} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Diet Name */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Diyet Adı</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: Yaz Diyetim"
                value={dietName}
                onChangeText={setDietName}
              />
            </View>

            {/* Personal Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 Kişisel Bilgiler</Text>
              
              {/* Gender */}
              <Text style={styles.label}>Cinsiyet</Text>
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={[styles.optionButton, gender === 'male' && styles.optionButtonActive]}
                  onPress={() => setGender('male')}
                >
                  <Ionicons name="male" size={24} color={gender === 'male' ? Colors.white : Colors.primary} />
                  <Text style={[styles.optionText, gender === 'male' && styles.optionTextActive]}>Erkek</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, gender === 'female' && styles.optionButtonActive]}
                  onPress={() => setGender('female')}
                >
                  <Ionicons name="female" size={24} color={gender === 'female' ? Colors.white : Colors.primary} />
                  <Text style={[styles.optionText, gender === 'female' && styles.optionTextActive]}>Kadın</Text>
                </TouchableOpacity>
              </View>

              {/* Height */}
              <Text style={styles.label}>Boy: {height} cm</Text>
              <Slider
                style={styles.slider}
                minimumValue={140}
                maximumValue={220}
                value={height}
                onValueChange={setHeight}
                minimumTrackTintColor={Colors.primary}
                maximumTrackTintColor="#E0E0E0"
                thumbTintColor={Colors.primary}
                step={1}
              />

              {/* Weight */}
              <Text style={styles.label}>Kilo: {weight} kg</Text>
              <Slider
                style={styles.slider}
                minimumValue={40}
                maximumValue={150}
                value={weight}
                onValueChange={setWeight}
                minimumTrackTintColor={Colors.primary}
                maximumTrackTintColor="#E0E0E0"
                thumbTintColor={Colors.primary}
                step={1}
              />

              {/* Age */}
              <Text style={styles.label}>Yaş</Text>
              <TextInput
                style={styles.input}
                placeholder="Yaşınız"
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
              />
            </View>

            {/* Goal */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎯 Hedefiniz</Text>
              <View style={styles.gridOptions}>
                {goalOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.gridOption, goal === option.key && styles.gridOptionActive]}
                    onPress={() => setGoal(option.key as any)}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={28}
                      color={goal === option.key ? Colors.white : Colors.primary}
                    />
                    <Text style={[styles.gridOptionLabel, goal === option.key && styles.gridOptionLabelActive]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.gridOptionDesc, goal === option.key && styles.gridOptionDescActive]}>
                      {option.desc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Activity Level */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏃 Aktivite Seviyeniz</Text>
              {activityOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.listOption, activityLevel === option.key && styles.listOptionActive]}
                  onPress={() => setActivityLevel(option.key as any)}
                >
                  <View style={styles.radioOuter}>
                    {activityLevel === option.key && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.listOptionText}>
                    <Text style={[styles.listOptionLabel, activityLevel === option.key && styles.listOptionLabelActive]}>
                      {option.label}
                    </Text>
                    <Text style={styles.listOptionDesc}>{option.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Diet Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🥗 Diyet Tercihiniz</Text>
              <View style={styles.gridOptions}>
                {dietTypeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.gridOption, dietType === option.key && styles.gridOptionActive]}
                    onPress={() => setDietType(option.key as any)}
                  >
                    <Text style={[styles.gridOptionLabel, dietType === option.key && styles.gridOptionLabelActive]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.gridOptionDesc, dietType === option.key && styles.gridOptionDescActive]}>
                      {option.desc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Meals Per Day */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⏰ Günlük Öğün Sayısı</Text>
              <View style={styles.optionsRow}>
                {[3, 4, 5, 6].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[styles.mealButton, mealsPerDay === num && styles.mealButtonActive]}
                    onPress={() => setMealsPerDay(num)}
                  >
                    <Text style={[styles.mealButtonText, mealsPerDay === num && styles.mealButtonTextActive]}>
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Restrictions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🚫 Alerji & Kısıtlamalar</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Örn: Fıstık alerjim var, laktozsuz"
                value={restrictions}
                onChangeText={setRestrictions}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Hesaplanan Değerler</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Bazal Metabolizma (BMR):</Text>
                <Text style={styles.summaryValue}>{Math.round(calculateBMR())} kcal</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Günlük Harcama (TDEE):</Text>
                <Text style={styles.summaryValue}>{Math.round(calculateTDEE())} kcal</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Hedef Kalori:</Text>
                <Text style={[styles.summaryValue, styles.summaryValueHighlight]}>
                  {calculateTargetCalories()} kcal
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Makro Dağılımı:</Text>
                <Text style={styles.summaryValue}>
                  P:{getMacroDistribution().protein}% K:{getMacroDistribution().carbs}% Y:{getMacroDistribution().fat}%
                </Text>
              </View>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.white} />
              <Text style={styles.submitButtonText}>Diyeti Oluştur</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
  },
  optionTextActive: {
    color: Colors.white,
  },
  gridOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridOption: {
    width: '47%',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gridOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  gridOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkText,
    marginTop: 8,
  },
  gridOptionLabelActive: {
    color: Colors.white,
  },
  gridOptionDesc: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 4,
  },
  gridOptionDescActive: {
    color: Colors.white + 'CC',
  },
  listOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  listOptionActive: {
    backgroundColor: Colors.primary + '20',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  listOptionText: {
    flex: 1,
  },
  listOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
  },
  listOptionLabelActive: {
    color: Colors.primary,
  },
  listOptionDesc: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 2,
  },
  mealButton: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mealButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  mealButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  mealButtonTextActive: {
    color: Colors.white,
  },
  summaryCard: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.darkText,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkText,
  },
  summaryValueHighlight: {
    fontSize: 18,
    color: Colors.primary,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
