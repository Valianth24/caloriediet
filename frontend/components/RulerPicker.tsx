import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions } from 'react-native';
import { Colors } from '../constants/Colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface RulerPickerProps {
  min: number;
  max: number;
  step: number;
  initialValue: number;
  unit: string;
  onValueChange: (value: number) => void;
  height?: number;
}

export default function RulerPicker({
  min,
  max,
  step,
  initialValue,
  unit,
  onValueChange,
  height = 300
}: RulerPickerProps) {
  const [selectedValue, setSelectedValue] = useState(initialValue);
  const pan = useRef(new Animated.Value(0)).current;
  
  const ITEM_HEIGHT = 40;
  const VISIBLE_ITEMS = Math.floor(height / ITEM_HEIGHT);
  const totalItems = Math.floor((max - min) / step) + 1;
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset(pan._value);
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        
        const newIndex = Math.round(-pan._value / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(totalItems - 1, newIndex));
        const newValue = min + (clampedIndex * step);
        
        Animated.spring(pan, {
          toValue: -clampedIndex * ITEM_HEIGHT,
          useNativeDriver: true,
          tension: 80,
          friction: 10
        }).start();
        
        setSelectedValue(newValue);
        onValueChange(newValue);
      }
    })
  ).current;

  const renderRulerItems = () => {
    const items = [];
    for (let i = 0; i < totalItems; i++) {
      const value = min + (i * step);
      const isMultipleOf5 = value % 5 === 0;
      const isMultipleOf10 = value % 10 === 0;
      
      items.push(
        <View key={i} style={styles.rulerItem}>
          <View style={styles.rulerLineContainer}>
            <View
              style={[
                styles.rulerLine,
                isMultipleOf10 && styles.rulerLineLong,
                isMultipleOf5 && !isMultipleOf10 && styles.rulerLineMedium
              ]}
            />
            {isMultipleOf10 && (
              <Text style={styles.rulerValue}>{value}</Text>
            )}
          </View>
        </View>
      );
    }
    return items;
  };

  return (
    <View style={[styles.container, { height }]}>
      {/* Center indicator line */}
      <View style={styles.indicatorContainer}>
        <View style={styles.indicatorLine} />
        <View style={styles.indicatorTriangleLeft} />
        <View style={styles.indicatorTriangleRight} />
      </View>
      
      {/* Selected value display */}
      <View style={styles.selectedValueContainer}>
        <Text style={styles.selectedValue}>{selectedValue}</Text>
        <Text style={styles.selectedUnit}>{unit}</Text>
      </View>
      
      {/* Ruler */}
      <Animated.View
        style={[
          styles.ruler,
          {
            transform: [
              {
                translateY: pan.interpolate({
                  inputRange: [-totalItems * ITEM_HEIGHT, 0],
                  outputRange: [-totalItems * ITEM_HEIGHT, 0],
                  extrapolate: 'clamp'
                })
              }
            ]
          }
        ]}
        {...panResponder.panHandlers}
      >
        {renderRulerItems()}
      </Animated.View>
      
      {/* Gradient overlays */}
      <View style={[styles.gradientTop, { height: height / 3 }]} />
      <View style={[styles.gradientBottom, { height: height / 3 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 120,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary + '30',
  },
  ruler: {
    paddingVertical: 140,
  },
  rulerItem: {
    height: 40,
    justifyContent: 'center',
  },
  rulerLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
  },
  rulerLine: {
    height: 1,
    width: 15,
    backgroundColor: Colors.lightText,
  },
  rulerLineMedium: {
    width: 25,
    height: 1.5,
    backgroundColor: Colors.darkText + '80',
  },
  rulerLineLong: {
    width: 35,
    height: 2,
    backgroundColor: Colors.primary,
  },
  rulerValue: {
    marginLeft: 8,
    fontSize: 12,
    color: Colors.darkText,
    fontWeight: '600',
  },
  indicatorContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicatorLine: {
    height: 3,
    flex: 1,
    backgroundColor: Colors.primary,
  },
  indicatorTriangleLeft: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: Colors.primary,
    marginRight: -8,
  },
  indicatorTriangleRight: {
    position: 'absolute',
    right: 0,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: Colors.primary,
  },
  selectedValueContainer: {
    position: 'absolute',
    right: -80,
    top: '50%',
    marginTop: -30,
    zIndex: 3,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  selectedValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  selectedUnit: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    opacity: 0.9,
    pointerEvents: 'none',
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    opacity: 0.9,
    pointerEvents: 'none',
  },
});
