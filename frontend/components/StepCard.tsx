import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/Colors';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface StepCardProps {
  current: number;
  goal: number;
}

export default function StepCard({ current, goal }: StepCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => router.push('/details/steps')}
      activeOpacity={0.9}
    >
      <Text style={styles.title} numberOfLines={1}>{t('stepCounter')}</Text>

      <View style={styles.content}>
        <Ionicons name="footsteps" size={32} color={Colors.primary} />
        <View style={styles.stepsContainer}>
          <Text style={styles.steps}>{current.toLocaleString()}</Text>
          <Text style={styles.goal}>/ {goal.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${percentage}%` }]} />
      </View>

      <View style={styles.source}>
        <Ionicons name="logo-google" size={14} color={Colors.primary} />
        <Text style={styles.sourceText}>Google Fit</Text>
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  stepsContainer: {
    flex: 1,
  },
  steps: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  goal: {
    fontSize: 12,
    color: Colors.lightText,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sourceText: {
    fontSize: 11,
    color: Colors.lightText,
  },
});
