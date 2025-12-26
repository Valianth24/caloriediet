/**
 * Generate Recipe Content Templates
 * Creates placeholder JSON files for all recipes in TR and EN
 */

const fs = require('fs');
const path = require('path');

const RECIPE_IDS = [
  'avocado_toast', 'protein_pancakes', 'overnight_oats', 'veggie_omelette', 'chia_pudding',
  'grilled_chicken_salad', 'salmon_vegetables', 'turkey_meatballs', 'stuffed_peppers',
  'lentil_curry', 'quinoa_bowl', 'baked_cod', 'chicken_stir_fry',
  'lentil_soup', 'chicken_vegetable_soup', 'tomato_basil_soup', 'broccoli_soup',
  'greek_salad', 'caesar_salad', 'quinoa_salad', 'tuna_salad',
  'hummus', 'energy_balls', 'greek_yogurt_parfait', 'veggie_sticks',
  'green_smoothie', 'berry_smoothie', 'protein_smoothie', 'tropical_smoothie',
  'banana_nice_cream', 'dark_chocolate_mousse', 'fruit_salad'
];

const RECIPE_NAMES_TR = {
  avocado_toast: 'Avokadolu Tost',
  protein_pancakes: 'Proteinli Pankek',
  overnight_oats: 'Gece Yulafı',
  veggie_omelette: 'Sebzeli Omlet',
  chia_pudding: 'Chia Puding',
  grilled_chicken_salad: 'Izgara Tavuklu Salata',
  salmon_vegetables: 'Sebzeli Somon',
  turkey_meatballs: 'Hindi Köfte',
  stuffed_peppers: 'Dolma Biber',
  lentil_curry: 'Mercimekli Köri',
  quinoa_bowl: 'Kinoa Bowl',
  baked_cod: 'Fırında Morina',
  chicken_stir_fry: 'Tavuklu Stir Fry',
  lentil_soup: 'Mercimek Çorbası',
  chicken_vegetable_soup: 'Tavuklu Sebze Çorbası',
  tomato_basil_soup: 'Domates Fesleğen Çorbası',
  broccoli_soup: 'Brokoli Çorbası',
  greek_salad: 'Yunan Salatası',
  caesar_salad: 'Sezar Salata',
  quinoa_salad: 'Kinoa Salatası',
  tuna_salad: 'Ton Balıklı Salata',
  hummus: 'Humus',
  energy_balls: 'Enerji Topları',
  greek_yogurt_parfait: 'Yoğurtlu Parfait',
  veggie_sticks: 'Sebze Çubukları',
  green_smoothie: 'Yeşil Smoothie',
  berry_smoothie: 'Meyveli Smoothie',
  protein_smoothie: 'Protein Smoothie',
  tropical_smoothie: 'Tropik Smoothie',
  banana_nice_cream: 'Muzlu Dondurma',
  dark_chocolate_mousse: 'Bitter Çikolatalı Mus',
  fruit_salad: 'Meyve Salatası'
};

const RECIPE_NAMES_EN = {
  avocado_toast: 'Avocado Toast',
  protein_pancakes: 'Protein Pancakes',
  overnight_oats: 'Overnight Oats',
  veggie_omelette: 'Veggie Omelette',
  chia_pudding: 'Chia Pudding',
  grilled_chicken_salad: 'Grilled Chicken Salad',
  salmon_vegetables: 'Salmon with Vegetables',
  turkey_meatballs: 'Turkey Meatballs',
  stuffed_peppers: 'Stuffed Peppers',
  lentil_curry: 'Lentil Curry',
  quinoa_bowl: 'Quinoa Bowl',
  baked_cod: 'Baked Cod',
  chicken_stir_fry: 'Chicken Stir Fry',
  lentil_soup: 'Lentil Soup',
  chicken_vegetable_soup: 'Chicken Vegetable Soup',
  tomato_basil_soup: 'Tomato Basil Soup',
  broccoli_soup: 'Broccoli Soup',
  greek_salad: 'Greek Salad',
  caesar_salad: 'Caesar Salad',
  quinoa_salad: 'Quinoa Salad',
  tuna_salad: 'Tuna Salad',
  hummus: 'Hummus',
  energy_balls: 'Energy Balls',
  greek_yogurt_parfait: 'Greek Yogurt Parfait',
  veggie_sticks: 'Veggie Sticks',
  green_smoothie: 'Green Smoothie',
  berry_smoothie: 'Berry Smoothie',
  protein_smoothie: 'Protein Smoothie',
  tropical_smoothie: 'Tropical Smoothie',
  banana_nice_cream: 'Banana Nice Cream',
  dark_chocolate_mousse: 'Dark Chocolate Mousse',
  fruit_salad: 'Fruit Salad'
};

