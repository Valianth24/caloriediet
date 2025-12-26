import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PremiumHeightPickerProps {
  min?: number;
  max?: number;
  step?: number;
  initialValue?: number;
  unit?: string;
  onValueChange: (value: number) => void;
  primaryColor?: string;
}

export default function PremiumHeightPicker({
  min = 100,
  max = 250,
  step = 1,
  initialValue = 170,
  unit = 'cm',
  onValueChange,
  primaryColor = Colors.primary,
}: PremiumHeightPickerProps) {
  const [selectedValue, setSelectedValue] = useState(initialValue);
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastValue = useRef(initialValue);
  const lastHapticValue = useRef(initialValue);

  const ITEM_HEIGHT = 16;
  const VISIBLE_HEIGHT = 280;
  const totalItems = Math.floor((max - min) / step) + 1;

  // Glow animation
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  // Initialize position
  useEffect(() => {
    const initialIndex = Math.round((initialValue - min) / step);
    scrollY.setValue(-initialIndex * ITEM_HEIGHT);
  }, []);

  const triggerHaptic = useCallback(async (value: number) => {
    if (value !== lastHapticValue.current) {
      lastHapticValue.current = value;
      if (value % 10 === 0) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (value % 5 === 0) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        await Haptics.selectionAsync();
      }
    }
  }, []);

  const updateValue = useCallback((scrollValue: number) => {
    const newIndex = Math.round(-scrollValue / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(totalItems - 1, newIndex));
    const newValue = min + clampedIndex * step;

    if (newValue !== lastValue.current) {
      lastValue.current = newValue;
      setSelectedValue(newValue);
      onValueChange(newValue);
      triggerHaptic(newValue);
    }
  }, [min, step, totalItems, onValueChange, triggerHaptic]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        scrollY.stopAnimation();
        scrollY.setOffset((scrollY as any)._value);
        scrollY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        scrollY.setValue(gestureState.dy);
        const currentScroll = (scrollY as any)._offset + gestureState.dy;
        updateValue(currentScroll);
      },
      onPanResponderRelease: (_, gestureState) => {
        scrollY.flattenOffset();

        const currentScroll = (scrollY as any)._value;
        const velocity = gestureState.vy;
        const newIndex = Math.round(-currentScroll / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(totalItems - 1, newIndex));
        const targetScroll = -clampedIndex * ITEM_HEIGHT;

        Animated.spring(scrollY, {
          toValue: targetScroll,
          useNativeDriver: true,
          velocity: velocity,
          tension: 100,
          friction: 12,
        }).start();

        const finalValue = min + clampedIndex * step;
        setSelectedValue(finalValue);
        onValueChange(finalValue);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
    })
  ).current;

  const quickAdjust = async (amount: number) => {
    const newValue = Math.max(min, Math.min(max, selectedValue + amount));
    const newIndex = Math.round((newValue - min) / step);

    Animated.spring(scrollY, {
      toValue: -newIndex * ITEM_HEIGHT,
      useNativeDriver: true,
      tension: 100,
      friction: 12,
    }).start();

    setSelectedValue(newValue);
    onValueChange(newValue);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderRulerItems = () => {
    const items = [];
    for (let i = 0; i < totalItems; i++) {
      const value = min + i * step;
      const isMultipleOf5 = value % 5 === 0;
      const isMultipleOf10 = value % 10 === 0;

      // Calculate scale and opacity based on distance from center
      const inputRange = [
        -(i + 8) * ITEM_HEIGHT,
        -(i + 4) * ITEM_HEIGHT,
        -i * ITEM_HEIGHT,
        -(i - 4) * ITEM_HEIGHT,
        -(i - 8) * ITEM_HEIGHT,
      ];

      const scale = scrollY.interpolate({
        inputRange,
        outputRange: [0.6, 0.8, 1, 0.8, 0.6],
        extrapolate: 'clamp',
      });

      const opacity = scrollY.interpolate({
        inputRange,
        outputRange: [0.2, 0.5, 1, 0.5, 0.2],
        extrapolate: 'clamp',
      });

      const translateX = scrollY.interpolate({
        inputRange,
        outputRange: [-15, -5, 0, -5, -15],
        extrapolate: 'clamp',
      });

      items.push(
        <Animated.View
          key={i}
          style={[
            styles.rulerItem,
            {
              opacity,
              transform: [{ scale }, { translateX }],
            },
          ]}
        >
          <View style={styles.rulerLineContainer}>
            <View
              style={[
                styles.rulerLine,
                isMultipleOf10 && [
                  styles.rulerLineLong,
                  { backgroundColor: primaryColor },
                ],
                isMultipleOf5 && !isMultipleOf10 && styles.rulerLineMedium,
              ]}
            />
            {isMultipleOf10 && (
              <Text style={[styles.rulerValue, { color: primaryColor }]}>
                {value}
              </Text>
            )}
          </View>
        </Animated.View>
      );
    }
    return items;
  };

  // Calculate height in feet and inches for display
  const heightInInches = selectedValue / 2.54;
  const feet = Math.floor(heightInInches / 12);
  const inches = Math.round(heightInInches % 12);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.wrapper}>
      {/* Premium Value Display with Glow */}
      <View style={styles.valueDisplayWrapper}>
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
          <View style={styles.valueContent}>
            <Text style={styles.valueText}>{selectedValue}</Text>
            <Text style={styles.unitText}>{unit}</Text>
          </View>
          <View style={styles.convertedValue}>
            <Text style={styles.convertedText}>
              {feet}'{inches}"
            </Text>
          </View>
        </LinearGradient>
      </View>

      {/* 3D Ruler Container */}
      <View style={[styles.rulerWrapper, { height: VISIBLE_HEIGHT }]}>
        {/* Left decorative bar */}
        <LinearGradient
          colors={[primaryColor + '30', primaryColor + '60', primaryColor + '30']}
          style={styles.decorativeBar}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />

        <View style={styles.rulerContainer}>
          <Animated.View
            style={[
              styles.ruler,
              {
                paddingVertical: VISIBLE_HEIGHT / 2 - ITEM_HEIGHT / 2,
                transform: [
                  {
                    translateY: scrollY.interpolate({
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

          {/* Center Indicator with Glow */}
          <View style={styles.indicatorContainer} pointerEvents="none">
            <Animated.View
              style={[
                styles.indicatorGlow,
                { backgroundColor: primaryColor, opacity: glowOpacity },
              ]}
            />
            <View style={[styles.indicatorTriangle, { borderRightColor: primaryColor }]} />
            <View style={[styles.indicatorLine, { backgroundColor: primaryColor }]} />
            <View style={[styles.indicatorTriangleRight, { borderLeftColor: primaryColor }]} />
          </View>

          {/* Fade overlays */}
          <LinearGradient
            colors={['rgba(255,255,255,1)', 'rgba(255,255,255,0)']}
            style={[styles.fadeTop, { height: VISIBLE_HEIGHT / 3 }]}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
            style={[styles.fadeBottom, { height: VISIBLE_HEIGHT / 3 }]}
            pointerEvents="none"
          />
        </View>

        {/* Right scale markers */}
        <View style={styles.scaleMarkers}>
          {[140, 160, 180, 200, 220].map((val) => (
            <View key={val} style={styles.scaleMarker}>
              <Text
                style={[
                  styles.scaleText,
                  selectedValue >= val - 10 &&
                    selectedValue <= val + 10 && { color: primaryColor, fontWeight: '700' },
                ]}
              >
                {val}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Premium Quick Adjust Buttons */}
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

      {/* Human silhouette indicator */}
      <View style={styles.silhouetteContainer}>
        <View style={[styles.silhouette, { height: Math.min(100, (selectedValue - 100) * 0.6) }]}>
          <Text style={styles.silhouetteIcon}>🧍</Text>
        </View>
        <Text style={styles.silhouetteLabel}>{selectedValue < 160 ? 'Kısa' : selectedValue < 180 ? 'Orta' : 'Uzun'}</Text>
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

const styles = StyleSheet.create({
  wrapper: {
    width: SCREEN_WIDTH - 48,
    alignItems: 'center',
  },
  valueDisplayWrapper: {
    marginBottom: 20,
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  valueGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 200,
  },
  valueContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
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
    marginLeft: 6,
    opacity: 0.9,
  },
  convertedValue: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  convertedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rulerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  decorativeBar: {
    width: 8,
    height: '100%',
    borderRadius: 4,
    marginRight: 8,
  },
  rulerContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  ruler: {
    width: '100%',
  },
  rulerItem: {
    height: 16,
    justifyContent: 'center',
  },
  rulerLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
  },
  rulerLine: {
    height: 2,
    width: 16,
    backgroundColor: Colors.lightText + '40',
    borderRadius: 1,
  },
  rulerLineMedium: {
    width: 28,
    height: 3,
    backgroundColor: Colors.darkText + '50',
  },
  rulerLineLong: {
    width: 45,
    height: 4,
    borderRadius: 2,
  },
  rulerValue: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '700',
  },
  indicatorContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: -3,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  indicatorGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 20,
    top: -8,
    borderRadius: 10,
  },
  indicatorLine: {
    flex: 1,
    height: 5,
    borderRadius: 2.5,
  },
  indicatorTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderRightWidth: 14,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  indicatorTriangleRight: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftWidth: 14,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  scaleMarkers: {
    marginLeft: 8,
    justifyContent: 'space-between',
    height: '70%',
  },
  scaleMarker: {
    alignItems: 'center',
  },
  scaleText: {
    fontSize: 11,
    color: Colors.lightText,
    fontWeight: '600',
  },
  quickButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  quickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: Colors.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickBtnLarge: {
    paddingHorizontal: 18,
  },
  quickBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  silhouetteContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  silhouette: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  silhouetteIcon: {
    fontSize: 40,
  },
  silhouetteLabel: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 4,
    fontWeight: '600',
  },
});
