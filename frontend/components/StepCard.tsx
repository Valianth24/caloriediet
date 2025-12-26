import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Colors } from '../constants/Colors';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { pedometerService } from '../services/pedometerService';

interface StepCardProps {
  current: number;
  goal: number;
}

export default function StepCard({ current, goal }: StepCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [liveSteps, setLiveSteps] = useState<number>(current);
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  // Initialize pedometer service
  useEffect(() => {
    const initPedometer = async () => {
      try {
        const available = await pedometerService.initialize();
        setIsAvailable(available);
        setIsInitialized(true);
        
        if (available) {
          // Get current steps
          const currentSteps = pedometerService.getCurrentSteps();
          if (currentSteps > 0) {
            setLiveSteps(currentSteps);
          }
        }
      } catch (error) {
        console.error('[StepCard] Error initializing pedometer:', error);
        setIsInitialized(true);
      }
    };
    
    initPedometer();
    
    return () => {
      // Cleanup on unmount
      pedometerService.stop();
    };
  }, []);
  
  // Subscribe to step updates
  const handleStepUpdate = useCallback((steps: number) => {
    if (steps > 0) {
      setLiveSteps(steps);
    }
  }, []);
  
  useEffect(() => {
    if (isAvailable) {
      pedometerService.subscribe(handleStepUpdate);
      
      return () => {
        pedometerService.unsubscribe(handleStepUpdate);
      };
    }
  }, [isAvailable, handleStepUpdate]);
  
  // Update liveSteps when current prop changes (from API)
  useEffect(() => {
    // Use the higher value between API and local pedometer
    if (current > liveSteps) {
      setLiveSteps(current);
    }
  }, [current]);
  
  // Use the higher value between local pedometer and API
  const displaySteps = Math.max(liveSteps, current);
  const percentage = goal > 0 ? Math.min((displaySteps / goal) * 100, 100) : 0;
  
  // Determine source icon based on platform
  const sourceIcon = Platform.OS === 'ios' ? 'logo-apple' : 'logo-google';
  const sourceName = Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit';

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => router.push('/details/steps')}
      activeOpacity={0.9}
    >
      <Text style={styles.title} numberOfLines={1}>{t('stepCounter')}</Text>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="footsteps" size={32} color={Colors.primary} />
          {isAvailable && (
            <View style={styles.liveIndicator} />
          )}
        </View>
        <View style={styles.stepsContainer}>
          <Text style={styles.steps}>{displaySteps.toLocaleString()}</Text>
          <Text style={styles.goal}>/ {goal.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${percentage}%` }]} />
      </View>

      <View style={styles.source}>
        {isAvailable ? (
          <>
            <Ionicons name={sourceIcon as any} size={14} color={Colors.primary} />
            <Text style={styles.sourceText}>{sourceName}</Text>
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
          </>
        ) : (
          <>
            <Ionicons name="sync-outline" size={14} color={Colors.lightText} />
            <Text style={styles.sourceText}>{t('manual') || 'Manuel'}</Text>
          </>
        )}
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
  iconContainer: {
    position: 'relative',
  },
  liveIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.white,
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
  liveBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  liveBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: Colors.white,
  },
});
