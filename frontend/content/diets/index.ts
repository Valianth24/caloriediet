/**
 * Diet Content Loader
 * Loads and manages diet content with locale fallback support
 */

import { DietContent, DietId, DIET_IDS, DietLibrary, LocalizedDietBundle } from '../../types/diet';
import { dietMetadata, getDietMetadata, getAllDietMetadata, getPremiumDiets } from './metadata';
import { validateDietContent, getContentCompletion, countTodoPlaceholders } from './validator';

// Import all TR locale files
import mediterranean_tr from '../locales/tr/mediterranean.json';
import dash_tr from '../locales/tr/dash.json';
import mind_tr from '../locales/tr/mind.json';
import portfolio_tr from '../locales/tr/portfolio.json';
import tlc_tr from '../locales/tr/tlc.json';
import nordic_tr from '../locales/tr/nordic.json';
import japanese_style_tr from '../locales/tr/japanese_style.json';
import vegetarian_tr from '../locales/tr/vegetarian.json';
import vegan_tr from '../locales/tr/vegan.json';
import wfpb_tr from '../locales/tr/wfpb.json';
import flexitarian_tr from '../locales/tr/flexitarian.json';
import pescatarian_tr from '../locales/tr/pescatarian.json';
import low_gi_gl_tr from '../locales/tr/low_gi_gl.json';
import diabetes_plate_carb_tr from '../locales/tr/diabetes_plate_carb.json';
import low_carb_tr from '../locales/tr/low_carb.json';
import keto_tr from '../locales/tr/keto.json';
import high_protein_deficit_tr from '../locales/tr/high_protein_deficit.json';
import volumetrics_tr from '../locales/tr/volumetrics.json';
import time_restricted_eating_tr from '../locales/tr/time_restricted_eating.json';
import intermittent_fasting_5_2_tr from '../locales/tr/intermittent_fasting_5_2.json';

// Import all EN locale files
import mediterranean_en from '../locales/en/mediterranean.json';
import dash_en from '../locales/en/dash.json';
import mind_en from '../locales/en/mind.json';
import portfolio_en from '../locales/en/portfolio.json';
import tlc_en from '../locales/en/tlc.json';
import nordic_en from '../locales/en/nordic.json';
import japanese_style_en from '../locales/en/japanese_style.json';
import vegetarian_en from '../locales/en/vegetarian.json';
import vegan_en from '../locales/en/vegan.json';
import wfpb_en from '../locales/en/wfpb.json';
import flexitarian_en from '../locales/en/flexitarian.json';
import pescatarian_en from '../locales/en/pescatarian.json';
import low_gi_gl_en from '../locales/en/low_gi_gl.json';
import diabetes_plate_carb_en from '../locales/en/diabetes_plate_carb.json';
import low_carb_en from '../locales/en/low_carb.json';
import keto_en from '../locales/en/keto.json';
import high_protein_deficit_en from '../locales/en/high_protein_deficit.json';
import volumetrics_en from '../locales/en/volumetrics.json';
import time_restricted_eating_en from '../locales/en/time_restricted_eating.json';
import intermittent_fasting_5_2_en from '../locales/en/intermittent_fasting_5_2.json';

// Content maps by locale
const contentMap: Record<string, Record<DietId, DietContent>> = {
  tr: {
    mediterranean: mediterranean_tr as DietContent,
    dash: dash_tr as DietContent,
    mind: mind_tr as DietContent,
    portfolio: portfolio_tr as DietContent,
    tlc: tlc_tr as DietContent,
    nordic: nordic_tr as DietContent,
    japanese_style: japanese_style_tr as DietContent,
    vegetarian: vegetarian_tr as DietContent,
    vegan: vegan_tr as DietContent,
    wfpb: wfpb_tr as DietContent,
    flexitarian: flexitarian_tr as DietContent,
    pescatarian: pescatarian_tr as DietContent,
    low_gi_gl: low_gi_gl_tr as DietContent,
    diabetes_plate_carb: diabetes_plate_carb_tr as DietContent,
    low_carb: low_carb_tr as DietContent,
    keto: keto_tr as DietContent,
    high_protein_deficit: high_protein_deficit_tr as DietContent,
    volumetrics: volumetrics_tr as DietContent,
    time_restricted_eating: time_restricted_eating_tr as DietContent,
    intermittent_fasting_5_2: intermittent_fasting_5_2_tr as DietContent,
  },
  en: {
    mediterranean: mediterranean_en as DietContent,
    dash: dash_en as DietContent,
    mind: mind_en as DietContent,
    portfolio: portfolio_en as DietContent,
    tlc: tlc_en as DietContent,
    nordic: nordic_en as DietContent,
    japanese_style: japanese_style_en as DietContent,
    vegetarian: vegetarian_en as DietContent,
    vegan: vegan_en as DietContent,
    wfpb: wfpb_en as DietContent,
    flexitarian: flexitarian_en as DietContent,
    pescatarian: pescatarian_en as DietContent,
    low_gi_gl: low_gi_gl_en as DietContent,
    diabetes_plate_carb: diabetes_plate_carb_en as DietContent,
    low_carb: low_carb_en as DietContent,
    keto: keto_en as DietContent,
    high_protein_deficit: high_protein_deficit_en as DietContent,
    volumetrics: volumetrics_en as DietContent,
    time_restricted_eating: time_restricted_eating_en as DietContent,
    intermittent_fasting_5_2: intermittent_fasting_5_2_en as DietContent,
  },
};

