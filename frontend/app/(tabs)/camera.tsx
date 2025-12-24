import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '../../store/useStore';
import { Colors } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import PremiumPaywall from '../../components/PremiumPaywall';
import { activatePremium } from '../../utils/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

type DetectedItem = {
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
};

type VisionResult = {
  items: DetectedItem[];
  notes: string[];
  needs_user_confirmation: boolean;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
};

export default function CameraScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { triggerRefresh, user, setUser } = useStore();
  const [image, setImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<VisionResult | null>(null);
  const [editedItems, setEditedItems] = useState<DetectedItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  
  // Scanning animation
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Check premium status
  const isPremium = user?.is_premium || false;
  const isGuest = user?.user_id?.startsWith('guest_') || false;

  // Start scan animation when analyzing
  useEffect(() => {
    if (analyzing) {
      // Reset animations
      scanLineAnim.setValue(0);
      
      // Scan line animation - moves up and down
      const scanAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      
      // Pulse animation for the scan line glow
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      
      scanAnimation.start();
      pulseAnimation.start();
      
      // Progress simulation
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 15;
        });
      }, 300);
      
      return () => {
        scanAnimation.stop();
        pulseAnimation.stop();
        clearInterval(progressInterval);
        setScanProgress(0);
      };
    }
  }, [analyzing]);

  const resizeImage = async (base64: string): Promise<string> => {
    // Frontend preprocessing - just return as is for now
    // In production: resize to max 1280px, compress to ~70% quality
    return base64;
  };

  const pickImage = async () => {
    // Premium check - only premium users can use AI analysis
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }
    
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(t('error'), t('error'));
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7, // Cost optimization: lower quality
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64 = result.assets[0].base64;
      setImage(`data:image/jpeg;base64,${base64}`);
      setImageBase64(base64);
      setResult(null);
      setEditedItems([]);
      analyzeImage(base64);
    }
  };

  const pickFromGallery = async () => {
    // Premium check - only premium users can use AI analysis
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }
    
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(t('error'), t('error'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64 = result.assets[0].base64;
      setImage(`data:image/jpeg;base64,${base64}`);
      setImageBase64(base64);
      setResult(null);
      setEditedItems([]);
      analyzeImage(base64);
    }
  };

  const analyzeImage = async (base64: string) => {
    try {
      setAnalyzing(true);
      const token = await AsyncStorage.getItem('session_token');
      
      // Use Food Analyze API
      const response = await fetch(`${API_BASE_URL}/api/food/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          image_base64: base64,
          locale: 'tr-TR',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Vision API error:', errorText);
        throw new Error(t('error'));
      }

      const data: VisionResult = await response.json();
      setResult(data);
      setEditedItems(data.items);
    } catch (error) {
      console.error('Error analyzing image:', error);
      Alert.alert(t('error'), t('aiNotAvailable'));
    } finally {
      setAnalyzing(false);
    }
  };

  const updateItemGrams = (index: number, grams: number) => {
    const newItems = [...editedItems];
    const item = newItems[index];
    const originalItem = result?.items[index];
    if (!originalItem) return;

    const scale = grams / originalItem.portion.estimate_g;
    
    newItems[index] = {
      ...item,
      portion: { ...item.portion, estimate_g: grams },
      calories: Math.round(originalItem.calories * scale),
      protein: Math.round(originalItem.protein * scale * 10) / 10,
      carbs: Math.round(originalItem.carbs * scale * 10) / 10,
      fat: Math.round(originalItem.fat * scale * 10) / 10,
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

  // Son hesaplananlara kaydet
  const saveToRecentScans = async (name: string, totals: any) => {
    try {
      const stored = await AsyncStorage.getItem('recent_food_scans');
      const existing = stored ? JSON.parse(stored) : [];
      
      const newScan = {
        id: `scan_${Date.now()}`,
        name: name,
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        timestamp: Date.now(),
        imagePreview: imageBase64?.substring(0, 100), // Sadece küçük önizleme
      };
      
      const updated = [newScan, ...existing].slice(0, 20);
      await AsyncStorage.setItem('recent_food_scans', JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving to recent:', error);
    }
  };

  const handleAddMeal = async () => {
    if (!result || !imageBase64 || editedItems.length === 0) return;

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
          meal_type: 'snack',
        }),
      });

      if (!response.ok) {
        throw new Error(t('saveFailed'));
      }

      // Son hesaplananlara kaydet
      await saveToRecentScans(mealName, totals);

      triggerRefresh();
      Alert.alert(t('success'), t('mealSaved'), [
        { text: t('ok'), onPress: () => {
          router.replace('/(tabs)');
          setImage(null);
          setImageBase64(null);
          setResult(null);
          setEditedItems([]);
        }},
      ]);
    } catch (error) {
      console.error('Error adding meal:', error);
      Alert.alert(t('error'), t('mealAddError'));
    } finally {
      setSaving(false);
    }
  };

  const resetScreen = () => {
    setImage(null);
    setImageBase64(null);
    setResult(null);
    setEditedItems([]);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return Colors.success;
    if (confidence >= 0.6) return '#FFA500';
    return Colors.error;
  };

  const handleSubscribe = async () => {
    try {
      // NOTE: Guest check disabled for Play Store testing
      // Activate premium via API
      const updatedUser = await activatePremium() as any;
      
      // Update local user state with premium status
      if (updatedUser && setUser) {
        setUser({ ...user, ...updatedUser, is_premium: true });
      }
      
      Alert.alert(
        '🎉 ' + t('success'), 
        t('premiumActivated') || 'Premium üyeliğiniz aktif edildi!'
      );
      setShowPaywall(false);
      
    } catch (error: any) {
      console.error('Premium activation error:', error);
      Alert.alert(t('error'), t('premiumActivationFailed') || 'Premium aktivasyonu başarısız.');
    }
  };

  const totals = getTotals();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.headerButton}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{t('photoAnalysis')}</Text>
        {image && (
          <TouchableOpacity 
            onPress={resetScreen} 
            style={styles.headerButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}
        {!image && <View style={{ width: 44 }} />}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!image ? (
          /* Empty State */
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.emptyGradient}
            >
              <Ionicons name="camera" size={64} color="#FFF" />
              <Text style={styles.emptyTitle}>{t('mealPhoto')}</Text>
              <Text style={styles.emptySubtitle}>{t('aiCalcCalories')}</Text>
            </LinearGradient>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.primaryButton} onPress={pickImage}>
                <Ionicons name="camera" size={24} color="#FFF" />
                <Text style={styles.primaryButtonText}>{t('takePhoto')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={pickFromGallery}>
                <Ionicons name="images" size={24} color={Colors.primary} />
                <Text style={styles.secondaryButtonText}>{t('selectFromGallery')}</Text>
              </TouchableOpacity>
            </View>

            {/* Tips */}
            <View style={styles.tips}>
              <Text style={styles.tipsTitle}>{t('tips')}</Text>
              {[t('tip1'), t('tip2'), t('tip3')].map((tip, index) => (
                <View key={index} style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          /* Result State */
          <View>
            {/* Image Preview with Scan Animation */}
            <View style={styles.imageContainer}>
              <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
              
              {/* Scanning Animation Overlay */}
              {analyzing && (
                <View style={styles.scanOverlay}>
                  {/* Scan line that moves up and down */}
                  <Animated.View
                    style={[
                      styles.scanLine,
                      {
                        transform: [
                          {
                            translateY: scanLineAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 250], // Height of image
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={['transparent', '#4CAF50', '#4CAF50', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.scanLineGradient}
                    />
                    {/* Glow effect */}
                    <Animated.View
                      style={[
                        styles.scanLineGlow,
                        { transform: [{ scaleY: pulseAnim }] },
                      ]}
                    />
                  </Animated.View>
                  
                  {/* Corner markers */}
                  <View style={[styles.cornerMarker, styles.topLeft]} />
                  <View style={[styles.cornerMarker, styles.topRight]} />
                  <View style={[styles.cornerMarker, styles.bottomLeft]} />
                  <View style={[styles.cornerMarker, styles.bottomRight]} />
                </View>
              )}
              
              <View style={styles.aiLabel}>
                <Ionicons name="sparkles" size={14} color="#FFD700" />
                <Text style={styles.aiLabelText}>{t('aiEstimate')}</Text>
              </View>
            </View>

            {analyzing ? (
              <View style={styles.loadingCard}>
                {/* Animated scanning indicator */}
                <View style={styles.scanningHeader}>
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <Ionicons name="scan" size={40} color={Colors.primary} />
                  </Animated.View>
                </View>
                
                <Text style={styles.loadingText}>{t('analyzingFood') || 'Yiyecekler Analiz Ediliyor...'}</Text>
                
                {/* Progress bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <LinearGradient
                      colors={['#4CAF50', '#8BC34A']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${Math.min(scanProgress, 100)}%` }]}
                    />
                  </View>
                  <Text style={styles.progressText}>{Math.round(scanProgress)}%</Text>
                </View>
                
                <Text style={styles.loadingSubtext}>{t('aiAnalyzing') || 'AI besinleri tespit ediyor...'}</Text>
                
                {/* Analysis steps */}
                <View style={styles.analysisSteps}>
                  <View style={[styles.stepItem, scanProgress > 20 && styles.stepComplete]}>
                    <Ionicons 
                      name={scanProgress > 20 ? "checkmark-circle" : "ellipse-outline"} 
                      size={16} 
                      color={scanProgress > 20 ? Colors.success : Colors.lightText} 
                    />
                    <Text style={[styles.stepText, scanProgress > 20 && styles.stepTextComplete]}>
                      Görüntü işleniyor
                    </Text>
                  </View>
                  <View style={[styles.stepItem, scanProgress > 50 && styles.stepComplete]}>
                    <Ionicons 
                      name={scanProgress > 50 ? "checkmark-circle" : "ellipse-outline"} 
                      size={16} 
                      color={scanProgress > 50 ? Colors.success : Colors.lightText} 
                    />
                    <Text style={[styles.stepText, scanProgress > 50 && styles.stepTextComplete]}>
                      Besinler tespit ediliyor
                    </Text>
                  </View>
                  <View style={[styles.stepItem, scanProgress > 80 && styles.stepComplete]}>
                    <Ionicons 
                      name={scanProgress > 80 ? "checkmark-circle" : "ellipse-outline"} 
                      size={16} 
                      color={scanProgress > 80 ? Colors.success : Colors.lightText} 
                    />
                    <Text style={[styles.stepText, scanProgress > 80 && styles.stepTextComplete]}>
                      Kalori hesaplanıyor
                    </Text>
                  </View>
                </View>
              </View>
            ) : result && editedItems.length > 0 ? (
              <>
                {/* Detected Items */}
                <Text style={styles.sectionTitle}>{t('detectedFoods')}</Text>
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

                    {/* Gram Input */}
                    <View style={styles.gramRow}>
                      <Text style={styles.gramLabel}>{t('portion')}:</Text>
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

                    {/* Nutrition Row */}
                    <View style={styles.nutritionRow}>
                      <View style={styles.nutritionItem}>
                        <Text style={styles.nutritionValue}>{item.calories}</Text>
                        <Text style={styles.nutritionLabel}>kcal</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Text style={styles.nutritionValue}>{item.protein}g</Text>
                        <Text style={styles.nutritionLabel}>{t('protein')}</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Text style={styles.nutritionValue}>{item.carbs}g</Text>
                        <Text style={styles.nutritionLabel}>{t('carbs')}</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Text style={styles.nutritionValue}>{item.fat}g</Text>
                        <Text style={styles.nutritionLabel}>{t('fat')}</Text>
                      </View>
                    </View>

                    {!item.food_id && (
                      <View style={styles.warningBanner}>
                        <Ionicons name="warning" size={14} color="#996600" />
                        <Text style={styles.warningText}>{t('estimatedValues')}</Text>
                      </View>
                    )}
                  </View>
                ))}

                {/* Totals */}
                <View style={styles.totalsCard}>
                  <Text style={styles.totalsTitle}>{t('total')}</Text>
                  <View style={styles.totalsRow}>
                    <View style={styles.totalItem}>
                      <Text style={styles.totalValue}>{totals.calories}</Text>
                      <Text style={styles.totalLabel}>{t('kcal')}</Text>
                    </View>
                    <View style={styles.totalItem}>
                      <Text style={styles.totalValue}>{totals.protein.toFixed(1)}g</Text>
                      <Text style={styles.totalLabel}>{t('protein')}</Text>
                    </View>
                    <View style={styles.totalItem}>
                      <Text style={styles.totalValue}>{totals.carbs.toFixed(1)}g</Text>
                      <Text style={styles.totalLabel}>{t('carbs')}</Text>
                    </View>
                    <View style={styles.totalItem}>
                      <Text style={styles.totalValue}>{totals.fat.toFixed(1)}g</Text>
                      <Text style={styles.totalLabel}>{t('fat')}</Text>
                    </View>
                  </View>
                </View>

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                  <Ionicons name="information-circle" size={16} color={Colors.lightText} />
                  <Text style={styles.disclaimerText}>
                    {t('aiDisclaimer')}
                  </Text>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleAddMeal}
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
                        <Text style={styles.saveButtonText}>{t('saveMeal')}</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : result && editedItems.length === 0 ? (
              <View style={styles.noResultCard}>
                <Ionicons name="alert-circle" size={48} color={Colors.lightText} />
                <Text style={styles.noResultText}>{t('noFoodDetected')}</Text>
                <Text style={styles.noResultSubtext}>{t('tryDifferentAngle')}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={resetScreen}>
                  <Text style={styles.retryButtonText}>{t('tryAgain')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      
      {/* Premium Paywall */}
      <PremiumPaywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSubscribe={handleSubscribe}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  headerButton: {
    padding: 12,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyGradient: {
    width: '100%',
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 24,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    minHeight: 56,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    minHeight: 56,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  tips: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: Colors.darkText,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 220,
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
  loadingCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: Colors.lightText,
    marginTop: 4,
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
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  itemName: {
    fontSize: 17,
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
  gramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
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
    width: 50,
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
    backgroundColor: '#FFA50015',
    padding: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  warningText: {
    fontSize: 12,
    color: '#996600',
  },
  totalsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  totalsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 12,
    textAlign: 'center',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  totalItem: {
    alignItems: 'center',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
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
    marginBottom: 16,
  },
  disclaimerText: {
    fontSize: 12,
    color: Colors.lightText,
    flex: 1,
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
  noResultCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  noResultText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginTop: 16,
  },
  noResultSubtext: {
    fontSize: 14,
    color: Colors.lightText,
    marginTop: 4,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  // Scan animation styles
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
  },
  scanLineGradient: {
    flex: 1,
    height: 3,
  },
  scanLineGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -8,
    height: 20,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  cornerMarker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#4CAF50',
    borderWidth: 3,
  },
  topLeft: {
    top: 12,
    left: 12,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 12,
    right: 12,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 12,
    left: 12,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 12,
    right: 12,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  scanningHeader: {
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 16,
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
    width: 45,
    textAlign: 'right',
  },
  analysisSteps: {
    marginTop: 20,
    width: '100%',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  stepComplete: {},
  stepText: {
    fontSize: 13,
    color: Colors.lightText,
  },
  stepTextComplete: {
    color: Colors.success,
    fontWeight: '500',
  },
});
