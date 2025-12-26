import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

interface StepData {
  steps: number;
  date: string;
  lastSync: string;
}

class PedometerService {
  private subscription: any = null;
  private stepCount: number = 0;
  private todayDate: string = '';
  private isAvailable: boolean = false;
  private syncInterval: any = null;
  private listeners: Set<(steps: number) => void> = new Set();

  async initialize() {
    console.log('[Pedometer] Initializing...');
    
    // Check if pedometer is available
    const available = await Pedometer.isAvailableAsync();
    this.isAvailable = available;
    
    if (!available) {
      console.log('[Pedometer] Not available on this device');
      return false;
    }

    // Request permissions (iOS only)
    if (Platform.OS === 'ios') {
      const { status } = await Pedometer.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('[Pedometer] Permission denied');
        return false;
      }
    }

    // Load today's steps from storage
    await this.loadTodaySteps();

    // Start listening to step count updates
    this.startListening();

    // Sync steps every 5 minutes
    this.startSyncInterval();

    console.log('[Pedometer] Initialized successfully');
    return true;
  }

  private async loadTodaySteps() {
    const today = new Date().toISOString().split('T')[0];
    this.todayDate = today;

    try {
      const storedData = await AsyncStorage.getItem('pedometer_today');
      if (storedData) {
        const data: StepData = JSON.parse(storedData);
        if (data.date === today) {
          this.stepCount = data.steps;
          console.log('[Pedometer] Loaded stored steps:', this.stepCount);
        } else {
          // New day, reset
          this.stepCount = 0;
          await this.saveTodaySteps();
        }
      }
    } catch (error) {
      console.error('[Pedometer] Error loading steps:', error);
    }
  }

  private async saveTodaySteps() {
    const data: StepData = {
      steps: this.stepCount,
      date: this.todayDate,
      lastSync: new Date().toISOString()
    };

    try {
      await AsyncStorage.setItem('pedometer_today', JSON.stringify(data));
    } catch (error) {
      console.error('[Pedometer] Error saving steps:', error);
    }
  }

  private startListening() {
    if (this.subscription) {
      this.subscription.remove();
    }

    // Get steps from midnight to now
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();

    this.subscription = Pedometer.watchStepCount((result) => {
      // Update step count
      this.stepCount = result.steps;
      
      // Save to storage
      this.saveTodaySteps();
      
      // Notify listeners
      this.notifyListeners();
      
      console.log('[Pedometer] Steps updated:', this.stepCount);
    });

    // Also get historical steps for today
    Pedometer.getStepCountAsync(start, end)
      .then((result) => {
        if (result.steps > this.stepCount) {
          this.stepCount = result.steps;
          this.saveTodaySteps();
          this.notifyListeners();
          console.log('[Pedometer] Historical steps loaded:', this.stepCount);
        }
      })
      .catch((error) => {
        console.error('[Pedometer] Error getting historical steps:', error);
      });
  }

  private startSyncInterval() {
    // Sync to backend every 5 minutes
    this.syncInterval = setInterval(() => {
      this.syncToBackend();
    }, 5 * 60 * 1000); // 5 minutes

    // Initial sync
    this.syncToBackend();
  }

  private async syncToBackend() {
    if (this.stepCount === 0) return;

    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || '';
      const token = await AsyncStorage.getItem('session_token');

      if (!token || !backendUrl) {
        console.log('[Pedometer] No token or backend URL for sync');
        return;
      }

      const response = await fetch(`${backendUrl}/api/steps/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          steps: this.stepCount,
          date: this.todayDate
        })
      });

      if (response.ok) {
        console.log('[Pedometer] Synced to backend:', this.stepCount, 'steps');
      } else {
        console.error('[Pedometer] Sync failed:', response.status);
      }
    } catch (error) {
      console.error('[Pedometer] Error syncing to backend:', error);
    }
  }

  // Subscribe to step updates
  subscribe(callback: (steps: number) => void) {
    this.listeners.add(callback);
    // Immediately call with current value
    callback(this.stepCount);
  }

  // Unsubscribe from step updates
  unsubscribe(callback: (steps: number) => void) {
    this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.stepCount));
  }

  getCurrentSteps(): number {
    return this.stepCount;
  }

  isServiceAvailable(): boolean {
    return this.isAvailable;
  }

  stop() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.listeners.clear();
    console.log('[Pedometer] Service stopped');
  }

  // Manual step add (for testing or manual entry)
  async addManualSteps(steps: number) {
    this.stepCount += steps;
    await this.saveTodaySteps();
    await this.syncToBackend();
    this.notifyListeners();
  }
}

// Singleton instance
export const pedometerService = new PedometerService();