// Default locale for fallback
const DEFAULT_LOCALE = 'en';

/**
 * Get diet content for a specific diet and locale
 * Falls back to English if requested locale not available
 */
export const getDietContent = (dietId: DietId, locale: string = 'tr'): DietContent | null => {
  // Try requested locale first
  if (contentMap[locale]?.[dietId]) {
    return contentMap[locale][dietId];
  }
  
  // Fallback to default locale
  if (contentMap[DEFAULT_LOCALE]?.[dietId]) {
    console.warn(`[DietLoader] Locale '${locale}' not found for ${dietId}, falling back to ${DEFAULT_LOCALE}`);
    return contentMap[DEFAULT_LOCALE][dietId];
  }
  
  console.error(`[DietLoader] Diet content not found: ${dietId}`);
  return null;
};

/**
 * Get full diet data (metadata + content) for a specific locale
 */
export const getDiet = (dietId: DietId, locale: string = 'tr') => {
  const metadata = getDietMetadata(dietId);
  const content = getDietContent(dietId, locale);
  
  if (!metadata || !content) {
    return null;
  }
  
  return {
    metadata,
    content,
  };
};

/**
 * Get all diets with metadata and content
 */
export const getAllDiets = (locale: string = 'tr') => {
  return DIET_IDS.map(id => getDiet(id, locale)).filter(Boolean);
};

/**
 * Get all premium diets
 */
export const getAllPremiumDiets = (locale: string = 'tr') => {
  return getAllDiets(locale).filter(diet => diet?.metadata.isPremium);
};

/**
 * Get diets by goal
 */
export const getDietsByGoal = (goal: string, locale: string = 'tr') => {
  return getAllDiets(locale).filter(diet => 
    diet?.metadata.goals.includes(goal as any)
  );
};

/**
 * Get diet content completion status
 */
export const getDietCompletionStatus = (dietId: DietId) => {
  const trContent = getDietContent(dietId, 'tr');
  const enContent = getDietContent(dietId, 'en');
  
  return {
    dietId,
    tr: {
      completion: trContent ? getContentCompletion(trContent) : 0,
      todoCount: trContent ? countTodoPlaceholders(trContent) : 0,
      isValid: trContent ? validateDietContent(trContent).isValid : false,
    },
    en: {
      completion: enContent ? getContentCompletion(enContent) : 0,
      todoCount: enContent ? countTodoPlaceholders(enContent) : 0,
      isValid: enContent ? validateDietContent(enContent).isValid : false,
    },
  };
};

/**
 * Get all diets completion report
 */
export const getAllDietsCompletionReport = () => {
  return DIET_IDS.map(id => getDietCompletionStatus(id));
};

/**
 * Check if a diet content is ready for production (no TODOs)
 */
export const isDietContentReady = (dietId: DietId, locale: string = 'tr'): boolean => {
  const content = getDietContent(dietId, locale);
  if (!content) return false;
  
  return countTodoPlaceholders(content) === 0;
};

/**
 * Get list of available locales
 */
export const getAvailableLocales = (): string[] => {
  return Object.keys(contentMap);
};

// Re-export everything from metadata and validator
export { dietMetadata, getDietMetadata, getAllDietMetadata, getPremiumDiets };
export { validateDietContent, validateDietMetadata, getContentCompletion, countTodoPlaceholders } from './validator';
export type { DietContent, DietId, DietMetadata, DietGoal } from '../../types/diet';
