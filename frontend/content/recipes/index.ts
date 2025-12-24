/**
 * Recipe Content Loader
 * Loads and manages recipe content with locale fallback support
 */

import { RecipeContent, RecipeCategory, RECIPE_CATEGORIES, CATEGORY_LABELS, DIFFICULTY_LABELS, TAG_LABELS } from '../../types/recipe';
import { recipeMetadata, RECIPE_IDS, RecipeId, getRecipeMetadata, getAllRecipeMetadata, getRecipesByCategory, getFeaturedRecipes, getRecipesByTag } from './metadata';

// Lazy load recipe content to avoid bundling all recipes
const recipeContentLoaders: Record<string, Record<RecipeId, () => Promise<RecipeContent>>> = {
  tr: {
    avocado_toast: () => import('../locales/tr/recipes/avocado_toast.json').then(m => m.default as RecipeContent),
    protein_pancakes: () => import('../locales/tr/recipes/protein_pancakes.json').then(m => m.default as RecipeContent),
    overnight_oats: () => import('../locales/tr/recipes/overnight_oats.json').then(m => m.default as RecipeContent),
    veggie_omelette: () => import('../locales/tr/recipes/veggie_omelette.json').then(m => m.default as RecipeContent),
    chia_pudding: () => import('../locales/tr/recipes/chia_pudding.json').then(m => m.default as RecipeContent),
    grilled_chicken_salad: () => import('../locales/tr/recipes/grilled_chicken_salad.json').then(m => m.default as RecipeContent),
    salmon_vegetables: () => import('../locales/tr/recipes/salmon_vegetables.json').then(m => m.default as RecipeContent),
    turkey_meatballs: () => import('../locales/tr/recipes/turkey_meatballs.json').then(m => m.default as RecipeContent),
    stuffed_peppers: () => import('../locales/tr/recipes/stuffed_peppers.json').then(m => m.default as RecipeContent),
    lentil_curry: () => import('../locales/tr/recipes/lentil_curry.json').then(m => m.default as RecipeContent),
    quinoa_bowl: () => import('../locales/tr/recipes/quinoa_bowl.json').then(m => m.default as RecipeContent),
    baked_cod: () => import('../locales/tr/recipes/baked_cod.json').then(m => m.default as RecipeContent),
    chicken_stir_fry: () => import('../locales/tr/recipes/chicken_stir_fry.json').then(m => m.default as RecipeContent),
    lentil_soup: () => import('../locales/tr/recipes/lentil_soup.json').then(m => m.default as RecipeContent),
    chicken_vegetable_soup: () => import('../locales/tr/recipes/chicken_vegetable_soup.json').then(m => m.default as RecipeContent),
    tomato_basil_soup: () => import('../locales/tr/recipes/tomato_basil_soup.json').then(m => m.default as RecipeContent),
    broccoli_soup: () => import('../locales/tr/recipes/broccoli_soup.json').then(m => m.default as RecipeContent),
    greek_salad: () => import('../locales/tr/recipes/greek_salad.json').then(m => m.default as RecipeContent),
    caesar_salad: () => import('../locales/tr/recipes/caesar_salad.json').then(m => m.default as RecipeContent),
    quinoa_salad: () => import('../locales/tr/recipes/quinoa_salad.json').then(m => m.default as RecipeContent),
    tuna_salad: () => import('../locales/tr/recipes/tuna_salad.json').then(m => m.default as RecipeContent),
    hummus: () => import('../locales/tr/recipes/hummus.json').then(m => m.default as RecipeContent),
    energy_balls: () => import('../locales/tr/recipes/energy_balls.json').then(m => m.default as RecipeContent),
    greek_yogurt_parfait: () => import('../locales/tr/recipes/greek_yogurt_parfait.json').then(m => m.default as RecipeContent),
    veggie_sticks: () => import('../locales/tr/recipes/veggie_sticks.json').then(m => m.default as RecipeContent),
    green_smoothie: () => import('../locales/tr/recipes/green_smoothie.json').then(m => m.default as RecipeContent),
    berry_smoothie: () => import('../locales/tr/recipes/berry_smoothie.json').then(m => m.default as RecipeContent),
    protein_smoothie: () => import('../locales/tr/recipes/protein_smoothie.json').then(m => m.default as RecipeContent),
    tropical_smoothie: () => import('../locales/tr/recipes/tropical_smoothie.json').then(m => m.default as RecipeContent),
    banana_nice_cream: () => import('../locales/tr/recipes/banana_nice_cream.json').then(m => m.default as RecipeContent),
    dark_chocolate_mousse: () => import('../locales/tr/recipes/dark_chocolate_mousse.json').then(m => m.default as RecipeContent),
    fruit_salad: () => import('../locales/tr/recipes/fruit_salad.json').then(m => m.default as RecipeContent),
  },
  en: {
    avocado_toast: () => import('../locales/en/recipes/avocado_toast.json').then(m => m.default as RecipeContent),
    protein_pancakes: () => import('../locales/en/recipes/protein_pancakes.json').then(m => m.default as RecipeContent),
    overnight_oats: () => import('../locales/en/recipes/overnight_oats.json').then(m => m.default as RecipeContent),
    veggie_omelette: () => import('../locales/en/recipes/veggie_omelette.json').then(m => m.default as RecipeContent),
    chia_pudding: () => import('../locales/en/recipes/chia_pudding.json').then(m => m.default as RecipeContent),
    grilled_chicken_salad: () => import('../locales/en/recipes/grilled_chicken_salad.json').then(m => m.default as RecipeContent),
    salmon_vegetables: () => import('../locales/en/recipes/salmon_vegetables.json').then(m => m.default as RecipeContent),
    turkey_meatballs: () => import('../locales/en/recipes/turkey_meatballs.json').then(m => m.default as RecipeContent),
    stuffed_peppers: () => import('../locales/en/recipes/stuffed_peppers.json').then(m => m.default as RecipeContent),
    lentil_curry: () => import('../locales/en/recipes/lentil_curry.json').then(m => m.default as RecipeContent),
    quinoa_bowl: () => import('../locales/en/recipes/quinoa_bowl.json').then(m => m.default as RecipeContent),
    baked_cod: () => import('../locales/en/recipes/baked_cod.json').then(m => m.default as RecipeContent),
    chicken_stir_fry: () => import('../locales/en/recipes/chicken_stir_fry.json').then(m => m.default as RecipeContent),
    lentil_soup: () => import('../locales/en/recipes/lentil_soup.json').then(m => m.default as RecipeContent),
    chicken_vegetable_soup: () => import('../locales/en/recipes/chicken_vegetable_soup.json').then(m => m.default as RecipeContent),
    tomato_basil_soup: () => import('../locales/en/recipes/tomato_basil_soup.json').then(m => m.default as RecipeContent),
    broccoli_soup: () => import('../locales/en/recipes/broccoli_soup.json').then(m => m.default as RecipeContent),
    greek_salad: () => import('../locales/en/recipes/greek_salad.json').then(m => m.default as RecipeContent),
    caesar_salad: () => import('../locales/en/recipes/caesar_salad.json').then(m => m.default as RecipeContent),
    quinoa_salad: () => import('../locales/en/recipes/quinoa_salad.json').then(m => m.default as RecipeContent),
    tuna_salad: () => import('../locales/en/recipes/tuna_salad.json').then(m => m.default as RecipeContent),
    hummus: () => import('../locales/en/recipes/hummus.json').then(m => m.default as RecipeContent),
    energy_balls: () => import('../locales/en/recipes/energy_balls.json').then(m => m.default as RecipeContent),
    greek_yogurt_parfait: () => import('../locales/en/recipes/greek_yogurt_parfait.json').then(m => m.default as RecipeContent),
    veggie_sticks: () => import('../locales/en/recipes/veggie_sticks.json').then(m => m.default as RecipeContent),
    green_smoothie: () => import('../locales/en/recipes/green_smoothie.json').then(m => m.default as RecipeContent),
    berry_smoothie: () => import('../locales/en/recipes/berry_smoothie.json').then(m => m.default as RecipeContent),
    protein_smoothie: () => import('../locales/en/recipes/protein_smoothie.json').then(m => m.default as RecipeContent),
    tropical_smoothie: () => import('../locales/en/recipes/tropical_smoothie.json').then(m => m.default as RecipeContent),
    banana_nice_cream: () => import('../locales/en/recipes/banana_nice_cream.json').then(m => m.default as RecipeContent),
    dark_chocolate_mousse: () => import('../locales/en/recipes/dark_chocolate_mousse.json').then(m => m.default as RecipeContent),
    fruit_salad: () => import('../locales/en/recipes/fruit_salad.json').then(m => m.default as RecipeContent),
  },
};

