import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const REMINDER_CHANNEL_ID = 'diet-reminders';
const REMINDER_NOTIFICATION_KEYS: Record<'water' | 'vitamin', string> = {
  water: 'water_reminder_notification_ids',
  vitamin: 'vitamin_reminder_notification_ids',
};

// Check if running in Expo Go
const isExpoGo = 
  Constants.appOwnership === 'expo' || 
  Constants.executionEnvironment === 'storeClient';

let _notifications: any = null;
let _notificationsAvailable = true;

export const getNotifications = () => {
  if (_notifications !== null || !_notificationsAvailable) {
    return _notifications;
  }
  
  try {
    _notifications = require('expo-notifications');
    
    // Setup notification handler
    _notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    
    return _notifications;
  } catch (error) {
    console.log('[Notifications] Module not available');
    _notificationsAvailable = false;
    return null;
  }
};

// Check if notifications are fully supported
export const areNotificationsSupported = (): boolean => {
  // Expo Go on Android doesn't support push notifications properly
  if (isExpoGo && Platform.OS === 'android') {
    return false;
  }
  return _notificationsAvailable && getNotifications() !== null;
};

// Show warning for Expo Go users
export const showExpoGoWarning = () => {
  if (isExpoGo && Platform.OS === 'android') {
    Alert.alert(
      'Bildirim Uyarısı',
      'Expo Go uygulamasında bildirimler sınırlı çalışır. Tam bildirim desteği için uygulamanın yayınlanmış versiyonunu kullanın.',
      [{ text: 'Tamam', style: 'default' }]
    );
    return true;
  }
  return false;
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  // Check if supported first
  if (!areNotificationsSupported()) {
    if (__DEV__) {
      console.log('[Notifications] Not supported in this environment');
    }
    return false;
  }

  const Notifications = getNotifications();
  if (!Notifications) return false;

  try {
    const currentPermissions = await Notifications.getPermissionsAsync();
    let status = currentPermissions.status;

    if (status !== 'granted') {
      const permissionResponse = await Notifications.requestPermissionsAsync();
      status = permissionResponse.status;
    }

    if (status !== 'granted') {
      return false;
    }

    await ensureAndroidChannel();
    return true;
  } catch (error) {
    if (__DEV__) {
      console.log('[Notifications] Permission request error:', error);
    }
    return false;
  }
};

export const ensureAndroidChannel = async () => {
  if (!areNotificationsSupported()) return;
  
  const Notifications = getNotifications();
  if (!Notifications) return;

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
        name: 'Diet Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        enableVibrate: true,
      });
    } catch (error) {
      if (__DEV__) {
        console.log('[Notifications] Channel creation error:', error);
      }
    }
  }
};

export const clearReminderNotifications = async (type: 'water' | 'vitamin') => {
  if (!areNotificationsSupported()) return;
  
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    const storedIds = await AsyncStorage.getItem(REMINDER_NOTIFICATION_KEYS[type]);
    if (storedIds) {
      const ids: string[] = JSON.parse(storedIds);
      await Promise.all(
        ids.map(id => 
          Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)
        )
      );
    }
    await AsyncStorage.removeItem(REMINDER_NOTIFICATION_KEYS[type]);
  } catch (error) {
    if (__DEV__) {
      console.log('[Notifications] Clear error:', error);
    }
  }
};

interface ScheduleReminderOptions {
  type: 'water' | 'vitamin';
  enabled: boolean;
  times: string[];
  content: {
    title: string;
    body: string;
    sound?: string | boolean;
  };
}

export const syncReminderNotifications = async ({ type, enabled, times, content }: ScheduleReminderOptions) => {
  // Check if supported
  if (!areNotificationsSupported()) {
    // Show warning only once when user tries to enable
    if (enabled && isExpoGo && Platform.OS === 'android') {
      showExpoGoWarning();
    }
    return;
  }

  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    // Always clear previously scheduled notifications for this type
    await clearReminderNotifications(type);

    if (!enabled || !times.length) {
      return;
    }

    await ensureAndroidChannel();

    const ids: string[] = [];

    for (const time of times) {
      const [hour, minute] = time.split(':').map(Number);

      if (!Number.isFinite(hour) || !Number.isFinite(minute)) continue;

      try {
        // Use DailyTriggerInput for daily repeating notifications at specific time
        const trigger: any = {
          type: 'daily',
          hour,
          minute,
        };

        // For Android, add channel
        if (Platform.OS === 'android') {
          trigger.channelId = REMINDER_CHANNEL_ID;
        }

        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: content.title,
            body: content.body,
            sound: true, // Always enable sound
            priority: Notifications.AndroidNotificationPriority?.HIGH || 'high',
            vibrate: [0, 250, 250, 250], // Vibration pattern
          },
          trigger,
        });

        ids.push(id);
        console.log(`[Notifications] Scheduled ${type} reminder at ${time}, id: ${id}`);
      } catch (scheduleError) {
        console.log('[Notifications] Schedule error for', time, ':', scheduleError);
        
        // Fallback: try with simpler trigger format
        try {
          const fallbackId = await Notifications.scheduleNotificationAsync({
            content: {
              title: content.title,
              body: content.body,
              sound: true,
            },
            trigger: {
              hour,
              minute,
              repeats: true,
            },
          });
          ids.push(fallbackId);
          console.log(`[Notifications] Fallback scheduled at ${time}, id: ${fallbackId}`);
        } catch (fallbackError) {
          console.log('[Notifications] Fallback also failed:', fallbackError);
        }
      }
    }

    if (ids.length) {
      await AsyncStorage.setItem(REMINDER_NOTIFICATION_KEYS[type], JSON.stringify(ids));
      console.log(`[Notifications] Saved ${ids.length} notification IDs for ${type}`);
    }
  } catch (error) {
    console.log('[Notifications] Sync error:', error);
  }
};

// Get scheduled notifications count (for debugging)
export const getScheduledCount = async (): Promise<number> => {
  if (!areNotificationsSupported()) return 0;
  
  const Notifications = getNotifications();
  if (!Notifications) return 0;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.length;
  } catch {
    return 0;
  }
};
