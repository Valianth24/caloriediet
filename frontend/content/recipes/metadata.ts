/**
 * Recipe Metadata Configuration
 * Contains premium status, categories, and UI settings for all recipes
 */

import { RecipeMetadata, RecipeCategory, RECIPE_CATEGORIES } from '../../types/recipe';

// Recipe IDs - Add new recipes here
export const RECIPE_IDS = [
  // Kahvaltı
  'avocado_toast',
  'protein_pancakes',
  'overnight_oats',
  'veggie_omelette',
  'chia_pudding',
  
  // Ana Yemek
  'grilled_chicken_salad',
  'salmon_vegetables',
  'turkey_meatballs',
  'stuffed_peppers',
  'lentil_curry',
  'quinoa_bowl',
  'baked_cod',
  'chicken_stir_fry',
  
  // Çorba
  'lentil_soup',
  'chicken_vegetable_soup',
  'tomato_basil_soup',
  'broccoli_soup',
  
  // Salata
  'greek_salad',
  'caesar_salad',
  'quinoa_salad',
  'tuna_salad',
  
  // Atıştırmalık
  'hummus',
  'energy_balls',
  'greek_yogurt_parfait',
  'veggie_sticks',
  
  // Smoothie
  'green_smoothie',
  'berry_smoothie',
  'protein_smoothie',
  'tropical_smoothie',
  
  // Tatlı (Sağlıklı)
  'banana_nice_cream',
  'dark_chocolate_mousse',
  'fruit_salad',
] as const;

export type RecipeId = typeof RECIPE_IDS[number];