const DEFAULT_LOCALE = 'en';

/**
 * Load recipe content for a specific recipe and locale
 */
export const loadRecipeContent = async (recipeId: RecipeId, locale: string = 'tr'): Promise<RecipeContent | null> => {
  try {
    // Try requested locale
    if (recipeContentLoaders[locale]?.[recipeId]) {
      return await recipeContentLoaders[locale][recipeId]();
    }
    
    // Fallback to default
    if (recipeContentLoaders[DEFAULT_LOCALE]?.[recipeId]) {
      console.warn(`[RecipeLoader] Locale '${locale}' not found for ${recipeId}, falling back to ${DEFAULT_LOCALE}`);
      return await recipeContentLoaders[DEFAULT_LOCALE][recipeId]();
    }
    
    return null;
  } catch (error) {
    console.error(`[RecipeLoader] Error loading recipe ${recipeId}:`, error);
    return null;
  }
};

/**
 * Get full recipe (metadata + content)
 */
export const loadRecipe = async (recipeId: RecipeId, locale: string = 'tr') => {
  const metadata = getRecipeMetadata(recipeId);
  const content = await loadRecipeContent(recipeId, locale);
  
  if (!metadata || !content) {
    return null;
  }
  
  return { metadata, content };
};

/**
 * Get category label based on locale
 */
