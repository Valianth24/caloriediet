/**
 * Diet Content Validator
 * Validates diet content files against the schema
 */

import {
  DietContent,
  DietMetadata,
  REQUIRED_CONTENT_KEYS,
  REQUIRED_METADATA_KEYS,
  DIET_GOALS,
  DietGoal,
} from '../../types/diet';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate diet content against schema
 */
export const validateDietContent = (content: any, locale: string = 'unknown'): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check required keys
  for (const key of REQUIRED_CONTENT_KEYS) {
    if (!(key in content)) {
      errors.push({
        field: key,
        message: `Missing required field: ${key}`,
        severity: 'error',
      });
    }
  }

  // Validate title
  if (content.title) {
    if (typeof content.title !== 'string' || content.title.length < 2) {
      errors.push({
        field: 'title',
        message: 'Title must be a non-empty string',
        severity: 'error',
      });
    }
    if (content.title === 'TODO' || content.title.includes('TODO')) {
      warnings.push({
        field: 'title',
        message: 'Title contains TODO placeholder',
        severity: 'warning',
      });
    }
  }

  // Validate shortSummary
  if (content.shortSummary) {
    if (typeof content.shortSummary !== 'string') {
      errors.push({
        field: 'shortSummary',
        message: 'shortSummary must be a string',
        severity: 'error',
      });
    } else {
      if (content.shortSummary.length < 50) {
        warnings.push({
          field: 'shortSummary',
          message: `shortSummary is too short (${content.shortSummary.length} chars, target: 200-300)`,
          severity: 'warning',
        });
      }
      if (content.shortSummary.includes('TODO')) {
        warnings.push({
          field: 'shortSummary',
          message: 'shortSummary contains TODO placeholder',
          severity: 'warning',
        });
      }
    }
  }

  // Validate whoItsFor
  if (content.whoItsFor) {
    if (!Array.isArray(content.whoItsFor)) {
      errors.push({
        field: 'whoItsFor',
        message: 'whoItsFor must be an array',
        severity: 'error',
      });
    } else if (content.whoItsFor.length < 1) {
      warnings.push({
        field: 'whoItsFor',
        message: 'whoItsFor should have at least 1 item',
        severity: 'warning',
      });
    }
  }

  // Validate goals
  if (content.goals) {
    if (!Array.isArray(content.goals)) {
      errors.push({
        field: 'goals',
        message: 'goals must be an array',
        severity: 'error',
      });
    } else {
      for (const goal of content.goals) {
        if (!DIET_GOALS.includes(goal as DietGoal)) {
          warnings.push({
            field: 'goals',
            message: `Invalid goal: ${goal}. Valid goals: ${DIET_GOALS.join(', ')}`,
            severity: 'warning',
          });
        }
      }
    }
  }

  // Validate corePrinciples
  if (content.corePrinciples) {
    if (!Array.isArray(content.corePrinciples)) {
      errors.push({
        field: 'corePrinciples',
        message: 'corePrinciples must be an array',
        severity: 'error',
      });
    } else {
      if (content.corePrinciples.length < 5) {
        warnings.push({
          field: 'corePrinciples',
          message: `corePrinciples should have 5-10 items (has ${content.corePrinciples.length})`,
          severity: 'warning',
        });
      }
    }
  }

  // Validate sampleDayMenu structure
  if (content.sampleDayMenu) {
    const menu = content.sampleDayMenu;
    const requiredMeals = ['breakfast', 'lunch', 'dinner', 'snacks'];
    for (const meal of requiredMeals) {
      if (!(meal in menu)) {
        errors.push({
          field: `sampleDayMenu.${meal}`,
          message: `Missing meal: ${meal}`,
          severity: 'error',
        });
      } else if (meal !== 'snacks') {
        if (!menu[meal].name || !menu[meal].description) {
          errors.push({
            field: `sampleDayMenu.${meal}`,
            message: `${meal} must have name and description`,
            severity: 'error',
          });
        }
      }
    }
  }

  // Validate arrays have proper structure
  const arrayFields = ['dailyTargets', 'weeklyTargets', 'foodsToFocus', 'foodsToLimit', 'portionGuide', 'shoppingList', 'faq', 'references'];
  for (const field of arrayFields) {
    if (content[field] && !Array.isArray(content[field])) {
      errors.push({
        field,
        message: `${field} must be an array`,
        severity: 'error',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate diet metadata
 */
export const validateDietMetadata = (metadata: any): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  for (const key of REQUIRED_METADATA_KEYS) {
    if (!(key in metadata)) {
      errors.push({
        field: key,
        message: `Missing required metadata field: ${key}`,
        severity: 'error',
      });
    }
  }

  // Validate isPremium
  if ('isPremium' in metadata && typeof metadata.isPremium !== 'boolean') {
    errors.push({
      field: 'isPremium',
      message: 'isPremium must be a boolean',
      severity: 'error',
    });
  }

  // Validate version format
  if (metadata.version && !/^\d+\.\d+\.\d+$/.test(metadata.version)) {
    warnings.push({
      field: 'version',
      message: 'version should follow semver format (e.g., 1.0.0)',
      severity: 'warning',
    });
  }

  // Validate lastUpdated is ISO date
  if (metadata.lastUpdated) {
    const date = new Date(metadata.lastUpdated);
    if (isNaN(date.getTime())) {
      errors.push({
        field: 'lastUpdated',
        message: 'lastUpdated must be a valid ISO date string',
        severity: 'error',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate all diets in library
 */
export const validateDietLibrary = (library: any): Map<string, ValidationResult> => {
  const results = new Map<string, ValidationResult>();

  for (const [dietId, dietData] of Object.entries(library)) {
    const data = dietData as any;
    
    // Validate metadata
    const metadataResult = validateDietMetadata(data.metadata);
    
    // Validate each locale
    if (data.locales) {
      for (const [locale, content] of Object.entries(data.locales)) {
        const contentResult = validateDietContent(content, locale);
        results.set(`${dietId}.${locale}`, contentResult);
      }
    }
    
    results.set(`${dietId}.metadata`, metadataResult);
  }

  return results;
};

/**
 * Check if content has TODO placeholders
 */
export const countTodoPlaceholders = (content: any): number => {
  const str = JSON.stringify(content);
  const matches = str.match(/TODO/g);
  return matches ? matches.length : 0;
};

/**
 * Get completion percentage for a diet content
 */
export const getContentCompletion = (content: DietContent): number => {
  const todoCount = countTodoPlaceholders(content);
  // Estimate: each TODO represents ~5% incomplete
  // Max 100 TODOs expected in empty template
  const completion = Math.max(0, 100 - (todoCount * 1));
  return Math.min(100, completion);
};
