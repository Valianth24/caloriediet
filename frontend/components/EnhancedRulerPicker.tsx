import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  PanResponder, 
  Dimensions,
  TouchableOpacity,
  Platform 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EnhancedRulerPickerProps {
  min: number;
  max: number;
  step: number;
  initialValue: number;
  unit: string;
  onValueChange: (value: number) => void;
  height?: number;
  primaryColor?: string;
}

export default function EnhancedRulerPicker({
  min,
  max,
  step,
  initialValue,
  unit,
  onValueChange,
  height = 300,
  primaryColor = Colors.primary,
}: EnhancedRulerPickerProps) {
  const [selectedValue, setSelectedValue] = useState(initialValue);
  const pan = useRef(new Animated.Value(0)).current;
  const lastValue = useRef(initialValue);
  
  const ITEM_HEIGHT = 25;
  const totalItems = Math.floor((max - min) / step) + 1;
  
  // Initialize position
  useEffect(() => {
    const initialIndex = Math.round((initialValue - min) / step);
    pan.setValue(-initialIndex * ITEM_HEIGHT);
  }, []);

  const updateValue = useCallback((panValue: number) => {
    const newIndex = Math.round(-panValue / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(totalItems - 1, newIndex));
    const newValue = step < 1 
      ? parseFloat((min + clampedIndex * step).toFixed(1))
      : min + clampedIndex * step;
    
    if (newValue !== lastValue.current) {
      lastValue.current = newValue;
      setSelectedValue(newValue);
      onValueChange(newValue);
    }
  }, [min, step, totalItems, onValueChange]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.stopAnimation();
        pan.setOffset((pan as any)._value);
        pan.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue(gestureState.dy);
        const currentPan = (pan as any)._offset + gestureState.dy;
        updateValue(currentPan);
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        
        const currentPan = (pan as any)._value;
        const newIndex = Math.round(-currentPan / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(totalItems - 1, newIndex));
        const targetPan = -clampedIndex * ITEM_HEIGHT;
        
        Animated.spring(pan, {
          toValue: targetPan,
          useNativeDriver: true,
          tension: 60,
          friction: 10,
        }).start();
        
        const finalValue = step < 1 
          ? parseFloat((min + clampedIndex * step).toFixed(1))
          : min + clampedIndex * step;
        setSelectedValue(finalValue);
        onValueChange(finalValue);
      },
    })
  ).current;

  const quickAdjust = (amount: number) => {
    const newValue = Math.max(min, Math.min(max, selectedValue + amount));
    const newIndex = Math.round((newValue - min) / step);
    
    Animated.spring(pan, {
      toValue: -newIndex * ITEM_HEIGHT,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();
    
    const finalValue = step < 1 
      ? parseFloat((min + newIndex * step).toFixed(1))
      : min + newIndex * step;
    setSelectedValue(finalValue);
    onValueChange(finalValue);
  };

  const renderRulerItems = () => {
    const items = [];
    for (let i = 0; i < totalItems; i++) {
      const value = step < 1 
        ? parseFloat((min + i * step).toFixed(1))
        : min + i * step;
      const isMultipleOf5 = Math.abs(value % 5) < 0.01;
      const isMultipleOf10 = Math.abs(value % 10) < 0.01;
      
      items.push(
        <View key={i} style={styles.rulerItem}>
          <View style={styles.rulerLineContainer}>
            <View
              style={[
                styles.rulerLine,
                isMultipleOf10 && [styles.rulerLineLong, { backgroundColor: primaryColor }],
                isMultipleOf5 && !isMultipleOf10 && styles.rulerLineMedium,
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
    return step < 1 ? val.toFixed(1) : Math.round(val).toString();
  };

  return (
    <View style={styles.wrapper}>
      {/* Value Display */}
      <View style={[styles.valueDisplayContainer, { shadowColor: primaryColor }]}>
        <LinearGradient
          colors={[primaryColor, adjustColor(primaryColor, -30)]}
          style={styles.valueGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.valueText}>{formatValue(selectedValue)}</Text>
          <Text style={styles.unitText}>{unit}</Text>
        </LinearGradient>
      </View>

      {/* Ruler Container */}
      <View style={[styles.rulerContainer, { height }]}>
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
          <View style={[styles.indicatorArrow, { borderRightColor: primaryColor }]} />
          <View style={[styles.indicatorLine, { backgroundColor: primaryColor }]} />
          <View style={[styles.indicatorArrowRight, { borderLeftColor: primaryColor }]} />
        </View>

        {/* Fade overlays */}
        <View style={[styles.fadeTop, { height: height / 3 }]} pointerEvents="none" />
        <View style={[styles.fadeBottom, { height: height / 3 }]} pointerEvents="none" />
      </View>

      {/* Quick Adjust Buttons */}
      <View style={styles.quickButtonsRow}>
        <TouchableOpacity 
          style={[styles.quickBtn, { borderColor: primaryColor }]} 
          onPress={() => quickAdjust(-10)}
        >
          <Text style={[styles.quickBtnText, { color: primaryColor }]}>-10</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.quickBtn, { borderColor: primaryColor }]} 
          onPress={() => quickAdjust(-1)}
        >
          <Text style={[styles.quickBtnText, { color: primaryColor }]}>-1</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.quickBtn, { borderColor: primaryColor }]} 
          onPress={() => quickAdjust(1)}
        >
          <Text style={[styles.quickBtnText, { color: primaryColor }]}>+1</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.quickBtn, { borderColor: primaryColor }]} 
          onPress={() => quickAdjust(10)}
        >
          <Text style={[styles.quickBtnText, { color: primaryColor }]}>+10</Text>
        </TouchableOpacity>
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
    width: SCREEN_WIDTH - 60,
    alignItems: 'center',
  },
  valueDisplayContainer: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  valueGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  unitText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
    opacity: 0.9,
  },
  rulerContainer: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  ruler: {
    width: '100%',
  },
  rulerItem: {
    height: 25,
    justifyContent: 'center',
  },
  rulerLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
  },
  rulerLine: {
    height: 2,
    width: 20,
    backgroundColor: Colors.lightText + '50',
    borderRadius: 1,
  },
  rulerLineMedium: {
    width: 35,
    height: 3,
    backgroundColor: Colors.darkText + '40',
  },
  rulerLineLong: {
    width: 50,
    height: 4,
    borderRadius: 2,
  },
  rulerValue: {
    marginLeft: 12,
    fontSize: 15,
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
  indicatorArrow: {
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
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    opacity: 0.85,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    opacity: 0.85,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
  },
  quickBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: Colors.white,
  },
  quickBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