export const getCategoryLabel = (category: RecipeCategory, locale: string = 'tr'): string => {
  return CATEGORY_LABELS[category]?.[locale as 'tr' | 'en'] || category;
};

/**
 * Get all categories with labels
 */
export const getAllCategories = (locale: string = 'tr') => {
  return RECIPE_CATEGORIES.map(cat => ({
    id: cat,
    label: getCategoryLabel(cat, locale),
    icon: CATEGORY_LABELS[cat].icon,
    color: CATEGORY_LABELS[cat].color,
    count: getRecipesByCategory(cat).length,
  }));
};

/**
 * Get difficulty label
 */
export const getDifficultyLabel = (difficulty: string, locale: string = 'tr'): string => {
  return DIFFICULTY_LABELS[difficulty as keyof typeof DIFFICULTY_LABELS]?.[locale as 'tr' | 'en'] || difficulty;
};

/**
 * Get tag label
 */
export const getTagLabel = (tag: string, locale: string = 'tr'): string => {
  return TAG_LABELS[tag as keyof typeof TAG_LABELS]?.[locale as 'tr' | 'en'] || tag;
};

// Re-exports
export { 
  recipeMetadata, 
  RECIPE_IDS, 
  getRecipeMetadata, 
  getAllRecipeMetadata, 
  getRecipesByCategory,
  getFeaturedRecipes,
  getRecipesByTag,
};

export type { RecipeId } from './metadata';
export type { RecipeContent, RecipeCategory, RecipeMetadata, Ingredient, InstructionStep, NutritionInfo } from '../../types/recipe';
export { RECIPE_CATEGORIES, CATEGORY_LABELS, DIFFICULTY_LABELS, TAG_LABELS } from '../../types/recipe';
