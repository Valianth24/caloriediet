import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTodaySteps, syncSteps } from '../../utils/api';
import { Colors } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useStore } from '../../store/useStore';
import Svg, { Circle } from 'react-native-svg';
import { Pedometer } from 'expo-sensors';

const screenWidth = Dimensions.get('window').width;

export default function StepsDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useStore();
  const [todaySteps, setTodaySteps] = useState(0);
  const [isPedometerAvailable, setIsPedometerAvailable] = useState('checking');

  useEffect(() => {
    loadData();
    subscribeToPedometer();
  }, []);

  const loadData = async () => {
    try {
      const steps = await getTodaySteps() as any;
      setTodaySteps(steps?.steps || 0);
    } catch (error) {
      console.error('Error loading steps:', error);
      setTodaySteps(0);
    }
  };

  const subscribeToPedometer = async () => {
    const available = await Pedometer.isAvailableAsync();
    setIsPedometerAvailable(String(available));

    if (available) {
      const end = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      try {
        const pastStepCount = await Pedometer.getStepCountAsync(start, end);
        if (pastStepCount) {
          setTodaySteps(pastStepCount.steps);
          await syncSteps(pastStepCount.steps, 'pedometer');
        }
      } catch (error) {
        console.error('Error reading pedometer:', error);
      }

      return Pedometer.watchStepCount(result => {
        setTodaySteps(result.steps);
        syncSteps(result.steps, 'pedometer');
      });
    }
  };

  const goal = user?.step_goal || 10000;
  const percentage = goal > 0 ? Math.min((todaySteps / goal) * 100, 100) : 0;
  const caloriesBurned = Math.floor(todaySteps * 0.04);
  const distance = (todaySteps * 0.0008).toFixed(2); // km

  const radius = 100;
  const strokeWidth = 15;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Adım Takibi</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={24} color={Colors.darkText} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Circular Progress */}
        <View style={styles.progressSection}>
          <Text style={styles.goalTitle}>Günlük Hedef: {goal.toLocaleString()} Adım</Text>
          <View style={styles.circularProgress}>
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
              <Text style={styles.stepCount}>{todaySteps.toLocaleString()}</Text>
              <Text style={styles.stepLabel}>adım</Text>
              <Text style={styles.percentage}>{percentage.toFixed(0)}%</Text>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={32} color={Colors.error} />
            <Text style={styles.statValue}>{caloriesBurned}</Text>
            <Text style={styles.statLabel}>Kalori</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="location" size={32} color={Colors.primary} />
            <Text style={styles.statValue}>{distance}</Text>
            <Text style={styles.statLabel}>km</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={32} color={Colors.warning} />
            <Text style={styles.statValue}>{Math.floor(todaySteps / 100)}</Text>
            <Text style={styles.statLabel}>dakika</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="phone-portrait" size={24} color={Colors.primary} />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Pedometer</Text>
              <Text style={styles.infoSubtitle}>
                {isPedometerAvailable === 'true' ? 'Aktif' : 'Kullanılamıyor'}
              </Text>
            </View>
          </View>
          {isPedometerAvailable === 'false' && (
            <Text style={styles.infoNote}>
              Adım sayıcı telefonunuzda desteklenmiyor. Manuel veri girişi yapabilirsiniz.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  menuButton: {
    padding: 8,
  },
  content: {
    padding: 16,
  },
  progressSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 20,
  },
  circularProgress: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    position: 'absolute',
    alignItems: 'center',
  },
  stepCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  stepLabel: {
    fontSize: 14,
    color: Colors.lightText,
  },
  percentage: {
    fontSize: 16,
    color: Colors.primary,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
  },
  infoSubtitle: {
    fontSize: 14,
    color: Colors.lightText,
  },
  infoNote: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 12,
    fontStyle: 'italic',
  },
});
