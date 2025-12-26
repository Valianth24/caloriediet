import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getWeeklyWater, getTodayWater, getTodaySteps } from '../../utils/api';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { useStore } from '../../store/useStore';

const screenWidth = Dimensions.get('window').width;

export default function TrackingScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, refreshData } = useStore();
  const [weeklyWater, setWeeklyWater] = useState<any[]>([]);
  const [todayWater, setTodayWater] = useState(0);
  const [todaySteps, setTodaySteps] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, [refreshData]);

  const loadData = async () => {
    try {
      const [waterResponse, waterToday, steps] = await Promise.all([
        getWeeklyWater(),
        getTodayWater(),
        getTodaySteps(),
      ]);
      // API returns {weekly_data: [{date, total_amount}]}
      const waterData = waterResponse as any;
      const waterTodayData = waterToday as any;
      const stepsData = steps as any;
      setWeeklyWater(waterData?.weekly_data || []);
      setTodayWater(waterTodayData?.total_amount || 0);
      setTodaySteps(stepsData?.steps || 0);
    } catch (error) {
      console.error('Error loading tracking data:', error);
      setWeeklyWater([]);
      setTodayWater(0);
      setTodaySteps(0);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const chartData = weeklyWater.map((item, index) => ({
    value: (item.total_amount || 0) / 1000,
    label: new Date(item.date).toLocaleDateString('tr-TR', { weekday: 'short' }),
    frontColor: colors.teal,
  }));

  const lineChartData = weeklyWater.map((item) => ({
    value: (item.total_amount || 0) / 1000,
  }));

  const avgWater = weeklyWater.length > 0
    ? weeklyWater.reduce((sum, item) => sum + (item.total_amount || 0), 0) / weeklyWater.length / 1000
    : 0;

  const stepGoal = user?.step_goal || 10000;
  const stepPercentage = stepGoal > 0 ? Math.min((todaySteps / stepGoal) * 100, 100) : 0;
  const avgSteps = Math.floor(todaySteps * 0.85); // Approximate average
  const caloriesBurned = Math.floor(todaySteps * 0.04);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <Text style={[styles.title, { color: colors.darkText }]}>{t('tracking')}</Text>

        {/* Water Tracking Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.darkText }]}>{t('waterTracking')}</Text>

          <View style={[styles.card, { backgroundColor: colors.white }]}>
            <View style={styles.goalContainer}>
              <Ionicons name="water" size={40} color={colors.teal} />
              <View>
                <Text style={[styles.goalLabel, { color: colors.lightText }]}>{t('today')}</Text>
                <Text style={[styles.goalValue, { color: colors.darkText }]}>{(todayWater / 1000).toFixed(1)} {t('liters')}</Text>
              </View>
            </View>

            {weeklyWater.length > 0 && (
              <View style={styles.chartContainer}>
                <Text style={[styles.chartTitle, { color: colors.darkText }]}>{t('weeklyWater')}</Text>
                <LineChart
                  data={lineChartData}
                  width={screenWidth - 80}
                  height={180}
                  color={colors.teal}
                  thickness={3}
                  startFillColor={colors.teal}
                  startOpacity={0.3}
                  endFillColor={colors.teal}
                  endOpacity={0.01}
                  areaChart
                  curved
                  hideRules
                  yAxisColor="#E0E0E0"
                  xAxisColor="#E0E0E0"
                  hideDataPoints={false}
                  dataPointsColor={colors.teal}
                  dataPointsRadius={4}
                />
              </View>
            )}

            <View style={styles.avgContainer}>
              <Text style={[styles.avgLabel, { color: colors.lightText }]}>{t('thisWeekAvg')}</Text>
              <Text style={[styles.avgValue, { color: colors.primary }]}>{avgWater.toFixed(1)} {t('liters')} {t('perDay')}</Text>
            </View>
          </View>
        </View>

        {/* Bar Chart Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.darkText }]}>{t('weeklyDetail')}</Text>

          <View style={[styles.card, { backgroundColor: colors.white }]}>
            {chartData.length > 0 && (
              <BarChart
                data={chartData}
                width={screenWidth - 80}
                height={200}
                barWidth={35}
                spacing={15}
                roundedTop
                roundedBottom
                hideRules
                xAxisColor="#E0E0E0"
                yAxisColor="#E0E0E0"
                yAxisTextStyle={{ color: colors.lightText }}
                xAxisLabelTextStyle={{ color: colors.lightText, fontSize: 12 }}
                noOfSections={5}
                maxValue={3}
              />
            )}
          </View>
        </View>

        {/* Steps Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.darkText }]}>{t('stepCounter')}</Text>

          <View style={[styles.card, { backgroundColor: colors.white }]}>
            <View style={styles.goalContainer}>
              <Ionicons name="footsteps" size={40} color={colors.primary} />
              <View>
                <Text style={[styles.goalLabel, { color: colors.lightText }]}>{t('goal')}</Text>
                <Text style={[styles.goalValue, { color: colors.darkText }]}>{stepGoal.toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${stepPercentage}%`, backgroundColor: colors.primary }]} />
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="trophy" size={24} color={colors.warning} />
                <Text style={[styles.statLabel, { color: colors.lightText }]}>{t('today')}</Text>
                <Text style={[styles.statValue, { color: colors.darkText }]}>{todaySteps.toLocaleString()}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="trending-up" size={24} color={colors.success} />
                <Text style={[styles.statLabel, { color: colors.lightText }]}>{t('average')}</Text>
                <Text style={[styles.statValue, { color: colors.darkText }]}>{avgSteps.toLocaleString()}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="flame" size={24} color={colors.error} />
                <Text style={[styles.statLabel, { color: colors.lightText }]}>{t('calorie')}</Text>
                <Text style={[styles.statValue, { color: colors.darkText }]}>{caloriesBurned}</Text>
              </View>
            </View>
          </View>
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
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  goalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  goalLabel: {
    fontSize: 14,
    color: Colors.lightText,
  },
  goalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  chartContainer: {
    marginVertical: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: 12,
  },
  avgContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  avgLabel: {
    fontSize: 14,
    color: Colors.lightText,
  },
  avgValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
    marginVertical: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.lightText,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
});
