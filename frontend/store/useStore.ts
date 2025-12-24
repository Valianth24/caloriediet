import { create } from 'zustand';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  height?: number;
  weight?: number;
  target_weight?: number;
  age?: number;
  gender?: string;
  activity_level?: string;
  goal?: string;
  daily_calorie_goal?: number;
  bmr?: number;
  tdee?: number;
  water_goal?: number;
  step_goal?: number;
  is_premium?: boolean;
  premium_expires_at?: string;
  ads_watched?: number;
}

interface DailySummary {
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
}

interface WaterData {
  total_amount: number;
}

interface StepData {
  steps: number;
}

interface AppStore {
  user: User | null;
  dailySummary: DailySummary | null;
  waterData: WaterData | null;
  stepData: StepData | null;
  
  setUser: (user: User | null) => void;
  setDailySummary: (summary: DailySummary) => void;
  setWaterData: (water: WaterData) => void;
  setStepData: (steps: StepData) => void;
  
  refreshData: boolean;
  triggerRefresh: () => void;
  
  // Reset all store data on logout
  resetStore: () => void;
}

const initialState = {
  user: null,
  dailySummary: null,
  waterData: null,
  stepData: null,
  refreshData: false,
};

export const useStore = create<AppStore>((set) => ({
  ...initialState,
  
  setUser: (user) => set({ user }),
  setDailySummary: (summary) => set({ dailySummary: summary }),
  setWaterData: (water) => set({ waterData: water }),
  setStepData: (steps) => set({ stepData: steps }),
  
  triggerRefresh: () => set((state) => ({ refreshData: !state.refreshData })),
  
  resetStore: () => set(initialState),
}));
