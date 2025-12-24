import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Dimensions, Modal, TextInput, Switch, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getWeeklyWater, getTodayWater, addWater } from '../../utils/api';
import { Colors } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { useRouter } from 'expo-router';
import { useStore } from '../../store/useStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogBox } from 'react-native';
import { clearReminderNotifications, requestNotificationPermission, syncReminderNotifications, sendTestNotification, getScheduledNotifications } from '../../utils/notifications';

const screenWidth = Dimensions.get('window').width;

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

export default function WaterDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, triggerRefresh } = useStore();
  const [weeklyWater, setWeeklyWater] = useState<any[]>([]);
  const [todayWater, setTodayWater] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Reminder states
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTimes, setReminderTimes] = useState<string[]>(['09:00', '12:00', '15:00', '18:00', '21:00']);
  const [newReminderTime, setNewReminderTime] = useState('');

  useEffect(() => {
    loadData();
    loadReminderSettings();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert('Bildirim İzni', 'Bildirim izni verilmedi. Ayarlardan açabilirsiniz.');
    }
  };

  const loadReminderSettings = async () => {
    try {
      const enabled = await AsyncStorage.getItem('water_reminder_enabled');
      const times = await AsyncStorage.getItem('water_reminder_times');
      
      if (enabled) setReminderEnabled(enabled === 'true');
      if (times) setReminderTimes(JSON.parse(times));
    } catch (error) {
      console.error('Error loading reminder settings:', error);
    }
  };

  const saveReminderSettings = async () => {
    try {
      await AsyncStorage.setItem('water_reminder_enabled', reminderEnabled.toString());
      await AsyncStorage.setItem('water_reminder_times', JSON.stringify(reminderTimes));

      const hasPermission = await requestNotificationPermission();

      if (hasPermission) {
        await syncReminderNotifications({
          type: 'water',
          enabled: reminderEnabled,
          times: reminderTimes,
          content: {
            title: '💧 Su İçme Zamanı!',
            body: 'Sağlığınız için su içmeyi unutmayın.',
            sound: true,
          },
        });
        
        // Show scheduled notifications count for debugging
        const scheduled = await getScheduledNotifications();
        const waterNotifications = scheduled.filter(n => n.content?.title?.includes('Su'));
        
        Alert.alert(
          'Başarılı', 
          reminderEnabled 
            ? `Hatırlatıcı ayarları kaydedildi! ${waterNotifications.length} bildirim planlandı.` 
            : 'Hatırlatıcılar kapatıldı.'
        );
      } else {
        await clearReminderNotifications('water');
        Alert.alert('Bildirim İzni', 'Bildirim izni verilmedi. Ayarlardan açabilirsiniz.');
      }

      setShowReminderModal(false);
    } catch (error) {
      console.error('Error saving reminder settings:', error);
      Alert.alert('Hata', 'Hatırlatıcı ayarları kaydedilemedi.');
    }
  };

  const handleTestNotification = async () => {
    const success = await sendTestNotification(
      '💧 Test Bildirimi',
      'Bu bir test bildirimidir. Ses ve titreşim çalışıyor mu?'
    );
    if (success) {
      Alert.alert('Gönderildi', 'Test bildirimi gönderildi!');
    }
  };

  const addReminderTime = () => {
    if (newReminderTime && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(newReminderTime)) {
      if (!reminderTimes.includes(newReminderTime)) {
        setReminderTimes([...reminderTimes, newReminderTime].sort());
        setNewReminderTime('');
      } else {
        alert('Bu saat zaten ekli!');
      }
    } else {
      alert('Geçerli bir saat girin (örn: 14:30)');
    }
  };

  const removeReminderTime = (time: string) => {
    setReminderTimes(reminderTimes.filter(t => t !== time));
  };

  const loadData = async () => {
    try {
      const [water, today] = await Promise.all([
        getWeeklyWater(),
        getTodayWater(),
      ]);
      setWeeklyWater(Array.isArray(water) ? water : []);
      setTodayWater((today as any)?.total_amount || 0);
    } catch (error) {
      console.error('Error loading water data:', error);
      setWeeklyWater([]);
      setTodayWater(0);
    }
  };

  const handleAddWater = async (amount: number) => {
    try {
      setLoading(true);
      await addWater(amount);
      await loadData();
      triggerRefresh();
    } catch (error) {
      console.error('Error adding water:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = weeklyWater.map((item) => ({
    value: item.amount / 1000,
    label: new Date(item.date).toLocaleDateString('tr-TR', { weekday: 'short' }),
    frontColor: Colors.teal,
  }));

  const lineChartData = weeklyWater.map((item) => ({
    value: item.amount / 1000,
  }));

  const avgWater =
    weeklyWater.length > 0
      ? weeklyWater.reduce((sum, item) => sum + item.amount, 0) / weeklyWater.length / 1000
      : 0;

  const goal = user?.water_goal || 2500;
  const glassCount = Math.floor(todayWater / 250);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Su Takibi</Text>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setShowReminderModal(true)}
        >
          <Ionicons name="notifications-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Today's Goal */}
        <View style={styles.goalSection}>
          <Text style={styles.goalTitle}>Bugünkü Hedefiniz</Text>
          <View style={styles.circularProgress}>
            <View style={styles.circularInner}>
              <Ionicons name="water" size={32} color={Colors.teal} />
              <Text style={styles.circularText}>Bugün</Text>
              <Text style={styles.circularValue}>{(todayWater / 1000).toFixed(1)}L</Text>
              <Text style={styles.circularSubtext}>/ {(goal / 1000).toFixed(1)}L</Text>
            </View>
          </View>
        </View>

        {/* Glass Count */}
        <View style={styles.glassSection}>
          <View style={styles.glassGrid}>
            {[...Array(Math.min(8, Math.ceil(goal / 250)))].map((_, index) => (
              <View key={index} style={styles.glassItem}>
                <Ionicons
                  name="water"
                  size={32}
                  color={index < glassCount ? Colors.teal : '#E0E0E0'}
                />
              </View>
            ))}
          </View>
          <Text style={styles.glassLabel}>
            {glassCount} / {Math.ceil(goal / 250)} Bardak
          </Text>
        </View>

        {/* Quick Add Buttons */}
        <View style={styles.quickAddSection}>
          <TouchableOpacity
            style={[styles.quickAddButton, loading && styles.buttonDisabled]}
            onPress={() => handleAddWater(250)}
            disabled={loading}
          >
            <Ionicons name="add" size={20} color={Colors.white} />
            <Text style={styles.quickAddText}>250ml</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAddButton, loading && styles.buttonDisabled]}
            onPress={() => handleAddWater(500)}
            disabled={loading}
          >
            <Ionicons name="add" size={20} color={Colors.white} />
            <Text style={styles.quickAddText}>500ml</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAddButton, loading && styles.buttonDisabled]}
            onPress={() => handleAddWater(1000)}
            disabled={loading}
          >
            <Ionicons name="add" size={20} color={Colors.white} />
            <Text style={styles.quickAddText}>1L</Text>
          </TouchableOpacity>
        </View>

        {/* Weekly Average */}
        <View style={styles.avgSection}>
          <Text style={styles.avgLabel}>Haftalık Ortalama</Text>
          <Text style={styles.circularValue}>{avgWater.toFixed(1)}L</Text>
        </View>

        {/* Charts */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Haftalık Su Tüketimi</Text>
          <BarChart
            data={chartData}
            width={screenWidth - 72}
            height={180}
            barWidth={32}
            barBorderRadius={8}
            yAxisThickness={0}
            xAxisThickness={0}
            hideRules
            noOfSections={4}
            maxValue={4}
          />
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Trend</Text>
          <LineChart
            data={lineChartData}
            width={screenWidth - 72}
            height={150}
            color={Colors.teal}
            thickness={3}
            startFillColor={Colors.teal}
            endFillColor={Colors.background}
            startOpacity={0.4}
            endOpacity={0.1}
            initialSpacing={0}
            yAxisColor="transparent"
            xAxisColor="transparent"
            hideRules
            hideDataPoints
          />
        </View>
      </ScrollView>

      {/* Reminder Modal */}
      <Modal visible={showReminderModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Su İçme Hatırlatıcısı</Text>
              <TouchableOpacity onPress={() => setShowReminderModal(false)}>
                <Ionicons name="close" size={28} color={Colors.darkText} />
              </TouchableOpacity>
            </View>

            {/* Enable/Disable Switch */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Hatırlatıcıyı Aç</Text>
              <Switch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
                trackColor={{ false: '#E0E0E0', true: Colors.teal }}
                thumbColor={Colors.white}
              />
            </View>

            {/* Reminder Times */}
            {reminderEnabled && (
              <View style={styles.timesSection}>
                <Text style={styles.sectionLabel}>Hatırlatma Saatleri</Text>
                
                <View style={styles.timesList}>
                  {reminderTimes.map((time) => (
                    <View key={time} style={styles.timeItem}>
                      <Text style={styles.timeText}>{time}</Text>
                      <TouchableOpacity onPress={() => removeReminderTime(time)}>
                        <Ionicons name="close-circle" size={24} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {/* Add New Time */}
                <View style={styles.addTimeRow}>
                  <TextInput
                    style={styles.timeInput}
                    placeholder="HH:MM (örn: 14:30)"
                    value={newReminderTime}
                    onChangeText={setNewReminderTime}
                    keyboardType="numbers-and-punctuation"
                  />
                  <TouchableOpacity style={styles.addTimeButton} onPress={addReminderTime}>
                    <Ionicons name="add" size={24} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Save Button */}
            <TouchableOpacity style={styles.saveButton} onPress={saveReminderSettings}>
              <Text style={styles.saveButtonText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  menuButton: {
    padding: 8,
  },
  content: {
    padding: 16,
  },
  goalSection: {
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
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 12,
    borderColor: Colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  circularInner: {
    alignItems: 'center',
  },
  circularText: {
    fontSize: 14,
    color: Colors.lightText,
  },
  circularValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginVertical: 4,
  },
  circularSubtext: {
    fontSize: 12,
    color: Colors.lightText,
  },
  glassSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  glassGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  glassItem: {
    alignItems: 'center',
  },
  glassLabel: {
    fontSize: 14,
    color: Colors.darkText,
    fontWeight: '600',
    marginTop: 8,
  },
  quickAddSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickAddButton: {
    flex: 1,
    backgroundColor: Colors.teal,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickAddText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  avgSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avgLabel: {
    fontSize: 16,
    color: Colors.darkText,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
  },
  timesSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: 12,
  },
  timesList: {
    gap: 8,
    marginBottom: 16,
  },
  timeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
  },
  addTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  addTimeButton: {
    backgroundColor: Colors.teal,
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
