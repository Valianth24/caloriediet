import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/Colors';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';

interface CalorieCardProps {
  current: number;
  goal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function CalorieCard({ current, goal, protein, carbs, fat }: CalorieCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const remaining = Math.max(goal - current, 0);

  // Daha küçük radius - mobil uyumlu
  const radius = 45;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => router.push('/details/meals')}
      activeOpacity={0.9}
    >
      <Text style={styles.title} numberOfLines={1}>{t('dailyCalories')}</Text>

      <View style={styles.progressContainer}>
        <Svg width={radius * 2 + strokeWidth} height={radius * 2 + strokeWidth}>
          <Circle
            cx={radius + strokeWidth / 2}
            cy={radius + strokeWidth / 2}
            r={radius}
            stroke="#E0E0E0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={radius + strokeWidth / 2}
            cy={radius + strokeWidth / 2}
            r={radius}
            stroke={Colors.primary}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${radius + strokeWidth / 2} ${radius + strokeWidth / 2})`}
          />
        </Svg>
        <View style={styles.progressText}>
          <Text style={styles.currentCalories}>{current}</Text>
          <Text style={styles.goalCalories}>/ {goal}</Text>
        </View>
      </View>

      <View style={styles.macros}>
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{protein}g</Text>
          <Text style={styles.macroLabel}>P</Text>
        </View>
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{carbs}g</Text>
          <Text style={styles.macroLabel}>C</Text>
        </View>
        <View style={styles.macroItem}>
          <Text style={styles.macroValue}>{fat}g</Text>
          <Text style={styles.macroLabel}>F</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 220,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  progressText: {
    position: 'absolute',
    alignItems: 'center',
  },
  currentCalories: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  goalCalories: {
    fontSize: 11,
    color: Colors.lightText,
  },
  macros: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 14,
    color: Colors.darkText,
    fontWeight: '600',
  },
  macroLabel: {
    fontSize: 11,
    color: Colors.lightText,
  },
});
