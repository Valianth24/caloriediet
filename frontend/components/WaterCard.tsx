import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/Colors';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { addWater } from '../utils/api';
import { useStore } from '../store/useStore';
import { useRouter } from 'expo-router';
import i18n from '../utils/i18n';

interface WaterCardProps {
  current: number;
  goal: number;
}

export default function WaterCard({ current, goal }: WaterCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { triggerRefresh } = useStore();
  const [loading, setLoading] = React.useState(false);

  // TR: 200ml, EN: 250ml per glass
  const glassSize = i18n.language === 'tr' ? 200 : 250;
  const glassCount = Math.floor(current / glassSize);
  const totalGlasses = Math.ceil(goal / glassSize);

  const handleAddWater = async (e: any) => {
    e?.stopPropagation?.();
    try {
      setLoading(true);
      await addWater(glassSize);
      triggerRefresh();
    } catch (error) {
      console.error('Error adding water:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => router.push('/details/water-detail')}
      activeOpacity={0.9}
    >
      <Text style={styles.title}>{t('waterTracking')}</Text>

      <View style={styles.glassContainer}>
        {[...Array(Math.min(4, totalGlasses))].map((_, index) => (
          <Ionicons
            key={index}
            name="water"
            size={28}
            color={index < glassCount ? Colors.teal : '#E0E0E0'}
          />
        ))}
      </View>

      <Text style={styles.amount} numberOfLines={1}>
        {glassCount} / {totalGlasses} {t('glass')}
      </Text>
      <Text style={styles.amountMl}>
        {(current / 1000).toFixed(1)} / {(goal / 1000).toFixed(1)} L
      </Text>

      <TouchableOpacity
        style={[styles.addButton, loading && styles.addButtonDisabled]}
        onPress={handleAddWater}
        disabled={loading}
      >
        <Ionicons name="add" size={16} color={Colors.white} />
        <Text style={styles.addButtonText}>{t('addGlass')}</Text>
      </TouchableOpacity>
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
    alignItems: 'center',
    minHeight: 220,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkText,
    alignSelf: 'flex-start',
  },
  glassContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 8,
  },
  amount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  amountMl: {
    fontSize: 12,
    color: Colors.lightText,
  },
  addButton: {
    backgroundColor: Colors.teal,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
});
