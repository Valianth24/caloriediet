/**
 * Generate Diet Content Templates
 * Creates placeholder JSON files for all 20 diets in TR and EN
 */

const fs = require('fs');
const path = require('path');

const DIET_IDS = [
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
];

const DIET_NAMES_TR = {
  mediterranean: 'Akdeniz Diyeti',
  dash: 'DASH Diyeti',
  mind: 'MIND Diyeti',
  portfolio: 'Portföy Diyeti',
  tlc: 'TLC Diyeti',
  nordic: 'İskandinav Diyeti',
  japanese_style: 'Japon Tarzı Beslenme',
  vegetarian: 'Vejetaryen Diyet',
  vegan: 'Vegan Diyet',
  wfpb: 'Tam Gıda Bitkisel Beslenme',
  flexitarian: 'Fleksitaryen Diyet',
  pescatarian: 'Pesketaryen Diyet',
  low_gi_gl: 'Düşük Glisemik İndeks Diyeti',
  diabetes_plate_carb: 'Diyabet Tabak Metodu',
  low_carb: 'Düşük Karbonhidrat Diyeti',
  keto: 'Ketojenik Diyet',
  high_protein_deficit: 'Yüksek Protein Kalori Açığı',
  volumetrics: 'Volumetrics Diyeti',
  time_restricted_eating: 'Zaman Kısıtlamalı Beslenme',
  intermittent_fasting_5_2: 'Aralıklı Oruç 5:2',
};

const DIET_NAMES_EN = {
  mediterranean: 'Mediterranean Diet',
  dash: 'DASH Diet',
  mind: 'MIND Diet',
  portfolio: 'Portfolio Diet',
  tlc: 'TLC Diet',
  nordic: 'Nordic Diet',
  japanese_style: 'Japanese Style Diet',
  vegetarian: 'Vegetarian Diet',
  vegan: 'Vegan Diet',
  wfpb: 'Whole Food Plant-Based Diet',
  flexitarian: 'Flexitarian Diet',
  pescatarian: 'Pescatarian Diet',
  low_gi_gl: 'Low Glycemic Index Diet',
  diabetes_plate_carb: 'Diabetes Plate Method',
  low_carb: 'Low Carbohydrate Diet',
  keto: 'Ketogenic Diet',
  high_protein_deficit: 'High Protein Calorie Deficit',
  volumetrics: 'Volumetrics Diet',
  time_restricted_eating: 'Time Restricted Eating',
  intermittent_fasting_5_2: 'Intermittent Fasting 5:2',
};

// Goals for each diet
const DIET_GOALS = {
  mediterranean: ['heart_health', 'weight_loss', 'longevity', 'brain_health'],
  dash: ['blood_pressure', 'heart_health', 'weight_loss'],
  mind: ['brain_health', 'longevity', 'heart_health'],
  portfolio: ['ldl_cholesterol', 'heart_health'],
  tlc: ['ldl_cholesterol', 'heart_health', 'weight_loss'],
  nordic: ['sustainability', 'weight_loss', 'heart_health'],
  japanese_style: ['longevity', 'heart_health', 'weight_loss'],
  vegetarian: ['sustainability', 'heart_health', 'weight_loss'],
  vegan: ['sustainability', 'heart_health', 'inflammation'],
  wfpb: ['heart_health', 'weight_loss', 'inflammation', 'diabetes_management'],
  flexitarian: ['sustainability', 'weight_loss', 'heart_health'],
  pescatarian: ['heart_health', 'brain_health', 'weight_loss'],
  low_gi_gl: ['glycemic_control', 'diabetes_management', 'weight_loss'],
  diabetes_plate_carb: ['diabetes_management', 'glycemic_control', 'weight_loss'],
  low_carb: ['weight_loss', 'glycemic_control', 'energy'],
  keto: ['weight_loss', 'glycemic_control', 'energy'],
  high_protein_deficit: ['weight_loss', 'muscle_building'],
  volumetrics: ['weight_loss', 'gut_health'],
  time_restricted_eating: ['weight_loss', 'energy', 'longevity'],
  intermittent_fasting_5_2: ['weight_loss', 'longevity', 'energy'],
};

