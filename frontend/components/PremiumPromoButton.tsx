import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

interface PremiumPromoButtonProps {
  onPress: () => void;
}

export default function PremiumPromoButton({ onPress }: PremiumPromoButtonProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.iconContainer}>
        <Ionicons name="diamond" size={16} color={Colors.warning} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Premium</Text>
        <Text style={styles.subtitle}>%37 İNDİRİM</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    gap: 2,
  },
  title: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  subtitle: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.warning,
  },
});
