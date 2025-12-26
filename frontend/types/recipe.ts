/**
 * Recipe Library Type Definitions
 * Premium Recipe Content Schema
 */

// ============================================
// ENUMS & CONSTANTS
// ============================================

export const RECIPE_CATEGORIES = [
  'breakfast',      // Kahvaltı
  'main_course',    // Ana Yemek
  'soup',           // Çorba
  'salad',          // Salata
  'snack',          // Atıştırmalık
  'dessert',        // Tatlı
  'beverage',       // İçecek
  'smoothie',       // Smoothie
  'side_dish',      // Garnitür
] as const;

export type RecipeCategory = typeof RECIPE_CATEGORIES[number];

export const RECIPE_DIFFICULTY = ['easy', 'medium', 'hard'] as const;
export type RecipeDifficulty = typeof RECIPE_DIFFICULTY[number];

export const DIET_TAGS = [
  'vegetarian',
  'vegan',
  'gluten_free',
  'dairy_free',
  'low_carb',
  'high_protein',
  'keto',
  'mediterranean',
  'quick',           // 30 dk altı
  'meal_prep',       // Önceden hazırlanabilir
  'budget_friendly', // Ekonomik
  'kid_friendly',    // Çocuklar için uygun
] as const;

export type DietTag = typeof DIET_TAGS[number];

// ============================================
// CONTENT INTERFACES
// ============================================

export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
  note?: string;  // Örn: "ince doğranmış", "oda sıcaklığında"
}

export interface InstructionStep {
  step: number;
  instruction: string;
  tip?: string;
  duration?: string;  // Örn: "5 dakika"
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

// ============================================
// MAIN RECIPE CONTENT SCHEMA
// ============================================

export interface RecipeContent {
  // Basic Info
  name: string;
  description: string;  // Kısa açıklama (1-2 cümle)
  
  // Time & Servings
  prepTime: string;     // Örn: "15 dakika"
  cookTime: string;     // Örn: "30 dakika"
  totalTime: string;    // Örn: "45 dakika"
  servings: number;
  
  // Ingredients
  ingredients: Ingredient[];
  
  // Instructions
  instructions: InstructionStep[];
  
  // Nutrition (per serving)
  nutrition: NutritionInfo;
  
  // Tips & Notes
  tips: string[];
  storageInfo?: string;  // Saklama bilgisi
  servingSuggestion?: string;  // Servis önerisi
  
  // Variations
  variations?: string[];  // Alternatif versiyonlar
}

// ============================================
// RECIPE METADATA (Premium & UI)
// ============================================

export interface RecipeMetadata {
  id: string;
  isPremium: boolean;
  category: RecipeCategory;
  difficulty: RecipeDifficulty;
  tags: DietTag[];
  imageUrl: string;
  iconName: string;  // Ionicons name
  color: string;     // Hex color for UI
  featured?: boolean;  // Öne çıkan tarif
  version: string;
  lastUpdated: string;
}

// ============================================
// COMBINED RECIPE TYPE
// ============================================

export interface Recipe {
  metadata: RecipeMetadata;
  content: RecipeContent;
}

// ============================================
// CATEGORY LABELS
// ============================================

export const CATEGORY_LABELS: Record<RecipeCategory, { tr: string; en: string; icon: string; color: string }> = {
  breakfast: { tr: 'Kahvaltı', en: 'Breakfast', icon: 'sunny-outline', color: '#FFA726' },
  main_course: { tr: 'Ana Yemek', en: 'Main Course', icon: 'restaurant-outline', color: '#EF5350' },
  soup: { tr: 'Çorba', en: 'Soup', icon: 'cafe-outline', color: '#8D6E63' },
  salad: { tr: 'Salata', en: 'Salad', icon: 'leaf-outline', color: '#66BB6A' },
  snack: { tr: 'Atıştırmalık', en: 'Snack', icon: 'pizza-outline', color: '#AB47BC' },
  dessert: { tr: 'Tatlı', en: 'Dessert', icon: 'ice-cream-outline', color: '#EC407A' },
  beverage: { tr: 'İçecek', en: 'Beverage', icon: 'wine-outline', color: '#42A5F5' },
  smoothie: { tr: 'Smoothie', en: 'Smoothie', icon: 'nutrition-outline', color: '#26A69A' },
  side_dish: { tr: 'Garnitür', en: 'Side Dish', icon: 'grid-outline', color: '#78909C' },
};

export const DIFFICULTY_LABELS: Record<RecipeDifficulty, { tr: string; en: string }> = {
  easy: { tr: 'Kolay', en: 'Easy' },
  medium: { tr: 'Orta', en: 'Medium' },
  hard: { tr: 'Zor', en: 'Hard' },
};

export const TAG_LABELS: Record<DietTag, { tr: string; en: string }> = {
  vegetarian: { tr: 'Vejetaryen', en: 'Vegetarian' },
  vegan: { tr: 'Vegan', en: 'Vegan' },
  gluten_free: { tr: 'Glutensiz', en: 'Gluten Free' },
  dairy_free: { tr: 'Sütsüz', en: 'Dairy Free' },
  low_carb: { tr: 'Düşük Karbonhidrat', en: 'Low Carb' },
  high_protein: { tr: 'Yüksek Protein', en: 'High Protein' },
  keto: { tr: 'Keto', en: 'Keto' },
  mediterranean: { tr: 'Akdeniz', en: 'Mediterranean' },
  quick: { tr: 'Hızlı', en: 'Quick' },
  meal_prep: { tr: 'Hazırlık', en: 'Meal Prep' },
  budget_friendly: { tr: 'Ekonomik', en: 'Budget Friendly' },
  kid_friendly: { tr: 'Çocuklar İçin', en: 'Kid Friendly' },
};
