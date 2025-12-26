import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const { width: screenWidth } = Dimensions.get('window');

// Get backend URL from app.config.js extra or environment
const API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL 
  || process.env.EXPO_PUBLIC_BACKEND_URL 
  || 'https://caloriediet-backend.onrender.com';

interface DetectedItem {
  label: string;
  aliases: string[];
  portion: {
    estimate_g: number;
    range_g: number[];
    basis: string;
  };
  confidence: number;
  food_id: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface VisionResult {
  items: DetectedItem[];
  notes: string[];
  needs_user_confirmation: boolean;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
}

export default function VisionResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [editedItems, setEditedItems] = useState<DetectedItem[]>([]);
  const [saving, setSaving] = useState(false);
  const imageBase64 = params.image as string;

  useEffect(() => {
    if (imageBase64) {
      analyzeImage();
    }
  }, [imageBase64]);

  const analyzeImage = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('session_token');
      
      const response = await fetch(`${API_BASE_URL}/api/meal/vision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          image_base64: imageBase64,
          locale: 'tr-TR',
        }),
      });

      if (!response.ok) {
        throw new Error('Analiz başarısız');
      }

      const data = await response.json();
      setResult(data);
      setEditedItems(data.items);
    } catch (error) {
      console.error('Vision analysis error:', error);
      Alert.alert('Hata', 'Yemek analizi yapılamadı. Tekrar deneyin.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const updateItemGrams = (index: number, grams: number) => {
    const newItems = [...editedItems];
    const item = newItems[index];
    const scale = grams / item.portion.estimate_g;
    
    newItems[index] = {
      ...item,
      portion: { ...item.portion, estimate_g: grams },
      calories: Math.round(item.calories * scale),
      protein: Math.round(item.protein * scale * 10) / 10,
      carbs: Math.round(item.carbs * scale * 10) / 10,
      fat: Math.round(item.fat * scale * 10) / 10,
    };
    
    setEditedItems(newItems);
  };

  const getTotals = () => {
    return editedItems.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const saveMeal = async () => {
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('session_token');
      const totals = getTotals();
      
      const mealName = editedItems.map(item => item.label).join(', ');
      
      const response = await fetch(`${API_BASE_URL}/api/food/add-meal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: mealName,
          calories: totals.calories,
          protein: totals.protein,
          carbs: totals.carbs,
          fat: totals.fat,
          image_base64: imageBase64,
          meal_type: 'snack', // Default, can be changed
        }),
      });

      if (!response.ok) {
        throw new Error('Kaydetme başarısız');
      }

      Alert.alert('Başarılı', 'Yemek kaydedildi!', [
        { text: 'Tamam', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (error) {
      console.error('Save meal error:', error);
      Alert.alert('Hata', 'Yemek kaydedilemedi. Tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return Colors.success;
    if (confidence >= 0.6) return '#FFA500';
    return Colors.error;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.loadingGradient}
          >
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Yemek Analiz Ediliyor...</Text>
            <Text style={styles.loadingSubtext}>AI görüntüyü inceliyor</Text>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  const totals = getTotals();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analiz Sonucu</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Preview */}
        {imageBase64 && (
          <View style={styles.imagePreview}>
            <Image
              source={{ uri: `data:image/jpeg;base64,${imageBase64}` }}
              style={styles.previewImage}
              resizeMode="cover"
            />
            <View style={styles.aiLabel}>
              <Ionicons name="sparkles" size={14} color="#FFD700" />
              <Text style={styles.aiLabelText}>AI Tahmini</Text>
            </View>
          </View>
        )}

        {/* Detected Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tespit Edilen Yemekler</Text>
          
          {editedItems.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemNameRow}>
                  <Ionicons name="restaurant" size={20} color={Colors.primary} />
                  <Text style={styles.itemName}>{item.label}</Text>
                </View>
                <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(item.confidence) + '20' }]}>
                  <Text style={[styles.confidenceText, { color: getConfidenceColor(item.confidence) }]}>
                    %{Math.round(item.confidence * 100)}
                  </Text>
                </View>
              </View>

              {item.aliases.length > 0 && (
                <Text style={styles.aliases}>
                  Alternatifler: {item.aliases.join(', ')}
                </Text>
              )}

              {/* Gram Input */}
              <View style={styles.gramRow}>
                <Text style={styles.gramLabel}>Porsiyon:</Text>
                <View style={styles.gramInputContainer}>
                  <TouchableOpacity 
                    style={styles.gramButton}
                    onPress={() => updateItemGrams(index, Math.max(10, item.portion.estimate_g - 10))}
                  >
                    <Ionicons name="remove" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.gramInput}
                    value={String(item.portion.estimate_g)}
                    onChangeText={(text) => {
                      const num = parseInt(text) || 0;
                      updateItemGrams(index, num);
                    }}
                    keyboardType="numeric"
                  />
                  <Text style={styles.gramUnit}>g</Text>
                  <TouchableOpacity 
                    style={styles.gramButton}
                    onPress={() => updateItemGrams(index, item.portion.estimate_g + 10)}
                  >
                    <Ionicons name="add" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Nutrition Info */}
              <View style={styles.nutritionRow}>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{item.calories}</Text>
                  <Text style={styles.nutritionLabel}>kcal</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{item.protein}g</Text>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{item.carbs}g</Text>
                  <Text style={styles.nutritionLabel}>Karb</Text>
                </View>
                <View style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{item.fat}g</Text>
                  <Text style={styles.nutritionLabel}>Yağ</Text>
                </View>
              </View>

              {!item.food_id && (
                <View style={styles.warningBanner}>
                  <Ionicons name="warning" size={16} color="#FFA500" />
                  <Text style={styles.warningText}>Veritabanında bulunamadı - tahmini değerler</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Notes */}
        {result?.notes && result.notes.length > 0 && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notlar:</Text>
            {result.notes.map((note, index) => (
              <Text key={index} style={styles.noteText}>• {note}</Text>
            ))}
          </View>
        )}

        {/* Totals */}
        <View style={styles.totalsCard}>
          <Text style={styles.totalsTitle}>Toplam Besin Değerleri</Text>
          <View style={styles.totalsGrid}>
            <View style={styles.totalItem}>
              <LinearGradient colors={['#FF6B6B', '#FF8E8E']} style={styles.totalIcon}>
                <Ionicons name="flame" size={20} color="#FFF" />
              </LinearGradient>
              <Text style={styles.totalValue}>{totals.calories}</Text>
              <Text style={styles.totalLabel}>kcal</Text>
            </View>
            <View style={styles.totalItem}>
              <LinearGradient colors={['#4ECDC4', '#6EE7DE']} style={styles.totalIcon}>
                <Ionicons name="fitness" size={20} color="#FFF" />
              </LinearGradient>
              <Text style={styles.totalValue}>{totals.protein.toFixed(1)}g</Text>
              <Text style={styles.totalLabel}>Protein</Text>
            </View>
            <View style={styles.totalItem}>
              <LinearGradient colors={['#FFA726', '#FFB851']} style={styles.totalIcon}>
                <Ionicons name="leaf" size={20} color="#FFF" />
              </LinearGradient>
              <Text style={styles.totalValue}>{totals.carbs.toFixed(1)}g</Text>
              <Text style={styles.totalLabel}>Karb</Text>
            </View>
            <View style={styles.totalItem}>
              <LinearGradient colors={['#AB47BC', '#C370CE']} style={styles.totalIcon}>
                <Ionicons name="water" size={20} color="#FFF" />
              </LinearGradient>
              <Text style={styles.totalValue}>{totals.fat.toFixed(1)}g</Text>
              <Text style={styles.totalLabel}>Yağ</Text>
            </View>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={16} color={Colors.lightText} />
          <Text style={styles.disclaimerText}>
            AI tahminidir. Doğrulamak için gram değerlerini düzenleyebilirsiniz.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Save Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveMeal}
          disabled={saving}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveGradient}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                <Text style={styles.saveButtonText}>Yemeği Kaydet</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
    padding: 32,
  },
  loadingGradient: {
    width: '100%',
    padding: 48,
    borderRadius: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  imagePreview: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  aiLabel: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  aiLabelText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.darkText,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  aliases: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 12,
  },
  gramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  gramLabel: {
    fontSize: 14,
    color: Colors.darkText,
    fontWeight: '500',
  },
  gramInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 4,
  },
  gramButton: {
    padding: 8,
  },
  gramInput: {
    width: 60,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
  },
  gramUnit: {
    fontSize: 14,
    color: Colors.lightText,
    marginRight: 4,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  nutritionLabel: {
    fontSize: 11,
    color: Colors.lightText,
    marginTop: 2,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFA50020',
    padding: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  warningText: {
    fontSize: 12,
    color: '#996600',
    flex: 1,
  },
  notesSection: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 13,
    color: Colors.lightText,
    lineHeight: 20,
  },
  totalsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  totalsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 16,
    textAlign: 'center',
  },
  totalsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  totalItem: {
    alignItems: 'center',
  },
  totalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  totalLabel: {
    fontSize: 11,
    color: Colors.lightText,
    marginTop: 2,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.lightText,
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
});
