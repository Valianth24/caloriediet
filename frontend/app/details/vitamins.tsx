import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getVitaminTemplates, getUserVitamins, addVitamin, toggleVitamin, deleteVitamin } from '../../utils/api';
import { Colors } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store/useStore';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogBox } from 'react-native';
import { clearReminderNotifications, requestNotificationPermission, syncReminderNotifications } from '../../utils/notifications';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

interface Vitamin {
  vitamin_id: string;
  name: string;
  time: string;
  is_taken: boolean;
}

export default function VitaminsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { refreshData, user } = useStore();
  const [vitamins, setVitamins] = useState<Vitamin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [newVitaminName, setNewVitaminName] = useState('');
  const [newVitaminTime, setNewVitaminTime] = useState('Her Sabah');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTimes, setReminderTimes] = useState<string[]>(['09:00', '21:00']);
  const [alarmStyle, setAlarmStyle] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initial load only
  useEffect(() => {
    loadVitamins(true);
    loadReminderSettings();
  }, []);

  // Refresh when refreshData changes (but not on initial mount)
  useEffect(() => {
    if (initialized) {
      loadVitamins(false);
    }
  }, [refreshData]);

  const loadReminderSettings = async () => {
    try {
      const enabled = await AsyncStorage.getItem('vitamin_reminder_enabled');
      const times = await AsyncStorage.getItem('vitamin_reminder_times');
      const alarm = await AsyncStorage.getItem('vitamin_alarm_style');
      
      if (enabled) setReminderEnabled(enabled === 'true');
      if (times) setReminderTimes(JSON.parse(times));
      if (alarm) setAlarmStyle(alarm === 'true');
    } catch (error) {
      console.error('Error loading reminder settings:', error);
    }
  };

  const loadVitamins = async (isInitial: boolean = false) => {
    try {
      setLoading(true);
      const userVitamins = await getUserVitamins() as Vitamin[] | null;
      
      // Only create default vitamins on first load, not on every refresh
      if ((!userVitamins || !Array.isArray(userVitamins) || userVitamins.length === 0) && isInitial && !initialized) {
        const templates = await getVitaminTemplates() as Array<{name: string, default_time: string}> | null;
        if (templates && Array.isArray(templates)) {
          for (const template of templates) {
            await addVitamin(template.name, template.default_time);
          }
        }
        const newUserVitamins = await getUserVitamins() as Vitamin[] | null;
        setVitamins(Array.isArray(newUserVitamins) ? newUserVitamins : []);
        setInitialized(true);
      } else {
        setVitamins(Array.isArray(userVitamins) ? userVitamins : []);
        if (isInitial) setInitialized(true);
      }
    } catch (error) {
      console.error('Error loading vitamins:', error);
      setVitamins([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (vitaminId: string) => {
    try {
      await toggleVitamin(vitaminId);
      await loadVitamins(false);
    } catch (error) {
      console.error('Error toggling vitamin:', error);
    }
  };

  const handleDeleteVitamin = async (vitaminId: string) => {
    try {
      await deleteVitamin(vitaminId);
      await loadVitamins(false);
    } catch (error) {
      console.error('Error deleting vitamin:', error);
    }
  };

  const handleAddVitamin = async () => {
    const trimmedName = newVitaminName.trim();
    const trimmedTime = newVitaminTime.trim();

    if (!trimmedName || !trimmedTime) {
      alert('Vitamin adı ve zamanını doldurun.');
      return;
    }
    try {
      await addVitamin(trimmedName, trimmedTime);
      await loadVitamins(false);
      setShowAddModal(false);
      setNewVitaminName('');
      setNewVitaminTime('Her Sabah');
    } catch (error) {
      console.error('Error adding vitamin:', error);
    }
  };

  const handleSaveReminders = async () => {
    try {
      // Save settings first (fast)
      await AsyncStorage.setItem('vitamin_reminder_enabled', String(reminderEnabled));
      await AsyncStorage.setItem('vitamin_reminder_times', JSON.stringify(reminderTimes));
      await AsyncStorage.setItem('vitamin_alarm_style', String(alarmStyle));

      // Request permission (may show dialog)
      const hasPermission = await requestNotificationPermission();

      if (hasPermission) {
        // Schedule notifications with timeout to prevent hanging
        const syncPromise = syncReminderNotifications({
          type: 'vitamin',
          enabled: reminderEnabled,
          times: reminderTimes,
          content: {
            title: alarmStyle ? '🔔 VITAMIN ZAMANI!' : 'Vitamin Hatırlatıcı',
            body: 'Vitaminlerinizi almayı unutmayın!',
            sound: alarmStyle ? 'default' : undefined,
          },
        });

        // Timeout after 10 seconds max
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 10000)
        );

        try {
          await Promise.race([syncPromise, timeoutPromise]);
          alert(reminderEnabled ? 'Hatırlatıcılar kaydedildi!' : 'Hatırlatıcılar kapatıldı.');
        } catch (timeoutError) {
          // Still show success - settings are saved
          alert(reminderEnabled ? 'Ayarlar kaydedildi. Bildirimler arka planda ayarlanıyor.' : 'Hatırlatıcılar kapatıldı.');
        }
      } else {
        await clearReminderNotifications('vitamin');
        alert('Bildirim izni verilmedi. Ayarlardan açabilirsiniz.');
      }

      setShowReminderModal(false);
    } catch (error) {
      console.error('Error saving reminders:', error);
      alert('Ayarlar kaydedildi.');
      setShowReminderModal(false);
    }
  };

  const addReminderTime = () => {
    if (reminderTimes.length < 5) {
      setReminderTimes([...reminderTimes, '12:00']);
    }
  };

  const removeReminderTime = (index: number) => {
    setReminderTimes(reminderTimes.filter((_, i) => i !== index));
  };

  const updateReminderTime = (index: number, value: string) => {
    const newTimes = [...reminderTimes];
    newTimes[index] = value;
    setReminderTimes(newTimes);
  };

  const takenCount = vitamins.filter(v => v.is_taken).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vitamin Takipleri</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={24} color={Colors.darkText} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Progress */}
        <View style={styles.progressCard}>
          <Text style={styles.progressText}>{takenCount} / {vitamins.length} Vitamin Alındı</Text>
        </View>

        {/* Vitamin List */}
        <View style={styles.vitaminList}>
          {vitamins.map((vitamin) => (
            <View key={vitamin.vitamin_id} style={styles.vitaminItemContainer}>
              <TouchableOpacity
                style={styles.vitaminItem}
                onPress={() => handleToggle(vitamin.vitamin_id)}
                activeOpacity={0.7}
              >
                <View style={styles.vitaminLeft}>
                  <View style={styles.vitaminIcon}>
                    <Ionicons name="medical" size={24} color={Colors.primary} />
                  </View>
                  <View style={styles.vitaminInfo}>
                    <Text style={styles.vitaminName}>{vitamin.name}</Text>
                    <Text style={styles.vitaminTime}>{vitamin.time}</Text>
                  </View>
                </View>
                <View style={styles.vitaminRight}>
                  <Ionicons
                    name={vitamin.is_taken ? 'checkmark-circle' : 'close-circle'}
                    size={32}
                    color={vitamin.is_taken ? Colors.success : Colors.error}
                  />
                  <Text
                    style={[
                      styles.vitaminStatus,
                      { color: vitamin.is_taken ? Colors.success : Colors.lightText },
                    ]}
                  >
                    {vitamin.is_taken ? 'Alındı' : 'Alınmadı'}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteVitamin(vitamin.vitamin_id)}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Reminder Button */}
        <TouchableOpacity
          style={styles.reminderButton}
          onPress={() => setShowReminderModal(true)}
        >
          <Ionicons name="notifications" size={24} color={Colors.white} />
          <Text style={styles.reminderButtonText}>Hatırlatıcıları Ayarla</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Vitamin Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yeni Vitamin Ekle</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Vitamin Adı"
              value={newVitaminName}
              onChangeText={setNewVitaminName}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Zaman (örn: Her Sabah)"
              value={newVitaminTime}
              onChangeText={setNewVitaminTime}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonAdd]}
                onPress={handleAddVitamin}
              >
                <Text style={styles.modalButtonText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reminder Settings Modal */}
      <Modal visible={showReminderModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Hatırlatıcı Ayarları</Text>
              
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Hatırlatıcıları Aç</Text>
                <Switch
                  value={reminderEnabled}
                  onValueChange={setReminderEnabled}
                  trackColor={{ false: '#E0E0E0', true: Colors.primary }}
                  thumbColor={Colors.white}
                />
              </View>

              {reminderEnabled && (
                <>
                  <Text style={styles.sectionTitle}>Hatırlatma Saatleri</Text>
                  {reminderTimes.map((time, index) => (
                    <View key={index} style={styles.timeRow}>
                      <TextInput
                        style={styles.timeInput}
                        value={time}
                        onChangeText={(value) => updateReminderTime(index, value)}
                        placeholder="HH:MM"
                        keyboardType="numbers-and-punctuation"
                      />
                      {reminderTimes.length > 1 && (
                        <TouchableOpacity onPress={() => removeReminderTime(index)}>
                          <Ionicons name="trash" size={24} color={Colors.error} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  
                  {reminderTimes.length < 5 && (
                    <TouchableOpacity style={styles.addTimeButton} onPress={addReminderTime}>
                      <Ionicons name="add-circle" size={24} color={Colors.primary} />
                      <Text style={styles.addTimeText}>Saat Ekle</Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.switchRow}>
                    <View>
                      <Text style={styles.switchLabel}>Alarm Tarzı Bildirim</Text>
                      <Text style={styles.switchSubtext}>Maksimum ses ve titreşim</Text>
                    </View>
                    <Switch
                      value={alarmStyle}
                      onValueChange={setAlarmStyle}
                      trackColor={{ false: '#E0E0E0', true: Colors.primary }}
                      thumbColor={Colors.white}
                    />
                  </View>
                </>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowReminderModal(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonAdd]}
                  onPress={handleSaveReminders}
                >
                  <Text style={styles.modalButtonText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={32} color={Colors.white} />
      </TouchableOpacity>
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
  progressCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  progressText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  vitaminList: {
    gap: 12,
    marginBottom: 80,
  },
  vitaminItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vitaminItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteButton: {
    width: 44,
    height: 44,
    backgroundColor: Colors.white,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  vitaminLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  vitaminIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vitaminInfo: {
    flex: 1,
  },
  vitaminName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: 4,
  },
  vitaminTime: {
    fontSize: 14,
    color: Colors.lightText,
  },
  vitaminRight: {
    alignItems: 'center',
    gap: 4,
  },
  vitaminStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  reminderButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  reminderButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
  },
  switchSubtext: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
    marginTop: 16,
    marginBottom: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  timeInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  addTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  addTimeText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: Colors.background,
  },
  modalButtonAdd: {
    backgroundColor: Colors.primary,
  },
  modalButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextCancel: {
    color: Colors.darkText,
    fontSize: 16,
    fontWeight: '600',
  },
});