function createTemplate(recipeId, locale) {
  const name = locale === 'tr' ? RECIPE_NAMES_TR[recipeId] : RECIPE_NAMES_EN[recipeId];
  
  return {
    name: name,
    description: locale === 'tr' 
      ? `TODO: ${name} açıklaması (1-2 cümle).`
      : `TODO: ${name} description (1-2 sentences).`,
    prepTime: locale === 'tr' ? 'TODO: X dakika' : 'TODO: X minutes',
    cookTime: locale === 'tr' ? 'TODO: X dakika' : 'TODO: X minutes',
    totalTime: locale === 'tr' ? 'TODO: X dakika' : 'TODO: X minutes',
    servings: 2,
    ingredients: [
      { name: 'TODO', amount: 'TODO', unit: locale === 'tr' ? 'adet' : 'piece', note: 'TODO' },
      { name: 'TODO', amount: 'TODO', unit: locale === 'tr' ? 'su bardağı' : 'cup' },
      { name: 'TODO', amount: 'TODO', unit: locale === 'tr' ? 'yemek kaşığı' : 'tbsp' },
      { name: 'TODO', amount: 'TODO', unit: locale === 'tr' ? 'çay kaşığı' : 'tsp' },
      { name: 'TODO', amount: 'TODO', unit: 'gr' }
    ],
    instructions: [
      { step: 1, instruction: 'TODO', tip: 'TODO', duration: 'TODO' },
      { step: 2, instruction: 'TODO', tip: 'TODO' },
      { step: 3, instruction: 'TODO' },
      { step: 4, instruction: 'TODO' },
      { step: 5, instruction: 'TODO' }
    ],
    nutrition: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0
    },
    tips: [
      locale === 'tr' ? 'TODO: İpucu 1' : 'TODO: Tip 1',
      locale === 'tr' ? 'TODO: İpucu 2' : 'TODO: Tip 2',
      locale === 'tr' ? 'TODO: İpucu 3' : 'TODO: Tip 3'
    ],
    storageInfo: locale === 'tr' ? 'TODO: Saklama bilgisi' : 'TODO: Storage info',
    servingSuggestion: locale === 'tr' ? 'TODO: Servis önerisi' : 'TODO: Serving suggestion',
    variations: [
      locale === 'tr' ? 'TODO: Varyasyon 1' : 'TODO: Variation 1',
      locale === 'tr' ? 'TODO: Varyasyon 2' : 'TODO: Variation 2'
    ]
  };
}

// Create directories
const trDir = path.join(__dirname, '..', 'content', 'locales', 'tr', 'recipes');
const enDir = path.join(__dirname, '..', 'content', 'locales', 'en', 'recipes');

[trDir, enDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Generate files
let created = 0;
RECIPE_IDS.forEach(recipeId => {
  // Skip avocado_toast TR - already exists with detailed content
  if (recipeId === 'avocado_toast') {
    // Only create EN
    const enPath = path.join(enDir, `${recipeId}.json`);
    if (!fs.existsSync(enPath)) {
      const enContent = createTemplate(recipeId, 'en');
      fs.writeFileSync(enPath, JSON.stringify(enContent, null, 2), 'utf8');
      created++;
    }
    return;
  }
  
  // TR
  const trPath = path.join(trDir, `${recipeId}.json`);
  if (!fs.existsSync(trPath)) {
    const trContent = createTemplate(recipeId, 'tr');
    fs.writeFileSync(trPath, JSON.stringify(trContent, null, 2), 'utf8');
    created++;
  }
  
  // EN
  const enPath = path.join(enDir, `${recipeId}.json`);
  if (!fs.existsSync(enPath)) {
    const enContent = createTemplate(recipeId, 'en');
    fs.writeFileSync(enPath, JSON.stringify(enContent, null, 2), 'utf8');
    created++;
  }
});

console.log(`✅ Generated ${created} recipe template files`);
