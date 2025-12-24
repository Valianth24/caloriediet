/**
 * Diet Library Type Definitions
 * Premium Diet Content Schema
 * 
 * All diets must follow this exact schema for i18n compatibility
 */

// ============================================
// ENUMS & CONSTANTS
// ============================================

export const DIET_IDS = [
  'mediterranean',
  'dash',
  'mind',
  'portfolio',
  'tlc',
  'nordic',
  'japanese_style',
  'vegetarian',
  'vegan',
  'wfpb',
  'flexitarian',
  'pescatarian',
  'low_gi_gl',
  'diabetes_plate_carb',
  'low_carb',
  'keto',
  'high_protein_deficit',
  'volumetrics',
  'time_restricted_eating',
  'intermittent_fasting_5_2',
] as const;

export type DietId = typeof DIET_IDS[number];

export const DIET_GOALS = [
  'weight_loss',
  'blood_pressure',
  'ldl_cholesterol',
  'glycemic_control',
  'brain_health',
  'heart_health',
  'sustainability',
  'muscle_building',
  'longevity',
  'gut_health',
  'inflammation',
  'energy',
  'diabetes_management',
] as const;

export type DietGoal = typeof DIET_GOALS[number];

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = typeof MEAL_TYPES[number];

// ============================================
// CONTENT INTERFACES
// ============================================

export interface DietReference {
  title: string;
  url: string;
  note: string;
}

export interface FoodCategory {
  category: string;
  examples: string[];
}

export interface PortionGuide {
  item: string;
  portion: string;
  note: string;
}

export interface MealItem {
  name: string;
  description: string;
}

export interface SampleDayMenu {
  breakfast: MealItem;
  lunch: MealItem;
  dinner: MealItem;
  snacks: MealItem[];
}

export interface ShoppingCategory {
  category: string;
  items: string[];
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface TargetItem {
  item: string;
  target: string; // e.g., "TODO", "4-5 porsiyon"
  note: string;
}

export interface CautionItem {
  group: string;
  warning: string;
}

// ============================================
// MAIN DIET CONTENT SCHEMA
// ============================================

export interface DietContent {
  // A) Title (short)
  title: string;

  // B) Short Summary (200-300 chars target)
  shortSummary: string;

  // C) Who It's For (bullet points)
  whoItsFor: string[];

  // D) Cautions
  cautions: CautionItem[];

  // E) Goals (tag list)
  goals: DietGoal[];

  // F) Core Principles (5-10 items)
  corePrinciples: string[];

  // G) Daily Targets
  dailyTargets: TargetItem[];

  // H) Weekly Targets
  weeklyTargets: TargetItem[];

  // I) Foods to Focus
  foodsToFocus: FoodCategory[];

  // J) Foods to Limit
  foodsToLimit: FoodCategory[];

  // K) Portion Guide
  portionGuide: PortionGuide[];

  // L) Sample Day Menu
  sampleDayMenu: SampleDayMenu;

  // M) Shopping List
  shoppingList: ShoppingCategory[];

  // N) Tips
  tips: string[];

  // O) Common Mistakes
  commonMistakes: string[];

  // P) FAQ
  faq: FAQ[];

  // Q) References
  references: DietReference[];
}

// ============================================
// DIET METADATA (Premium & UI)
// ============================================

export interface DietMetadata {
  id: DietId;
  isPremium: boolean;
  preview: string; // Short preview for non-premium users
  version: string;
  lastUpdated: string; // ISO date string
  tags: string[];
  goals: DietGoal[];
  difficulty: 'easy' | 'moderate' | 'advanced';
  duration: string; // e.g., "ongoing", "30 days"
  imageUrl: string;
  iconName: string; // Ionicons name
  color: string; // Hex color for UI
}

// ============================================
// COMBINED DIET TYPE
// ============================================

export interface Diet {
  metadata: DietMetadata;
  content: DietContent;
}

// ============================================
// LOCALIZED DIET BUNDLE
// ============================================

export interface LocalizedDietBundle {
  tr: DietContent;
  en: DietContent;
  // Add more locales as needed
}

export interface DietLibrary {
  [dietId: string]: {
    metadata: DietMetadata;
    locales: LocalizedDietBundle;
  };
}

// ============================================
// VALIDATION HELPERS
// ============================================

export const REQUIRED_CONTENT_KEYS: (keyof DietContent)[] = [
  'title',
  'shortSummary',
  'whoItsFor',
  'cautions',
  'goals',
  'corePrinciples',
  'dailyTargets',
  'weeklyTargets',
  'foodsToFocus',
  'foodsToLimit',
  'portionGuide',
  'sampleDayMenu',
  'shoppingList',
  'tips',
  'commonMistakes',
  'faq',
  'references',
];

export const REQUIRED_METADATA_KEYS: (keyof DietMetadata)[] = [
  'id',
  'isPremium',
  'preview',
  'version',
  'lastUpdated',
  'tags',
  'goals',
  'difficulty',
  'duration',
  'imageUrl',
  'iconName',
  'color',
];
