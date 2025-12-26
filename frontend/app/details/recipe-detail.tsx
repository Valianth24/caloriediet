import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/Colors';
import {
  loadRecipe,
  getRecipeMetadata,
  getCategoryLabel,
  getDifficultyLabel,
  getTagLabel,
  RecipeId,
  CATEGORY_LABELS,
} from '../../content/recipes';
import type { RecipeContent, RecipeMetadata } from '../../types/recipe';

export default function RecipeDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const recipeId = params.recipeId as RecipeId;
  const locale = i18n.language?.startsWith('tr') ? 'tr' : 'en';

  const [loading, setLoading] = useState(true);
  const [recipe, setRecipe] = useState<{ metadata: RecipeMetadata; content: RecipeContent } | null>(null);
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>('ingredients');
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadRecipeData();
  }, [recipeId]);

  const loadRecipeData = async () => {
    setLoading(true);
    try {
      const data = await loadRecipe(recipeId, locale);
      setRecipe(data);
    } catch (error) {
      console.error('Error loading recipe:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleIngredient = (index: number) => {
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedIngredients(newChecked);
  };

  const toggleStep = (step: number) => {
    const newChecked = new Set(checkedSteps);
    if (newChecked.has(step)) {
      newChecked.delete(step);
    } else {
      newChecked.add(step);
    }
    setCheckedSteps(newChecked);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorText}>
          {locale === 'tr' ? 'Tarif bulunamadı' : 'Recipe not found'}
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>{locale === 'tr' ? 'Geri Dön' : 'Go Back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { metadata, content } = recipe;
  const categoryInfo = CATEGORY_LABELS[metadata.category];

  return (
    <View style={styles.container}>
      {/* Header Image */}
      <View style={styles.headerImage}>
        <Image
          source={{ uri: metadata.imageUrl }}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <View style={styles.headerOverlay}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerInfo}>
          <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.color }]}>
            <Ionicons name={categoryInfo.icon as any} size={14} color="#fff" />
            <Text style={styles.categoryBadgeText}>
              {getCategoryLabel(metadata.category, locale)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title & Info */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{content.name}</Text>
          <Text style={styles.description}>{content.description}</Text>

          {/* Quick Info */}
          <View style={styles.quickInfo}>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={20} color={Colors.primary} />
              <Text style={styles.infoLabel}>{locale === 'tr' ? 'Hazırlık' : 'Prep'}</Text>
              <Text style={styles.infoValue}>{content.prepTime}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Ionicons name="flame-outline" size={20} color={Colors.primary} />
              <Text style={styles.infoLabel}>{locale === 'tr' ? 'Pişirme' : 'Cook'}</Text>
              <Text style={styles.infoValue}>{content.cookTime}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Ionicons name="people-outline" size={20} color={Colors.primary} />
              <Text style={styles.infoLabel}>{locale === 'tr' ? 'Porsiyon' : 'Servings'}</Text>
              <Text style={styles.infoValue}>{content.servings}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Ionicons name="speedometer-outline" size={20} color={Colors.primary} />
              <Text style={styles.infoLabel}>{locale === 'tr' ? 'Zorluk' : 'Difficulty'}</Text>
              <Text style={styles.infoValue}>{getDifficultyLabel(metadata.difficulty, locale)}</Text>
            </View>
          </View>

          {/* Tags */}
          <View style={styles.tagsContainer}>
            {metadata.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{getTagLabel(tag, locale)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Nutrition Card */}
        <View style={styles.nutritionCard}>
          <Text style={styles.nutritionTitle}>
            {locale === 'tr' ? 'Besin Değerleri (porsiyon başına)' : 'Nutrition (per serving)'}
          </Text>
          <View style={styles.nutritionGrid}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{content.nutrition.calories || '—'}</Text>
              <Text style={styles.nutritionLabel}>{locale === 'tr' ? 'Kalori' : 'Calories'}</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{content.nutrition.protein || '—'}g</Text>
              <Text style={styles.nutritionLabel}>{locale === 'tr' ? 'Protein' : 'Protein'}</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{content.nutrition.carbs || '—'}g</Text>
              <Text style={styles.nutritionLabel}>{locale === 'tr' ? 'Karb' : 'Carbs'}</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{content.nutrition.fat || '—'}g</Text>
              <Text style={styles.nutritionLabel}>{locale === 'tr' ? 'Yağ' : 'Fat'}</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ingredients' && styles.activeTab]}
            onPress={() => setActiveTab('ingredients')}
          >
            <Ionicons
              name="list-outline"
              size={18}
              color={activeTab === 'ingredients' ? Colors.primary : Colors.lightText}
            />
            <Text style={[styles.tabText, activeTab === 'ingredients' && styles.activeTabText]}>
              {locale === 'tr' ? 'Malzemeler' : 'Ingredients'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'instructions' && styles.activeTab]}
            onPress={() => setActiveTab('instructions')}
          >
            <Ionicons
              name="document-text-outline"
              size={18}
              color={activeTab === 'instructions' ? Colors.primary : Colors.lightText}
            />
            <Text style={[styles.tabText, activeTab === 'instructions' && styles.activeTabText]}>
              {locale === 'tr' ? 'Yapılışı' : 'Instructions'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'ingredients' ? (
          <View style={styles.ingredientsSection}>
            {content.ingredients.map((ingredient, index) => (
              <TouchableOpacity
                key={index}
                style={styles.ingredientItem}
                onPress={() => toggleIngredient(index)}
              >
                <View style={[styles.checkbox, checkedIngredients.has(index) && styles.checkboxChecked]}>
                  {checkedIngredients.has(index) && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </View>
                <Text style={[styles.ingredientText, checkedIngredients.has(index) && styles.ingredientChecked]}>
                  <Text style={styles.ingredientAmount}>{ingredient.amount} {ingredient.unit}</Text>
                  {'  '}{ingredient.name}
                  {ingredient.note && <Text style={styles.ingredientNote}> ({ingredient.note})</Text>}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.instructionsSection}>
            {content.instructions.map((step, index) => (
              <TouchableOpacity
                key={index}
                style={styles.stepItem}
                onPress={() => toggleStep(step.step)}
              >
                <View style={[styles.stepNumber, checkedSteps.has(step.step) && styles.stepNumberChecked]}>
                  {checkedSteps.has(step.step) ? (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  ) : (
                    <Text style={styles.stepNumberText}>{step.step}</Text>
                  )}
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepInstruction, checkedSteps.has(step.step) && styles.stepChecked]}>
                    {step.instruction}
                  </Text>
                  {step.tip && (
                    <View style={styles.tipBox}>
                      <Ionicons name="bulb-outline" size={14} color={Colors.primary} />
                      <Text style={styles.tipText}>{step.tip}</Text>
                    </View>
                  )}
                  {step.duration && (
                    <View style={styles.durationBox}>
                      <Ionicons name="time-outline" size={12} color={Colors.lightText} />
                      <Text style={styles.durationText}>{step.duration}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tips Section */}
        {content.tips && content.tips.length > 0 && (
          <View style={styles.tipsSection}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="bulb-outline" size={18} color={Colors.primary} />
              {'  '}{locale === 'tr' ? 'İpuçları' : 'Tips'}
            </Text>
            {content.tips.map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <Text style={styles.tipBullet}>•</Text>
                <Text style={styles.tipItemText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Storage & Serving */}
        {(content.storageInfo || content.servingSuggestion) && (
          <View style={styles.extraInfoSection}>
            {content.storageInfo && (
              <View style={styles.extraInfoItem}>
                <Ionicons name="snow-outline" size={18} color={Colors.primary} />
                <View style={styles.extraInfoContent}>
                  <Text style={styles.extraInfoLabel}>
                    {locale === 'tr' ? 'Saklama' : 'Storage'}
                  </Text>
                  <Text style={styles.extraInfoText}>{content.storageInfo}</Text>
                </View>
              </View>
            )}
            {content.servingSuggestion && (
              <View style={styles.extraInfoItem}>
                <Ionicons name="restaurant-outline" size={18} color={Colors.primary} />
                <View style={styles.extraInfoContent}>
                  <Text style={styles.extraInfoLabel}>
                    {locale === 'tr' ? 'Servis Önerisi' : 'Serving Suggestion'}
                  </Text>
                  <Text style={styles.extraInfoText}>{content.servingSuggestion}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Variations */}
        {content.variations && content.variations.length > 0 && (
          <View style={styles.variationsSection}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="shuffle-outline" size={18} color={Colors.primary} />
              {'  '}{locale === 'tr' ? 'Varyasyonlar' : 'Variations'}
            </Text>
            {content.variations.map((variation, index) => (
              <View key={index} style={styles.variationItem}>
                <Text style={styles.variationBullet}>{index + 1}</Text>
                <Text style={styles.variationText}>{variation}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: Colors.lightText,
    marginTop: 12,
    marginBottom: 24,
  },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerImage: {
    height: 280,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  content: {
    flex: 1,
    marginTop: -20,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  titleSection: {
    padding: 20,
    paddingTop: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: Colors.lightText,
    lineHeight: 22,
    marginBottom: 16,
  },
  quickInfo: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.lightText,
    marginTop: 4,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 2,
  },
  infoDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagText: {
    fontSize: 12,
    color: Colors.lightText,
    fontWeight: '500',
  },
  nutritionCard: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  nutritionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  nutritionLabel: {
    fontSize: 11,
    color: Colors.lightText,
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: Colors.background,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.lightText,
    marginLeft: 6,
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  ingredientsSection: {
    paddingHorizontal: 16,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  ingredientText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  ingredientChecked: {
    color: Colors.lightText,
    textDecorationLine: 'line-through',
  },
  ingredientAmount: {
    fontWeight: '600',
  },
  ingredientNote: {
    color: Colors.lightText,
    fontStyle: 'italic',
  },
  instructionsSection: {
    paddingHorizontal: 16,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberChecked: {
    backgroundColor: Colors.success,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 24,
  },
  stepChecked: {
    color: Colors.lightText,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: Colors.primary,
    marginLeft: 8,
    lineHeight: 18,
  },
  durationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  durationText: {
    fontSize: 12,
    color: Colors.lightText,
    marginLeft: 4,
  },
  tipsSection: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tipBullet: {
    color: Colors.primary,
    fontSize: 16,
    marginRight: 8,
  },
  tipItemText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  extraInfoSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  extraInfoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  extraInfoContent: {
    flex: 1,
    marginLeft: 12,
  },
  extraInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  extraInfoText: {
    fontSize: 13,
    color: Colors.lightText,
    lineHeight: 18,
  },
  variationsSection: {
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  variationItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  variationBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.border,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginRight: 10,
  },
  variationText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
});
