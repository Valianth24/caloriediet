// Diet Programs Content - 20 Diet Templates
// Used by diet-program.tsx to display 30-day meal plans

export interface DietProgram {
  id: string;
  name_tr: string;
  name_en: string;
  description_tr: string;
  description_en: string;
  image: string;
  duration_days: number;
  target_calories: number;
  category: 'weight_loss' | 'muscle_building' | 'balanced' | 'vegetarian' | 'vegan' | 'keto' | 'paleo';
  macros: {
    protein: number; // percentage
    carbs: number;
    fat: number;
  };
  days: DayProgram[];
}

export interface DayProgram {
  day: number;
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snacks?: Meal[];
}

export interface Meal {
  name_tr: string;
  name_en: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients_tr?: string[];
  ingredients_en?: string[];
}

// Example: Keto Diet 30-day program
export const ketoDiet30: DietProgram = {
  id: 'keto_30',
  name_tr: 'Keto Diyeti',
  name_en: 'Keto Diet',
  description_tr: 'Düşük karbonhidratlı, yüksek yağlı diyet programı. Keto diyeti, vücudunuzu yağ yakma moduna sokar.',
  description_en: 'Low-carb, high-fat diet program. Keto diet puts your body into fat-burning mode.',
  image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600',
  duration_days: 30,
  target_calories: 1800,
  category: 'keto',
  macros: {
    protein: 25,
    carbs: 5,
    fat: 70
  },
  days: [
    {
      day: 1,
      breakfast: {
        name_tr: 'Omlet (3 yumurta, peynir, zeytin)',
        name_en: 'Omelet (3 eggs, cheese, olives)',
        calories: 450,
        protein: 25,
        carbs: 5,
        fat: 35,
        ingredients_tr: ['3 yumurta', '50g beyaz peynir', '10 zeytin', 'Tereyağı'],
        ingredients_en: ['3 eggs', '50g white cheese', '10 olives', 'Butter']
      },
      lunch: {
        name_tr: 'Izgara Tavuk Göğsü + Yeşil Salata',
        name_en: 'Grilled Chicken Breast + Green Salad',
        calories: 500,
        protein: 45,
        carbs: 10,
        fat: 30
      },
      dinner: {
        name_tr: 'Somon Balığı + Brokoli',
        name_en: 'Salmon + Broccoli',
        calories: 550,
        protein: 40,
        carbs: 8,
        fat: 38
      },
      snacks: [
        {
          name_tr: 'Ceviz (30g)',
          name_en: 'Walnuts (30g)',
          calories: 200,
          protein: 5,
          carbs: 4,
          fat: 18
        }
      ]
    },
    {
      day: 2,
      breakfast: {
        name_tr: 'Yumurtalı Sucuk + Avokado',
        name_en: 'Eggs with Sausage + Avocado',
        calories: 480,
        protein: 22,
        carbs: 6,
        fat: 40
      },
      lunch: {
        name_tr: 'Köfte + Yoğurt + Salata',
        name_en: 'Meatballs + Yogurt + Salad',
        calories: 520,
        protein: 38,
        carbs: 12,
        fat: 35
      },
      dinner: {
        name_tr: 'Izgara Bonfile + Mantar Sote',
        name_en: 'Grilled Steak + Mushroom Sauté',
        calories: 550,
        protein: 42,
        carbs: 8,
        fat: 38
      }
    },
    // Days 3-30 would follow similar pattern
    // For brevity, showing structure only
  ]
};

// Mediterranean Diet
export const mediterraneanDiet30: DietProgram = {
  id: 'mediterranean_30',
  name_tr: 'Akdeniz Diyeti',
  name_en: 'Mediterranean Diet',
  description_tr: 'Zeytinyağı, balık, sebze ve tam tahıllara dayalı dengeli beslenme.',
  description_en: 'Balanced nutrition based on olive oil, fish, vegetables and whole grains.',
  image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
  duration_days: 30,
  target_calories: 2000,
  category: 'balanced',
  macros: {
    protein: 20,
    carbs: 50,
    fat: 30
  },
  days: [
    {
      day: 1,
      breakfast: {
        name_tr: 'Tam Buğday Ekmeği + Beyaz Peynir + Domates + Zeytin',
        name_en: 'Whole Wheat Bread + White Cheese + Tomatoes + Olives',
        calories: 400,
        protein: 18,
        carbs: 45,
        fat: 15
      },
      lunch: {
        name_tr: 'Izgara Balık + Bulgur Pilavı + Yeşil Salata',
        name_en: 'Grilled Fish + Bulgur Pilaf + Green Salad',
        calories: 550,
        protein: 35,
        carbs: 55,
        fat: 18
      },
      dinner: {
        name_tr: 'Tavuk Şiş + Közlenmiş Sebzeler',
        name_en: 'Chicken Kebab + Roasted Vegetables',
        calories: 500,
        protein: 40,
        carbs: 45,
        fat: 18
      },
      snacks: [
        {
          name_tr: 'Meyve + Yoğurt',
          name_en: 'Fruit + Yogurt',
          calories: 150,
          protein: 8,
          carbs: 25,
          fat: 3
        }
      ]
    }
  ]
};

