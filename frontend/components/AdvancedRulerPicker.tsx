import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/Colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AdvancedRulerPickerProps {
  min: number;
  max: number;
  step: number;
  initialValue: number;
  unit: string;
  onValueChange: (value: number) => void;
  height?: number;
  primaryColor?: string;
  decimalPlaces?: number;
}

export default function AdvancedRulerPicker({
  min,
  max,
  step,
  initialValue,
  unit,
  onValueChange,
  height = 380,
  primaryColor = Colors.primary,
  decimalPlaces = step < 1 ? 1 : 0,
}: AdvancedRulerPickerProps) {
  const [selectedValue, setSelectedValue] = useState(initialValue);
  const lastHapticValue = useRef(initialValue);
  const pan = useRef(new Animated.Value(0)).current;
  const velocity = useRef(0);
  const isScrolling = useRef(false);

  const ITEM_HEIGHT = 20;
  const totalItems = Math.floor((max - min) / step) + 1;
  const initialIndex = Math.round((initialValue - min) / step);

  // Initialize position
  useEffect(() => {
    pan.setValue(-initialIndex * ITEM_HEIGHT);
  }, []);

  // Haptic feedback when value changes
  const triggerHaptic = useCallback((value: number) => {
    if (Platform.OS !== 'web' && value !== lastHapticValue.current) {
      const isMultipleOf10 = Math.abs(value % 10) < 0.01;
      const isMultipleOf5 = Math.abs(value % 5) < 0.01;
      
      if (isMultipleOf10) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else if (isMultipleOf5) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      lastHapticValue.current = value;
    }
  }, []);

  const updateValue = useCallback((panValue: number) => {
    const newIndex = Math.round(-panValue / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(totalItems - 1, newIndex));
    const newValue = parseFloat((min + clampedIndex * step).toFixed(decimalPlaces));
    
    if (newValue !== selectedValue) {
      setSelectedValue(newValue);
      triggerHaptic(newValue);
      onValueChange(newValue);
    }
  }, [min, step, totalItems, selectedValue, triggerHaptic, onValueChange, decimalPlaces]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.stopAnimation();
        pan.setOffset((pan as any)._value);
        pan.setValue(0);
        isScrolling.current = true;
      },
      onPanResponderMove: (_, gestureState) => {
        velocity.current = gestureState.vy;
        pan.setValue(gestureState.dy);
        
        // Update value during scroll
        const currentPan = (pan as any)._offset + gestureState.dy;
        updateValue(currentPan);
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        isScrolling.current = false;

        const currentPan = (pan as any)._value;
        const newIndex = Math.round(-currentPan / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(totalItems - 1, newIndex));
        const targetPan = -clampedIndex * ITEM_HEIGHT;

        // Calculate momentum
        const momentumDistance = gestureState.vy * 150;
        let momentumIndex = Math.round(-(currentPan + momentumDistance) / ITEM_HEIGHT);
        momentumIndex = Math.max(0, Math.min(totalItems - 1, momentumIndex));
        const momentumTarget = -momentumIndex * ITEM_HEIGHT;

        // Use momentum if swipe was fast enough
        const finalTarget = Math.abs(gestureState.vy) > 0.5 ? momentumTarget : targetPan;
        const finalIndex = Math.round(-finalTarget / ITEM_HEIGHT);
        const finalValue = parseFloat((min + finalIndex * step).toFixed(decimalPlaces));

        Animated.spring(pan, {
          toValue: finalTarget,
          useNativeDriver: true,
          tension: 50,
          friction: 12,
          velocity: gestureState.vy,
        }).start(() => {
          setSelectedValue(finalValue);
          onValueChange(finalValue);
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        });
      },
    })
  ).current;

  const renderRulerItems = () => {
    const items = [];
    for (let i = 0; i < totalItems; i++) {
      const value = parseFloat((min + i * step).toFixed(decimalPlaces));
      const isMultipleOf10 = Math.abs(value % 10) < 0.01;
      const isMultipleOf5 = Math.abs(value % 5) < 0.01 && !isMultipleOf10;

      items.push(
        <View key={i} style={styles.rulerItem}>
          <View style={styles.rulerLineContainer}>
            <View
              style={[
                styles.rulerLine,
                isMultipleOf10 && [styles.rulerLineLong, { backgroundColor: primaryColor }],
                isMultipleOf5 && styles.rulerLineMedium,
              ]}
            />
            {isMultipleOf10 && (
              <Text style={[styles.rulerValue, { color: primaryColor }]}>{value}</Text>
            )}
          </View>
        </View>
      );
    }
    return items;
  };

  const formatValue = (val: number) => {
    return decimalPlaces > 0 ? val.toFixed(decimalPlaces) : Math.round(val).toString();
  };

  return (
    <View style={[styles.wrapper, { height: height + 80 }]}>
      {/* Selected Value Display - Top */}
      <View style={styles.valueDisplayContainer}>
        <LinearGradient
          colors={[primaryColor, adjustColor(primaryColor, -20)]}
          style={styles.valueGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.valueText}>{formatValue(selectedValue)}</Text>
          <Text style={styles.unitText}>{unit}</Text>
        </LinearGradient>
      </View>

      {/* Main Ruler Container */}
      <View style={[styles.container, { height }]}>
        {/* Ruler Scale */}
        <Animated.View
          style={[
            styles.ruler,
            {
              paddingVertical: height / 2,
              transform: [
                {
                  translateY: pan.interpolate({
                    inputRange: [-(totalItems - 1) * ITEM_HEIGHT, 0],
                    outputRange: [-(totalItems - 1) * ITEM_HEIGHT, 0],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {renderRulerItems()}
        </Animated.View>

        {/* Center Indicator */}
        <View style={styles.indicatorContainer} pointerEvents="none">
          <View style={[styles.indicatorArrowLeft, { borderRightColor: primaryColor }]} />
          <View style={[styles.indicatorLine, { backgroundColor: primaryColor }]} />
          <View style={[styles.indicatorArrowRight, { borderLeftColor: primaryColor }]} />
        </View>

        {/* Gradient Overlays for fade effect */}
        <LinearGradient
          colors={['rgba(245,245,245,1)', 'rgba(245,245,245,0)']}
          style={[styles.gradientOverlay, styles.gradientTop]}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(245,245,245,0)', 'rgba(245,245,245,1)']}
          style={[styles.gradientOverlay, styles.gradientBottom]}
          pointerEvents="none"
        />

        {/* Glow effect around center */}
        <View style={[styles.glowEffect, { shadowColor: primaryColor }]} pointerEvents="none" />
      </View>

      {/* Quick Select Buttons */}
      <View style={styles.quickSelectContainer}>
        <QuickButton
          label="-10"
          onPress={() => {
            const newVal = Math.max(min, selectedValue - 10);
            const newIndex = Math.round((newVal - min) / step);
            Animated.spring(pan, {
              toValue: -newIndex * ITEM_HEIGHT,
              useNativeDriver: true,
              tension: 60,
              friction: 10,
            }).start();
            setSelectedValue(newVal);
            onValueChange(newVal);
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          }}
          color={primaryColor}
        />
        <QuickButton
          label="-1"
          onPress={() => {
            const newVal = Math.max(min, selectedValue - 1);
            const newIndex = Math.round((newVal - min) / step);
            Animated.spring(pan, {
              toValue: -newIndex * ITEM_HEIGHT,
              useNativeDriver: true,
              tension: 60,
              friction: 10,
            }).start();
            setSelectedValue(newVal);
            onValueChange(newVal);
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
          color={primaryColor}
        />
        <QuickButton
          label="+1"
          onPress={() => {
            const newVal = Math.min(max, selectedValue + 1);
            const newIndex = Math.round((newVal - min) / step);
            Animated.spring(pan, {
              toValue: -newIndex * ITEM_HEIGHT,
              useNativeDriver: true,
              tension: 60,
              friction: 10,
            }).start();
            setSelectedValue(newVal);
            onValueChange(newVal);
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
          color={primaryColor}
        />
        <QuickButton
          label="+10"
          onPress={() => {
            const newVal = Math.min(max, selectedValue + 10);
            const newIndex = Math.round((newVal - min) / step);
            Animated.spring(pan, {
              toValue: -newIndex * ITEM_HEIGHT,
              useNativeDriver: true,
              tension: 60,
              friction: 10,
            }).start();
            setSelectedValue(newVal);
            onValueChange(newVal);
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          }}
          color={primaryColor}
        />
      </View>
    </View>
  );
}

// Quick button component
const QuickButton = ({
  label,
  onPress,
  color,
}: {
  label: string;
  onPress: () => void;
  color: string;
}) => (
  <Animated.View>
    <View style={[styles.quickButton, { borderColor: color }]}>
      <Text style={[styles.quickButtonText, { color }]} onPress={onPress}>
        {label}
      </Text>
    </View>
  </Animated.View>
);

// Helper function to adjust color brightness
function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  wrapper: {
    width: SCREEN_WIDTH - 48,
    alignItems: 'center',
  },
  valueDisplayContainer: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  valueGradient: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  unitText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
    opacity: 0.9,
  },
  container: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    position: 'relative',
  },
  ruler: {
    width: '100%',
  },
  rulerItem: {
    height: 20,
    justifyContent: 'center',
  },
  rulerLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 20,
  },
  rulerLine: {
    height: 2,
    width: 20,
    backgroundColor: Colors.lightText + '60',
    borderRadius: 1,
  },
  rulerLineMedium: {
    width: 35,
    height: 3,
    backgroundColor: Colors.darkText + '50',
  },
  rulerLineLong: {
    width: 55,
    height: 4,
    borderRadius: 2,
  },
  rulerValue: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '700',
  },
  indicatorContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: -2,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  indicatorLine: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  indicatorArrowLeft: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderRightWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  indicatorArrowRight: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 80,
  },
  gradientTop: {
    top: 0,
  },
  gradientBottom: {
    bottom: 0,
  },
  glowEffect: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: -20,
    height: 40,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 0,
  },
  quickSelectContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  quickButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: Colors.white,
  },
  quickButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