function createTemplate(dietId, locale) {
  const title = locale === 'tr' ? DIET_NAMES_TR[dietId] : DIET_NAMES_EN[dietId];
  const goals = DIET_GOALS[dietId] || ['weight_loss'];
  
  const todoSummary = locale === 'tr' 
    ? `TODO: ${title} hakkında 200-300 karakter açıklama yazılacak.`
    : `TODO: Write 200-300 character description about ${title}.`;
    
  const template = {
    title: title,
    shortSummary: todoSummary,
    whoItsFor: [
      locale === 'tr' ? 'TODO: Hedef kitle 1' : 'TODO: Target audience 1',
      locale === 'tr' ? 'TODO: Hedef kitle 2' : 'TODO: Target audience 2',
      locale === 'tr' ? 'TODO: Hedef kitle 3' : 'TODO: Target audience 3',
      locale === 'tr' ? 'TODO: Hedef kitle 4' : 'TODO: Target audience 4',
      locale === 'tr' ? 'TODO: Hedef kitle 5' : 'TODO: Target audience 5',
    ],
    cautions: [
      {
        group: locale === 'tr' ? 'TODO: Dikkat edilmesi gereken grup 1' : 'TODO: Caution group 1',
        warning: locale === 'tr' ? 'TODO: Uyarı metni 1' : 'TODO: Warning text 1',
      },
      {
        group: locale === 'tr' ? 'TODO: Dikkat edilmesi gereken grup 2' : 'TODO: Caution group 2',
        warning: locale === 'tr' ? 'TODO: Uyarı metni 2' : 'TODO: Warning text 2',
      },
      {
        group: locale === 'tr' ? 'TODO: Dikkat edilmesi gereken grup 3' : 'TODO: Caution group 3',
        warning: locale === 'tr' ? 'TODO: Uyarı metni 3' : 'TODO: Warning text 3',
      },
    ],
    goals: goals,
    corePrinciples: [
      locale === 'tr' ? 'TODO: Temel prensip 1' : 'TODO: Core principle 1',
      locale === 'tr' ? 'TODO: Temel prensip 2' : 'TODO: Core principle 2',
      locale === 'tr' ? 'TODO: Temel prensip 3' : 'TODO: Core principle 3',
      locale === 'tr' ? 'TODO: Temel prensip 4' : 'TODO: Core principle 4',
      locale === 'tr' ? 'TODO: Temel prensip 5' : 'TODO: Core principle 5',
      locale === 'tr' ? 'TODO: Temel prensip 6' : 'TODO: Core principle 6',
      locale === 'tr' ? 'TODO: Temel prensip 7' : 'TODO: Core principle 7',
    ],
    dailyTargets: [
      { item: locale === 'tr' ? 'Sebze' : 'Vegetables', target: 'TODO', note: 'TODO' },
      { item: locale === 'tr' ? 'Meyve' : 'Fruit', target: 'TODO', note: 'TODO' },
      { item: locale === 'tr' ? 'Protein' : 'Protein', target: 'TODO', note: 'TODO' },
      { item: locale === 'tr' ? 'Tahıl' : 'Grains', target: 'TODO', note: 'TODO' },
      { item: locale === 'tr' ? 'Su' : 'Water', target: 'TODO', note: 'TODO' },
    ],
    weeklyTargets: [
      { item: locale === 'tr' ? 'Haftalık hedef 1' : 'Weekly target 1', target: 'TODO', note: 'TODO' },
      { item: locale === 'tr' ? 'Haftalık hedef 2' : 'Weekly target 2', target: 'TODO', note: 'TODO' },
      { item: locale === 'tr' ? 'Haftalık hedef 3' : 'Weekly target 3', target: 'TODO', note: 'TODO' },
      { item: locale === 'tr' ? 'Haftalık hedef 4' : 'Weekly target 4', target: 'TODO', note: 'TODO' },
    ],
    foodsToFocus: [
      { category: locale === 'tr' ? 'Kategori 1' : 'Category 1', examples: ['TODO', 'TODO', 'TODO'] },
      { category: locale === 'tr' ? 'Kategori 2' : 'Category 2', examples: ['TODO', 'TODO', 'TODO'] },
      { category: locale === 'tr' ? 'Kategori 3' : 'Category 3', examples: ['TODO', 'TODO', 'TODO'] },
      { category: locale === 'tr' ? 'Kategori 4' : 'Category 4', examples: ['TODO', 'TODO', 'TODO'] },
      { category: locale === 'tr' ? 'Kategori 5' : 'Category 5', examples: ['TODO', 'TODO', 'TODO'] },
    ],
    foodsToLimit: [
      { category: locale === 'tr' ? 'Sınırlanacak kategori 1' : 'Limit category 1', examples: ['TODO', 'TODO', 'TODO'] },
      { category: locale === 'tr' ? 'Sınırlanacak kategori 2' : 'Limit category 2', examples: ['TODO', 'TODO', 'TODO'] },
      { category: locale === 'tr' ? 'Sınırlanacak kategori 3' : 'Limit category 3', examples: ['TODO', 'TODO', 'TODO'] },
      { category: locale === 'tr' ? 'Sınırlanacak kategori 4' : 'Limit category 4', examples: ['TODO', 'TODO', 'TODO'] },
    ],
    portionGuide: [
      { item: 'TODO', portion: 'TODO', note: 'TODO' },
      { item: 'TODO', portion: 'TODO', note: 'TODO' },
      { item: 'TODO', portion: 'TODO', note: 'TODO' },
      { item: 'TODO', portion: 'TODO', note: 'TODO' },
      { item: 'TODO', portion: 'TODO', note: 'TODO' },
    ],
    sampleDayMenu: {
      breakfast: {
        name: locale === 'tr' ? 'TODO: Kahvaltı' : 'TODO: Breakfast',
        description: locale === 'tr' ? 'TODO: Kahvaltı açıklaması' : 'TODO: Breakfast description',
      },
      lunch: {
        name: locale === 'tr' ? 'TODO: Öğle yemeği' : 'TODO: Lunch',
        description: locale === 'tr' ? 'TODO: Öğle yemeği açıklaması' : 'TODO: Lunch description',
      },
      dinner: {
        name: locale === 'tr' ? 'TODO: Akşam yemeği' : 'TODO: Dinner',
        description: locale === 'tr' ? 'TODO: Akşam yemeği açıklaması' : 'TODO: Dinner description',
      },
      snacks: [
        {
          name: locale === 'tr' ? 'TODO: Ara öğün 1' : 'TODO: Snack 1',
          description: locale === 'tr' ? 'TODO: Ara öğün açıklaması' : 'TODO: Snack description',
        },
        {
          name: locale === 'tr' ? 'TODO: Ara öğün 2' : 'TODO: Snack 2',
          description: locale === 'tr' ? 'TODO: Ara öğün açıklaması' : 'TODO: Snack description',
        },
      ],
    },
    shoppingList: [
      { category: locale === 'tr' ? 'Sebze-Meyve' : 'Produce', items: ['TODO', 'TODO', 'TODO', 'TODO'] },
      { category: locale === 'tr' ? 'Protein' : 'Protein', items: ['TODO', 'TODO', 'TODO'] },
      { category: locale === 'tr' ? 'Tahıl-Baklagil' : 'Grains-Legumes', items: ['TODO', 'TODO', 'TODO'] },
      { category: locale === 'tr' ? 'Yağ-Baharat' : 'Fats-Seasonings', items: ['TODO', 'TODO', 'TODO'] },
    ],
    tips: [
      locale === 'tr' ? 'TODO: İpucu 1' : 'TODO: Tip 1',
      locale === 'tr' ? 'TODO: İpucu 2' : 'TODO: Tip 2',
      locale === 'tr' ? 'TODO: İpucu 3' : 'TODO: Tip 3',
      locale === 'tr' ? 'TODO: İpucu 4' : 'TODO: Tip 4',
      locale === 'tr' ? 'TODO: İpucu 5' : 'TODO: Tip 5',
    ],
    commonMistakes: [
      locale === 'tr' ? 'TODO: Yaygın hata 1' : 'TODO: Common mistake 1',
      locale === 'tr' ? 'TODO: Yaygın hata 2' : 'TODO: Common mistake 2',
      locale === 'tr' ? 'TODO: Yaygın hata 3' : 'TODO: Common mistake 3',
      locale === 'tr' ? 'TODO: Yaygın hata 4' : 'TODO: Common mistake 4',
    ],
    faq: [
      {
        question: locale === 'tr' ? 'TODO: Soru 1?' : 'TODO: Question 1?',
        answer: locale === 'tr' ? 'TODO: Cevap 1' : 'TODO: Answer 1',
      },
      {
        question: locale === 'tr' ? 'TODO: Soru 2?' : 'TODO: Question 2?',
        answer: locale === 'tr' ? 'TODO: Cevap 2' : 'TODO: Answer 2',
      },
      {
        question: locale === 'tr' ? 'TODO: Soru 3?' : 'TODO: Question 3?',
        answer: locale === 'tr' ? 'TODO: Cevap 3' : 'TODO: Answer 3',
      },
      {
        question: locale === 'tr' ? 'TODO: Soru 4?' : 'TODO: Question 4?',
        answer: locale === 'tr' ? 'TODO: Cevap 4' : 'TODO: Answer 4',
      },
      {
        question: locale === 'tr' ? 'TODO: Soru 5?' : 'TODO: Question 5?',
        answer: locale === 'tr' ? 'TODO: Cevap 5' : 'TODO: Answer 5',
      },
    ],
    references: [
      {
        title: 'TODO: Reference 1',
        url: 'TODO: https://example.com',
        note: locale === 'tr' ? 'TODO: Kaynak notu' : 'TODO: Reference note',
      },
      {
        title: 'TODO: Reference 2',
        url: 'TODO: https://example.com',
        note: locale === 'tr' ? 'TODO: Kaynak notu' : 'TODO: Reference note',
      },
      {
        title: 'TODO: Reference 3',
        url: 'TODO: https://example.com',
        note: locale === 'tr' ? 'TODO: Kaynak notu' : 'TODO: Reference note',
      },
    ],
  };

  return template;
}

// Create directories
const localesDir = path.join(__dirname, '..', 'content', 'locales');
const trDir = path.join(localesDir, 'tr');
const enDir = path.join(localesDir, 'en');

[trDir, enDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Generate files for each diet
let created = 0;
DIET_IDS.forEach(dietId => {
  // Skip mediterranean as it's already created with detailed content
  if (dietId === 'mediterranean') {
    console.log(`Skipping ${dietId} (already exists with detailed content)`);
    return;
  }
  
  // Turkish
  const trPath = path.join(trDir, `${dietId}.json`);
  const trContent = createTemplate(dietId, 'tr');
  fs.writeFileSync(trPath, JSON.stringify(trContent, null, 2), 'utf8');
  created++;
  
  // English
  const enPath = path.join(enDir, `${dietId}.json`);
  const enContent = createTemplate(dietId, 'en');
  fs.writeFileSync(enPath, JSON.stringify(enContent, null, 2), 'utf8');
  created++;
});

console.log(`\n✅ Generated ${created} diet template files`);
console.log(`   - ${DIET_IDS.length - 1} TR files in ${trDir}`);
console.log(`   - ${DIET_IDS.length - 1} EN files in ${enDir}`);
console.log(`   - mediterranean already has detailed placeholder content`);
