import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PremiumAgePickerProps {
  minAge?: number;
  maxAge?: number;
  initialAge?: number;
  onAgeChange: (age: number) => void;
  primaryColor?: string;
}

export default function PremiumAgePicker({
  minAge = 10,
  maxAge = 100,
  initialAge = 25,
  onAgeChange,
  primaryColor = Colors.primary,
}: PremiumAgePickerProps) {
  const { t } = useTranslation();
  const [selectedAge, setSelectedAge] = useState(initialAge);
  const rotationValue = useRef(new Animated.Value(0)).current;
  const lastAge = useRef(initialAge);
  const lastHapticAge = useRef(initialAge);

  const DEGREES_PER_AGE = 4;
  const totalAges = maxAge - minAge + 1;

  // Glow animation
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Pulse animation for selected value
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Initialize rotation
  useEffect(() => {
    const initialRotation = (initialAge - minAge) * DEGREES_PER_AGE;
    rotationValue.setValue(-initialRotation);
  }, []);

  const triggerHaptic = useCallback(async (age: number) => {
    if (age !== lastHapticAge.current) {
      lastHapticAge.current = age;
      if (age % 10 === 0) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else if (age % 5 === 0) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        await Haptics.selectionAsync();
      }
    }
  }, []);

  const updateAge = useCallback((rotation: number) => {
    const ageOffset = Math.round(-rotation / DEGREES_PER_AGE);
    const newAge = Math.max(minAge, Math.min(maxAge, minAge + ageOffset));

    if (newAge !== lastAge.current) {
      lastAge.current = newAge;
      setSelectedAge(newAge);
      onAgeChange(newAge);
      triggerHaptic(newAge);
    }
  }, [minAge, maxAge, onAgeChange, triggerHaptic]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        rotationValue.stopAnimation();
        rotationValue.setOffset((rotationValue as any)._value);
        rotationValue.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const rotation = gestureState.dx * 0.5;
        rotationValue.setValue(rotation);
        const currentRotation = (rotationValue as any)._offset + rotation;
        updateAge(currentRotation);
      },
      onPanResponderRelease: (_, gestureState) => {
        rotationValue.flattenOffset();

        const currentRotation = (rotationValue as any)._value;
        const ageOffset = Math.round(-currentRotation / DEGREES_PER_AGE);
        const clampedAge = Math.max(minAge, Math.min(maxAge, minAge + ageOffset));
        const targetRotation = -(clampedAge - minAge) * DEGREES_PER_AGE;

        Animated.spring(rotationValue, {
          toValue: targetRotation,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }).start();

        setSelectedAge(clampedAge);
        onAgeChange(clampedAge);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
    })
  ).current;

  const selectAge = async (age: number) => {
    const targetRotation = -(age - minAge) * DEGREES_PER_AGE;

    Animated.spring(rotationValue, {
      toValue: targetRotation,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();

    setSelectedAge(age);
    onAgeChange(age);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const quickAdjust = async (amount: number) => {
    const newAge = Math.max(minAge, Math.min(maxAge, selectedAge + amount));
    await selectAge(newAge);
  };

  // Get age category
  const getAgeCategory = (age: number) => {
    if (age < 18) return { label: t('teenager') || 'Genç', emoji: '🧒', color: '#4CAF50' };
    if (age < 30) return { label: t('youngAdult') || 'Genç Yetişkin', emoji: '🧑', color: '#2196F3' };
    if (age < 45) return { label: t('adult') || 'Yetişkin', emoji: '👨', color: '#9C27B0' };
    if (age < 60) return { label: t('middleAge') || 'Orta Yaş', emoji: '👨‍🦳', color: '#FF9800' };
    return { label: t('senior') || 'Yaşlı', emoji: '👴', color: '#795548' };
  };

  const ageCategory = getAgeCategory(selectedAge);

  // Render dial marks
  const renderDialMarks = () => {
    const marks = [];
    for (let i = 0; i < totalAges; i++) {
      const age = minAge + i;
      const angle = i * DEGREES_PER_AGE;
      const isMultipleOf10 = age % 10 === 0;
      const isMultipleOf5 = age % 5 === 0;

      marks.push(
        <Animated.View
          key={age}
          style={[
            styles.dialMark,
            {
              transform: [
                {
                  rotate: rotationValue.interpolate({
                    inputRange: [-360, 360],
                    outputRange: [`${angle - 360}deg`, `${angle + 360}deg`],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.markLine,
              isMultipleOf10 && [styles.markLineLong, { backgroundColor: primaryColor }],
              isMultipleOf5 && !isMultipleOf10 && styles.markLineMedium,
            ]}
          />
          {isMultipleOf10 && (
            <Animated.Text
              style={[
                styles.markLabel,
                { color: primaryColor },
                {
                  transform: [
                    {
                      rotate: rotationValue.interpolate({
                        inputRange: [-360, 360],
                        outputRange: [`${-angle + 360}deg`, `${-angle - 360}deg`],
                      }),
                    },
                  ],
                },
              ]}
            >
              {age}
            </Animated.Text>
          )}
        </Animated.View>
      );
    }
    return marks;
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <View style={styles.wrapper}>
      {/* Premium Value Display */}
      <Animated.View style={[styles.valueDisplayWrapper, { transform: [{ scale: pulseAnim }] }]}>
        <Animated.View
          style={[
            styles.glowEffect,
            {
              opacity: glowOpacity,
              shadowColor: primaryColor,
            },
          ]}
        />
        <LinearGradient
          colors={[primaryColor, adjustColor(primaryColor, -40)]}
          style={styles.valueGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.emojiContainer}>
            <Text style={styles.emojiText}>{ageCategory.emoji}</Text>
          </View>
          <View style={styles.valueContent}>
            <Text style={styles.valueText}>{selectedAge}</Text>
            <Text style={styles.unitText}>{t('age') || 'yaş'}</Text>
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: ageCategory.color }]}>
            <Text style={styles.categoryText}>{ageCategory.label}</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Circular Dial */}
      <View style={styles.dialWrapper}>
        <View style={[styles.dialContainer, { borderColor: primaryColor + '30' }]}>
          <Animated.View style={styles.dialContent} {...panResponder.panHandlers}>
            {renderDialMarks()}
          </Animated.View>

          {/* Center indicator */}
          <View style={styles.centerIndicator} pointerEvents="none">
            <View style={[styles.indicatorArrow, { borderBottomColor: primaryColor }]} />
            <View style={[styles.indicatorDot, { backgroundColor: primaryColor }]} />
          </View>

          {/* Inner circle */}
          <View style={[styles.innerCircle, { borderColor: primaryColor + '20' }]}>
            <Text style={styles.swipeHint}>↔ {t('swipe') || 'Kaydır'}</Text>
          </View>
        </View>
      </View>

      {/* Quick Adjust Buttons */}
      <View style={styles.quickButtonsContainer}>
        <View style={styles.quickButtonsRow}>
          <TouchableOpacity
            style={[styles.quickBtn, styles.quickBtnLarge, { borderColor: primaryColor }]}
            onPress={() => quickAdjust(-10)}
            activeOpacity={0.7}
          >
            <Text style={[styles.quickBtnText, { color: primaryColor }]}>-10</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { borderColor: primaryColor }]}
            onPress={() => quickAdjust(-5)}
            activeOpacity={0.7}
          >
            <Text style={[styles.quickBtnText, { color: primaryColor }]}>-5</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { borderColor: primaryColor }]}
            onPress={() => quickAdjust(-1)}
            activeOpacity={0.7}
          >
            <Text style={[styles.quickBtnText, { color: primaryColor }]}>-1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { borderColor: primaryColor }]}
            onPress={() => quickAdjust(1)}
            activeOpacity={0.7}
          >
            <Text style={[styles.quickBtnText, { color: primaryColor }]}>+1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { borderColor: primaryColor }]}
            onPress={() => quickAdjust(5)}
            activeOpacity={0.7}
          >
            <Text style={[styles.quickBtnText, { color: primaryColor }]}>+5</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, styles.quickBtnLarge, { borderColor: primaryColor }]}
            onPress={() => quickAdjust(10)}
            activeOpacity={0.7}
          >
            <Text style={[styles.quickBtnText, { color: primaryColor }]}>+10</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Age Selection */}
      <View style={styles.quickAgesContainer}>
        <Text style={styles.quickAgesTitle}>{t('quickSelect') || 'Hızlı Seçim'}</Text>
        <View style={styles.quickAgesRow}>
          {[18, 25, 30, 35, 40, 50, 60].map((age) => (
            <TouchableOpacity
              key={age}
              style={[
                styles.quickAgeBtn,
                selectedAge === age
                  ? { backgroundColor: primaryColor, borderColor: primaryColor }
                  : { borderColor: primaryColor + '60' },
              ]}
              onPress={() => selectAge(age)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.quickAgeBtnText,
                  { color: selectedAge === age ? '#FFFFFF' : primaryColor },
                ]}
              >
                {age}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const DIAL_SIZE = SCREEN_WIDTH - 80;

const styles = StyleSheet.create({
  wrapper: {
    width: SCREEN_WIDTH - 48,
    alignItems: 'center',
  },
  valueDisplayWrapper: {
    marginBottom: 24,
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 12,
  },
  valueGradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 280,
  },
  emojiContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 28,
  },
  valueContent: {
    alignItems: 'center',
  },
  valueText: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  unitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dialWrapper: {
    marginBottom: 20,
  },
  dialContainer: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    borderRadius: DIAL_SIZE / 2,
    backgroundColor: Colors.white,
    borderWidth: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dialContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialMark: {
    position: 'absolute',
    top: 10,
    width: 2,
    alignItems: 'center',
  },
  markLine: {
    width: 2,
    height: 12,
    backgroundColor: Colors.lightText + '40',
    borderRadius: 1,
  },
  markLineMedium: {
    height: 18,
    width: 3,
    backgroundColor: Colors.darkText + '50',
  },
  markLineLong: {
    height: 24,
    width: 4,
    borderRadius: 2,
  },
  markLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  centerIndicator: {
    position: 'absolute',
    top: -5,
    alignItems: 'center',
  },
  indicatorArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  innerCircle: {
    position: 'absolute',
    width: DIAL_SIZE - 100,
    height: DIAL_SIZE - 100,
    borderRadius: (DIAL_SIZE - 100) / 2,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  swipeHint: {
    fontSize: 14,
    color: Colors.lightText,
    fontWeight: '500',
  },
  quickButtonsContainer: {
    marginBottom: 16,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  quickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: Colors.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickBtnLarge: {
    paddingHorizontal: 16,
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  quickAgesContainer: {
    width: '100%',
  },
  quickAgesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: 10,
  },
  quickAgesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  quickAgeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: Colors.white,
    minWidth: 44,
    alignItems: 'center',
  },
  quickAgeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