export const recipeMetadata: Record<RecipeId, RecipeMetadata> = {
  // ============================================
  // KAHVALTI
  // ============================================
  avocado_toast: {
    id: 'avocado_toast',
    isPremium: true,
    category: 'breakfast',
    difficulty: 'easy',
    tags: ['vegetarian', 'quick', 'high_protein'],
    imageUrl: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400',
    iconName: 'leaf-outline',
    color: '#66BB6A',
    featured: true,
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  protein_pancakes: {
    id: 'protein_pancakes',
    isPremium: true,
    category: 'breakfast',
    difficulty: 'easy',
    tags: ['high_protein', 'kid_friendly'],
    imageUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400',
    iconName: 'disc-outline',
    color: '#FFA726',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  overnight_oats: {
    id: 'overnight_oats',
    isPremium: true,
    category: 'breakfast',
    difficulty: 'easy',
    tags: ['vegetarian', 'meal_prep', 'quick'],
    imageUrl: 'https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400',
    iconName: 'time-outline',
    color: '#8D6E63',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  veggie_omelette: {
    id: 'veggie_omelette',
    isPremium: true,
    category: 'breakfast',
    difficulty: 'easy',
    tags: ['vegetarian', 'high_protein', 'low_carb', 'quick'],
    imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400',
    iconName: 'sunny-outline',
    color: '#FFCA28',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  chia_pudding: {
    id: 'chia_pudding',
    isPremium: true,
    category: 'breakfast',
    difficulty: 'easy',
    tags: ['vegan', 'gluten_free', 'meal_prep'],
    imageUrl: 'https://images.unsplash.com/photo-1546039907-7fa05f864c02?w=400',
    iconName: 'nutrition-outline',
    color: '#7E57C2',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },

  // ============================================
  // ANA YEMEK
  // ============================================
  grilled_chicken_salad: {
    id: 'grilled_chicken_salad',
    isPremium: true,
    category: 'main_course',
    difficulty: 'easy',
    tags: ['high_protein', 'low_carb', 'mediterranean'],
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    iconName: 'restaurant-outline',
    color: '#66BB6A',
    featured: true,
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  salmon_vegetables: {
    id: 'salmon_vegetables',
    isPremium: true,
    category: 'main_course',
    difficulty: 'medium',
    tags: ['high_protein', 'mediterranean', 'gluten_free'],
    imageUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400',
    iconName: 'fish-outline',
    color: '#FF7043',
    featured: true,
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  turkey_meatballs: {
    id: 'turkey_meatballs',
    isPremium: true,
    category: 'main_course',
    difficulty: 'medium',
    tags: ['high_protein', 'kid_friendly'],
    imageUrl: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400',
    iconName: 'ellipse-outline',
    color: '#8D6E63',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  stuffed_peppers: {
    id: 'stuffed_peppers',
    isPremium: true,
    category: 'main_course',
    difficulty: 'medium',
    tags: ['high_protein', 'gluten_free', 'mediterranean'],
    imageUrl: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400',
    iconName: 'flame-outline',
    color: '#EF5350',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  lentil_curry: {
    id: 'lentil_curry',
    isPremium: true,
    category: 'main_course',
    difficulty: 'medium',
    tags: ['vegan', 'high_protein', 'budget_friendly'],
    imageUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400',
    iconName: 'leaf-outline',
    color: '#FF9800',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  quinoa_bowl: {
    id: 'quinoa_bowl',
    isPremium: true,
    category: 'main_course',
    difficulty: 'easy',
    tags: ['vegan', 'high_protein', 'gluten_free', 'meal_prep'],
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
    iconName: 'bowl-outline',
    color: '#26A69A',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  baked_cod: {
    id: 'baked_cod',
    isPremium: true,
    category: 'main_course',
    difficulty: 'easy',
    tags: ['high_protein', 'low_carb', 'quick'],
    imageUrl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400',
    iconName: 'fish-outline',
    color: '#42A5F5',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  chicken_stir_fry: {
    id: 'chicken_stir_fry',
    isPremium: true,
    category: 'main_course',
    difficulty: 'medium',
    tags: ['high_protein', 'quick', 'low_carb'],
    imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400',
    iconName: 'flame-outline',
    color: '#F57C00',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },

  // ============================================
  // ÇORBA
  // ============================================
  lentil_soup: {
    id: 'lentil_soup',
    isPremium: true,
    category: 'soup',
    difficulty: 'easy',
    tags: ['vegan', 'high_protein', 'budget_friendly', 'meal_prep'],
    imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400',
    iconName: 'cafe-outline',
    color: '#FF8A65',
    featured: true,
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  chicken_vegetable_soup: {
    id: 'chicken_vegetable_soup',
    isPremium: true,
    category: 'soup',
    difficulty: 'easy',
    tags: ['high_protein', 'low_carb', 'kid_friendly'],
    imageUrl: 'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?w=400',
    iconName: 'cafe-outline',
    color: '#FFCA28',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  tomato_basil_soup: {
    id: 'tomato_basil_soup',
    isPremium: true,
    category: 'soup',
    difficulty: 'easy',
    tags: ['vegan', 'mediterranean', 'quick'],
    imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400',
    iconName: 'cafe-outline',
    color: '#EF5350',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  broccoli_soup: {
    id: 'broccoli_soup',
    isPremium: true,
    category: 'soup',
    difficulty: 'easy',
    tags: ['vegetarian', 'low_carb', 'quick'],
    imageUrl: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400',
    iconName: 'cafe-outline',
    color: '#66BB6A',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },

  // ============================================
  // SALATA
  // ============================================
  greek_salad: {
    id: 'greek_salad',
    isPremium: true,
    category: 'salad',
    difficulty: 'easy',
    tags: ['vegetarian', 'mediterranean', 'quick', 'low_carb'],
    imageUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400',
    iconName: 'leaf-outline',
    color: '#4CAF50',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  caesar_salad: {
    id: 'caesar_salad',
    isPremium: true,
    category: 'salad',
    difficulty: 'easy',
    tags: ['high_protein', 'quick'],
    imageUrl: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400',
    iconName: 'leaf-outline',
    color: '#8BC34A',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  quinoa_salad: {
    id: 'quinoa_salad',
    isPremium: true,
    category: 'salad',
    difficulty: 'easy',
    tags: ['vegan', 'high_protein', 'gluten_free', 'meal_prep'],
    imageUrl: 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=400',
    iconName: 'leaf-outline',
    color: '#26A69A',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  tuna_salad: {
    id: 'tuna_salad',
    isPremium: true,
    category: 'salad',
    difficulty: 'easy',
    tags: ['high_protein', 'low_carb', 'quick', 'meal_prep'],
    imageUrl: 'https://images.unsplash.com/photo-1529059997568-3d847b1154f0?w=400',
    iconName: 'fish-outline',
    color: '#42A5F5',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },

  // ============================================
  // ATIŞTIRMALIK
  // ============================================
  hummus: {
    id: 'hummus',
    isPremium: true,
    category: 'snack',
    difficulty: 'easy',
    tags: ['vegan', 'high_protein', 'mediterranean', 'meal_prep'],
    imageUrl: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=400',
    iconName: 'ellipse-outline',
    color: '#FFCA28',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  energy_balls: {
    id: 'energy_balls',
    isPremium: true,
    category: 'snack',
    difficulty: 'easy',
    tags: ['vegan', 'high_protein', 'meal_prep', 'quick'],
    imageUrl: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400',
    iconName: 'flash-outline',
    color: '#8D6E63',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  greek_yogurt_parfait: {
    id: 'greek_yogurt_parfait',
    isPremium: true,
    category: 'snack',
    difficulty: 'easy',
    tags: ['vegetarian', 'high_protein', 'quick'],
    imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
    iconName: 'layers-outline',
    color: '#EC407A',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  veggie_sticks: {
    id: 'veggie_sticks',
    isPremium: true,
    category: 'snack',
    difficulty: 'easy',
    tags: ['vegan', 'low_carb', 'quick', 'kid_friendly'],
    imageUrl: 'https://images.unsplash.com/photo-1622205313162-be1d5712a43f?w=400',
    iconName: 'nutrition-outline',
    color: '#66BB6A',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },

  // ============================================
  // SMOOTHIE
  // ============================================
  green_smoothie: {
    id: 'green_smoothie',
    isPremium: true,
    category: 'smoothie',
    difficulty: 'easy',
    tags: ['vegan', 'gluten_free', 'quick'],
    imageUrl: 'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=400',
    iconName: 'nutrition-outline',
    color: '#4CAF50',
    featured: true,
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  berry_smoothie: {
    id: 'berry_smoothie',
    isPremium: true,
    category: 'smoothie',
    difficulty: 'easy',
    tags: ['vegetarian', 'quick', 'high_protein'],
    imageUrl: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400',
    iconName: 'nutrition-outline',
    color: '#AB47BC',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  protein_smoothie: {
    id: 'protein_smoothie',
    isPremium: true,
    category: 'smoothie',
    difficulty: 'easy',
    tags: ['vegetarian', 'high_protein', 'quick'],
    imageUrl: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=400',
    iconName: 'barbell-outline',
    color: '#795548',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  tropical_smoothie: {
    id: 'tropical_smoothie',
    isPremium: true,
    category: 'smoothie',
    difficulty: 'easy',
    tags: ['vegan', 'gluten_free', 'quick'],
    imageUrl: 'https://images.unsplash.com/photo-1546039907-7fa05f864c02?w=400',
    iconName: 'sunny-outline',
    color: '#FF9800',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },

  // ============================================
  // TATLI (Sağlıklı)
  // ============================================
  banana_nice_cream: {
    id: 'banana_nice_cream',
    isPremium: true,
    category: 'dessert',
    difficulty: 'easy',
    tags: ['vegan', 'gluten_free', 'kid_friendly'],
    imageUrl: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400',
    iconName: 'ice-cream-outline',
    color: '#FFCA28',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  dark_chocolate_mousse: {
    id: 'dark_chocolate_mousse',
    isPremium: true,
    category: 'dessert',
    difficulty: 'medium',
    tags: ['vegetarian', 'gluten_free'],
    imageUrl: 'https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?w=400',
    iconName: 'heart-outline',
    color: '#5D4037',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
  fruit_salad: {
    id: 'fruit_salad',
    isPremium: true,
    category: 'dessert',
    difficulty: 'easy',
    tags: ['vegan', 'gluten_free', 'quick', 'kid_friendly'],
    imageUrl: 'https://images.unsplash.com/photo-1564093497595-593b96d80180?w=400',
    iconName: 'nutrition-outline',
    color: '#E91E63',
    version: '1.0.0',
    lastUpdated: '2025-01-01',
  },
};

// Helper functions
export const getRecipeMetadata = (id: RecipeId): RecipeMetadata | undefined => {
  return recipeMetadata[id];
};

export const getAllRecipeMetadata = (): RecipeMetadata[] => {
  return RECIPE_IDS.map(id => recipeMetadata[id]);
};

export const getRecipesByCategory = (category: RecipeCategory): RecipeMetadata[] => {
  return getAllRecipeMetadata().filter(r => r.category === category);
};

export const getFeaturedRecipes = (): RecipeMetadata[] => {
  return getAllRecipeMetadata().filter(r => r.featured);
};

export const getRecipesByTag = (tag: string): RecipeMetadata[] => {
  return getAllRecipeMetadata().filter(r => r.tags.includes(tag as any));
};