// Muscle Building Diet
export const muscleBuildingDiet60: DietProgram = {
  id: 'muscle_60',
  name_tr: 'Kas Yapma Diyeti',
  name_en: 'Muscle Building Diet',
  description_tr: 'Yüksek proteinli, kas gelişimi için optimize edilmiş beslenme programı.',
  description_en: 'High-protein nutrition program optimized for muscle growth.',
  image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
  duration_days: 60,
  target_calories: 2500,
  category: 'muscle_building',
  macros: {
    protein: 35,
    carbs: 45,
    fat: 20
  },
  days: [
    {
      day: 1,
      breakfast: {
        name_tr: 'Yulaf + Protein Tozu + Muz',
        name_en: 'Oatmeal + Protein Powder + Banana',
        calories: 500,
        protein: 35,
        carbs: 65,
        fat: 12
      },
      lunch: {
        name_tr: 'Tavuk Göğsü (200g) + Pirinç + Brokoli',
        name_en: 'Chicken Breast (200g) + Rice + Broccoli',
        calories: 650,
        protein: 55,
        carbs: 70,
        fat: 15
      },
      dinner: {
        name_tr: 'Biftek + Patates + Salata',
        name_en: 'Steak + Potatoes + Salad',
        calories: 700,
        protein: 50,
        carbs: 65,
        fat: 22
      },
      snacks: [
        {
          name_tr: 'Protein Bar',
          name_en: 'Protein Bar',
          calories: 250,
          protein: 20,
          carbs: 25,
          fat: 8
        },
        {
          name_tr: 'Badem + Kuruyemiş',
          name_en: 'Almonds + Nuts',
          calories: 200,
          protein: 8,
          carbs: 15,
          fat: 14
        }
      ]
    }
  ]
};

// Vegetarian Diet
export const vegetarianDiet30: DietProgram = {
  id: 'vegetarian_30',
  name_tr: 'Vejetaryen Diyeti',
  name_en: 'Vegetarian Diet',
  description_tr: 'Bitkisel protein kaynaklarıyla dengeli beslenme programı.',
  description_en: 'Balanced nutrition with plant-based protein sources.',
  image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600',
  duration_days: 30,
  target_calories: 1900,
  category: 'vegetarian',
  macros: {
    protein: 20,
    carbs: 55,
    fat: 25
  },
  days: [
    {
      day: 1,
      breakfast: {
        name_tr: 'Yumurta + Tam Buğday Ekmeği + Avokado',
        name_en: 'Eggs + Whole Wheat Bread + Avocado',
        calories: 420,
        protein: 22,
        carbs: 45,
        fat: 18
      },
      lunch: {
        name_tr: 'Mercimek Çorbası + Bulgur Pilavı + Cacık',
        name_en: 'Lentil Soup + Bulgur Pilaf + Tzatziki',
        calories: 500,
        protein: 20,
        carbs: 70,
        fat: 15
      },
      dinner: {
        name_tr: 'Nohut + Sebze Yemeği + Yoğurt',
        name_en: 'Chickpeas + Vegetable Dish + Yogurt',
        calories: 480,
        protein: 25,
        carbs: 65,
        fat: 14
      },
      snacks: [
        {
          name_tr: 'Smoothie (Muz, Yaban Mersini, Yoğurt)',
          name_en: 'Smoothie (Banana, Blueberries, Yogurt)',
          calories: 180,
          protein: 10,
          carbs: 30,
          fat: 4
        }
      ]
    }
  ]
};

// Export all diets
export const allDietPrograms: DietProgram[] = [
  ketoDiet30,
  mediterraneanDiet30,
  muscleBuildingDiet60,
  vegetarianDiet30
];

// Helper function to get diet by ID
export const getDietProgramById = (id: string): DietProgram | undefined => {
  return allDietPrograms.find(diet => diet.id === id);
};

// Helper function to get diet by category
export const getDietProgramsByCategory = (category: string): DietProgram[] => {
  return allDietPrograms.filter(diet => diet.category === category);
};
