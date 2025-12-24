import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFoodDatabase } from '../../utils/api';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../../utils/i18n';
import { useTranslation } from 'react-i18next';

const { width: screenWidth } = Dimensions.get('window');

type FoodItem = {
  food_id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type RecentScan = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: number;
};

export default function MealsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [foodDatabase, setFoodDatabase] = useState<FoodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'main' | 'search' | 'recent'>('main');
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFoodDatabase();
    loadRecentScans();
  }, []);

  const loadFoodDatabase = async () => {
    try {
      const lang = i18n.language;
      const foods = await getFoodDatabase(lang) as any[];
      setFoodDatabase(Array.isArray(foods) ? foods : []);
    } catch (error) {
      console.error('Error loading food database:', error);
      setFoodDatabase([]);
    }
  };

  const loadRecentScans = async () => {
    try {
      const stored = await AsyncStorage.getItem('recent_food_scans');
      if (stored) {
        setRecentScans(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading recent scans:', error);
    }
  };

  const addMealFromRecent = async (scan: RecentScan) => {
    try {
      setLoading(true);
      const { addMeal } = require('../../utils/api');
      
      await addMeal({
        name: scan.name,
        calories: scan.calories,
        protein: scan.protein,
        carbs: scan.carbs,
        fat: scan.fat,
        image_base64: '',
        meal_type: 'snack',
      });

      Alert.alert(t('success') || 'Başarılı', `${scan.name} ${t('added') || 'eklendi'}!`);
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Add meal error:', error);
      Alert.alert(t('error') || 'Hata', error.message || t('mealAddError') || 'Yemek eklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const filteredFoods = foodDatabase.filter((food: FoodItem) =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Ana ekran
  const renderMainOptions = () => (
    <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>{t('addCalorie') || 'Kalori Ekle'}</Text>
        <Text style={styles.headerSubtitle}>{t('trackYourMeals') || 'Yediğinizi kaydedin'}</Text>
      </View>

      <View style={styles.optionCards}>
        {/* Fotoğraf */}
        <TouchableOpacity 
          style={styles.optionCard}
          onPress={() => router.push('/(tabs)/camera')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.optionGradient}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons name="camera" size={28} color="#FFF" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle} numberOfLines={1}>{t('photoCalc') || 'Fotoğrafla Hesapla'}</Text>
              <Text style={styles.optionDescription} numberOfLines={2}>{t('photoCalcDesc') || 'AI ile kalori hesapla'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Son Hesaplananlar */}
        <TouchableOpacity 
          style={styles.optionCard}
          onPress={() => setActiveTab('recent')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#11998e', '#38ef7d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.optionGradient}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons name="time" size={28} color="#FFF" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle} numberOfLines={1}>{t('recentCalc') || 'Son Hesaplananlar'}</Text>
              <Text style={styles.optionDescription} numberOfLines={1}>{recentScans.length} {t('records') || 'kayıt'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Listeden Seç */}
        <TouchableOpacity 
          style={styles.optionCard}
          onPress={() => setActiveTab('search')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#f093fb', '#f5576c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.optionGradient}
          >
            <View style={styles.optionIconContainer}>
              <Ionicons name="search" size={28} color="#FFF" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle} numberOfLines={1}>{t('selectFromList') || 'Listeden Seç'}</Text>
              <Text style={styles.optionDescription} numberOfLines={1}>500+ {t('foods') || 'yemek'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Hızlı Ekle */}
      <View style={styles.quickAddSection}>
        <Text style={styles.quickAddTitle}>{t('quickAdd') || 'Hızlı Ekle'}</Text>
        <View style={styles.quickAddButtons}>
          {[
            { icon: 'water', label: t('water') || 'Su', color: Colors.teal, cal: 0 },
            { icon: 'cafe', label: t('coffee') || 'Kahve', color: '#8B4513', cal: 5 },
            { icon: 'nutrition', label: t('apple') || 'Elma', color: '#FF6B6B', cal: 52 },
            { icon: 'pizza', label: t('snack') || 'Atıştırma', color: '#FFA500', cal: 150 },
          ].map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.quickAddButton}
              onPress={() => addMealFromRecent({
                id: `quick_${Date.now()}`,
                name: item.label,
                calories: item.cal,
                protein: 0, carbs: 0, fat: 0,
                timestamp: Date.now(),
              })}
            >
              <View style={[styles.quickAddIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={styles.quickAddLabel} numberOfLines={1}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  // Son Hesaplananlar
  const renderRecentScans = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity style={styles.backRow} onPress={() => setActiveTab('main')}>
        <Ionicons name="arrow-back" size={22} color={Colors.darkText} />
        <Text style={styles.backText}>{t('back') || 'Geri'}</Text>
      </TouchableOpacity>

      {recentScans.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={48} color={Colors.lightText} />
          <Text style={styles.emptyText}>{t('noRecords') || 'Henüz kayıt yok'}</Text>
        </View>
      ) : (
        <FlatList
          data={recentScans}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.recentCard} onPress={() => addMealFromRecent(item)} disabled={loading}>
              <View style={styles.recentIcon}>
                <Ionicons name="restaurant" size={20} color={Colors.primary} />
              </View>
              <View style={styles.recentInfo}>
                <Text style={styles.recentName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.recentCalories}>{item.calories} kcal</Text>
              </View>
              <Ionicons name="add-circle" size={24} color={Colors.primary} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );

  // Listeden Seç
  const renderSearchTab = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity style={styles.backRow} onPress={() => { setActiveTab('main'); setSearchQuery(''); }}>
        <Ionicons name="arrow-back" size={22} color={Colors.darkText} />
        <Text style={styles.backText}>{t('back') || 'Geri'}</Text>
      </TouchableOpacity>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.lightText} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('searchFood') || 'Yemek ara...'}
          placeholderTextColor={Colors.lightText}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={Colors.lightText} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredFoods}
        keyExtractor={(item: FoodItem) => item.food_id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={40} color={Colors.lightText} />
            <Text style={styles.emptyText}>{searchQuery ? t('noResults') || 'Sonuç yok' : t('typeToSearch') || 'Aramak için yazın'}</Text>
          </View>
        }
        renderItem={({ item }: { item: FoodItem }) => (
          <TouchableOpacity
            style={styles.foodCard}
            onPress={() => router.push({
              pathname: '/details/meal-detail',
              params: { food_id: item.food_id, name: item.name, calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat },
            })}
          >
            <View style={styles.foodIcon}>
              <Ionicons name="restaurant" size={20} color={Colors.primary} />
            </View>
            <View style={styles.foodInfo}>
              <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.foodCalories}>{item.calories} kcal</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.lightText} />
          </TouchableOpacity>
        )}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="close" size={26} color={Colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {activeTab === 'recent' ? (t('recentCalc') || 'Son Hesaplananlar') : 
           activeTab === 'search' ? (t('searchFood') || 'Yemek Ara') : (t('addCalorie') || 'Kalori Ekle')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      {activeTab === 'main' && renderMainOptions()}
      {activeTab === 'recent' && renderRecentScans()}
      {activeTab === 'search' && renderSearchTab()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerButton: { padding: 6 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: Colors.darkText, flex: 1, textAlign: 'center' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  optionsContainer: { flex: 1, paddingHorizontal: 16 },
  headerSection: { alignItems: 'center', paddingVertical: 16 },
  headerTitle2: { fontSize: 20, fontWeight: 'bold', color: Colors.darkText, marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: Colors.lightText, textAlign: 'center' },
  optionCards: { gap: 12, marginBottom: 20 },
  optionCard: { borderRadius: 16, overflow: 'hidden' },
  optionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  optionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionContent: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '600', color: '#FFF', marginBottom: 2 },
  optionDescription: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  quickAddSection: { marginTop: 8 },
  quickAddTitle: { fontSize: 16, fontWeight: '600', color: Colors.darkText, marginBottom: 12 },
  quickAddButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  quickAddButton: { alignItems: 'center', width: (screenWidth - 64) / 4 },
  quickAddIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickAddLabel: { fontSize: 11, color: Colors.darkText, fontWeight: '500', textAlign: 'center' },
  tabContent: { flex: 1, padding: 16 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  backText: { fontSize: 15, color: Colors.darkText },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: Colors.lightText, marginTop: 12 },
  listContent: { paddingBottom: 100 },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  recentInfo: { flex: 1 },
  recentName: { fontSize: 14, fontWeight: '600', color: Colors.darkText, marginBottom: 2 },
  recentCalories: { fontSize: 12, color: Colors.primary, fontWeight: '500' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: Colors.darkText },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  foodIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  foodInfo: { flex: 1 },
  foodName: { fontSize: 14, fontWeight: '500', color: Colors.darkText, marginBottom: 2 },
  foodCalories: { fontSize: 12, color: Colors.primary },
});
