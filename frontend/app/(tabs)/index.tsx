import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, Image, Modal, TouchableOpacity, FlatList, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import { getDailySummary, getTodayWater, getTodaySteps, getTodayMeals, getFoodDatabase, addMeal, activatePremium } from '../../utils/api';
import CalorieCard from '../../components/CalorieCard';
import WaterCard from '../../components/WaterCard';
import StepCard from '../../components/StepCard';
import VitaminCard from '../../components/VitaminCard';
import FoodPhotoCard from '../../components/FoodPhotoCard';
import PremiumPromoButton from '../../components/PremiumPromoButton';
import PremiumPaywall from '../../components/PremiumPaywall';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import i18n from '../../utils/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { LogBox } from 'react-native';
import { clearReminderNotifications, requestNotificationPermission, syncReminderNotifications } from '../../utils/notifications';

// Expo Go'da remote push notification uyarılarını gizle
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

// Expo Go kontrolü
const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === 'storeClient';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, setIsPremium } = useTheme();
  const { user, setUser, dailySummary, waterData, stepData, setDailySummary, setWaterData, setStepData, refreshData, triggerRefresh } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [recentMeals, setRecentMeals] = useState<any[]>([]);
  
  // Sync premium status with ThemeContext
  useEffect(() => {
    if (user?.is_premium !== undefined) {
      setIsPremium(user.is_premium);
    }
  }, [user?.is_premium, setIsPremium]);
  
  // Fast Add Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('lunch');
  const [foodDatabase, setFoodDatabase] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<any>(null);
  
  // Premium modal
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  
  // Notification settings modal
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [waterReminderEnabled, setWaterReminderEnabled] = useState(false);
  const [vitaminReminderEnabled, setVitaminReminderEnabled] = useState(false);
  const [waterReminderTimes, setWaterReminderTimes] = useState<string[]>(['09:00', '12:00', '15:00', '18:00', '21:00']);
  const [vitaminReminderTimes, setVitaminReminderTimes] = useState<string[]>(['09:00', '21:00']);
  const [alarmStyle, setAlarmStyle] = useState(false);
  const [newReminderTime, setNewReminderTime] = useState('');
  const [reminderType, setReminderType] = useState<'water' | 'vitamin'>('water');

  const loadData = async () => {
    try {
      const [summary, water, steps, meals] = await Promise.all([
        getDailySummary(),
        getTodayWater(),
        getTodaySteps(),
        getTodayMeals(),
      ]);
      
      // Safe type conversions with fallbacks
      if (summary && typeof summary === 'object') {
        setDailySummary(summary as any);
      }
      if (water && typeof water === 'object') {
        setWaterData(water as any);
      }
      if (steps && typeof steps === 'object') {
        setStepData(steps as any);
      }
      if (Array.isArray(meals)) {
        setRecentMeals(meals.slice(0, 3));
      } else {
        setRecentMeals([]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Set empty defaults on error
      setRecentMeals([]);
    }
  };

  const loadFoodDatabase = async () => {
    try {
      const lang = i18n.language;
      const foods = await getFoodDatabase(lang);
      if (Array.isArray(foods)) {
        setFoodDatabase(foods);
      } else {
        setFoodDatabase([]);
      }
    } catch (error) {
      console.error('Error loading food database:', error);
      setFoodDatabase([]);
    }
  };

  useEffect(() => {
    loadData();
    checkAndShowPremiumModal();
    loadNotificationSettings();
    // Removed auto permission request - only ask when user toggles reminders
  }, [refreshData]);

  const loadNotificationSettings = async () => {
    try {
      const waterEnabled = await AsyncStorage.getItem('water_reminder_enabled');
      const vitaminEnabled = await AsyncStorage.getItem('vitamin_reminder_enabled');
      const waterTimes = await AsyncStorage.getItem('water_reminder_times');
      const vitaminTimes = await AsyncStorage.getItem('vitamin_reminder_times');
      const alarm = await AsyncStorage.getItem('alarm_style');
      
      if (waterEnabled) setWaterReminderEnabled(waterEnabled === 'true');
      if (vitaminEnabled) setVitaminReminderEnabled(vitaminEnabled === 'true');
      if (waterTimes) setWaterReminderTimes(JSON.parse(waterTimes));
      if (vitaminTimes) setVitaminReminderTimes(JSON.parse(vitaminTimes));
      if (alarm) setAlarmStyle(alarm === 'true');
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveNotificationSettings = async () => {
    try {
      await AsyncStorage.setItem('water_reminder_enabled', String(waterReminderEnabled));
      await AsyncStorage.setItem('vitamin_reminder_enabled', String(vitaminReminderEnabled));
      await AsyncStorage.setItem('water_reminder_times', JSON.stringify(waterReminderTimes));
      await AsyncStorage.setItem('vitamin_reminder_times', JSON.stringify(vitaminReminderTimes));
      await AsyncStorage.setItem('alarm_style', String(alarmStyle));

      const hasPermission = await requestNotificationPermission();

      if (hasPermission) {
        await syncReminderNotifications({
          type: 'water',
          enabled: waterReminderEnabled,
          times: waterReminderTimes,
          content: {
            title: alarmStyle ? '💧 SU İÇME ZAMANI!' : 'Su Hatırlatıcısı',
            body: 'Sağlığınız için su içmeyi unutmayın!',
            sound: alarmStyle ? 'default' : undefined,
          },
        });

        await syncReminderNotifications({
          type: 'vitamin',
          enabled: vitaminReminderEnabled,
          times: vitaminReminderTimes,
          content: {
            title: alarmStyle ? '💊 VİTAMİN ZAMANI!' : 'Vitamin Hatırlatıcısı',
            body: 'Vitaminlerinizi almayı unutmayın!',
            sound: alarmStyle ? 'default' : undefined,
          },
        });

        alert('Hatırlatıcılar kaydedildi!');
      } else {
        await clearReminderNotifications('water');
        await clearReminderNotifications('vitamin');
        alert('Bildirim izni verilmedi. Ayarlardan açabilirsiniz.');
      }

      setShowNotificationModal(false);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      alert('Hata: Hatırlatıcılar kaydedilemedi.');
    }
  };

  const addReminderTimeForType = () => {
    if (!newReminderTime || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(newReminderTime)) {
      alert('Geçerli bir saat girin (örn: 14:30)');
      return;
    }

    if (reminderType === 'water') {
      if (!waterReminderTimes.includes(newReminderTime) && waterReminderTimes.length < 10) {
        setWaterReminderTimes([...waterReminderTimes, newReminderTime].sort());
      }
    } else {
      if (!vitaminReminderTimes.includes(newReminderTime) && vitaminReminderTimes.length < 5) {
        setVitaminReminderTimes([...vitaminReminderTimes, newReminderTime].sort());
      }
    }
    setNewReminderTime('');
  };

  const removeReminderTimeForType = (time: string, type: 'water' | 'vitamin') => {
    if (type === 'water') {
      setWaterReminderTimes(waterReminderTimes.filter(t => t !== time));
    } else {
      setVitaminReminderTimes(vitaminReminderTimes.filter(t => t !== time));
    }
  };

  useEffect(() => {
    if (showAddModal) {
      loadFoodDatabase();
    }
  }, [showAddModal]);

  const checkAndShowPremiumModal = async () => {
    // Premium modal disabled - users can access from premium button
    return;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleQuickAdd = async () => {
    if (!selectedFood) return;

    try {
      await addMeal({
        name: selectedFood.name,
        calories: selectedFood.calories,
        protein: selectedFood.protein,
        carbs: selectedFood.carbs,
        fat: selectedFood.fat,
        image_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        meal_type: selectedMealType,
      });
      triggerRefresh();
      setShowAddModal(false);
      setSelectedFood(null);
      setSearchQuery('');
      alert('Yemek eklendi!');
    } catch (error) {
      console.error('Error adding meal:', error);
      alert('Hata: Yemek eklenemedi.');
    }
  };

  const filteredFoods = foodDatabase.filter(food =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                <Ionicons name="person" size={24} color={colors.white} />
              </View>
            )}
            <View>
              <Text style={styles.greeting}>
                {t('hello')} {user?.name?.split(' ')[0]} 👋
              </Text>
              <Text style={styles.question}>{t('howAreYouToday')}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <PremiumPromoButton onPress={() => setShowPremiumModal(true)} />
            <TouchableOpacity onPress={() => setShowNotificationModal(true)} style={{ marginLeft: 12 }}>
              <Ionicons name="notifications-outline" size={28} color={Colors.darkText} />
              {(waterReminderEnabled || vitaminReminderEnabled) && (
                <View style={styles.notificationBadge} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Bar */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Ionicons name="flame" size={20} color={Colors.primary} />
            <Text style={styles.summaryValue}>{dailySummary?.total_calories || 0} {t('kcal')}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="water" size={20} color={Colors.teal} />
            <Text style={styles.summaryValue}>{((waterData?.total_amount || 0) / 1000).toFixed(1)} L</Text>
          </View>
          <View style={styles.summaryItem}>
            <Ionicons name="footsteps" size={20} color={Colors.primary} />
            <Text style={styles.summaryValue}>{(stepData?.steps || 0).toLocaleString()}</Text>
          </View>
        </View>

        {/* Recent Meals */}
        {recentMeals.length > 0 && (
          <View style={styles.recentMealsSection}>
            <Text style={styles.sectionTitle}>{t('recentMeals')}</Text>
            {recentMeals.map((meal) => (
              <View key={meal.meal_id} style={styles.mealCard}>
                <Image source={{ uri: meal.image_base64 }} style={styles.mealImage} />
                <View style={styles.mealInfo}>
                  <Text style={styles.mealName} numberOfLines={1}>{meal.name}</Text>
                  <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
                </View>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              </View>
            ))}
          </View>
        )}

        {/* Cards Grid */}
        <View style={styles.grid}>
          {/* Kalori ve Vitamin - Yan Yana */}
          <View style={styles.gridRow}>
            <View style={styles.gridItemHalf}>
              <CalorieCard
                current={dailySummary?.total_calories || 0}
                goal={user?.daily_calorie_goal || 2000}
                protein={dailySummary?.total_protein || 0}
                carbs={dailySummary?.total_carbs || 0}
                fat={dailySummary?.total_fat || 0}
              />
            </View>
            <View style={styles.gridItemHalf}>
              <VitaminCard />
            </View>
          </View>

          {/* Su ve Adım - Yan Yana */}
          <View style={styles.gridRow}>
            <View style={styles.gridItemHalf}>
              <WaterCard
                current={waterData?.total_amount || 0}
                goal={user?.water_goal || 2500}
              />
            </View>
            <View style={styles.gridItemHalf}>
              <StepCard
                current={stepData?.steps || 0}
                goal={user?.step_goal || 10000}
              />
            </View>
          </View>

          <View style={styles.gridItemFull}>
            <FoodPhotoCard />
          </View>

          {/* Personal Diets Section */}
          <View style={styles.personalDietsSection}>
            <View style={styles.personalDietsHeader}>
              <Ionicons name="heart" size={24} color={Colors.error} />
              <Text style={styles.personalDietsTitle}>{t('personalDiets')}</Text>
            </View>
            <Text style={styles.personalDietsSubtitle}>
              {t('personalDietsSubtitle')}
            </Text>
            
            {/* No diets placeholder */}
            <TouchableOpacity
              style={styles.noDietsCard}
              onPress={() => router.push('/diets')}
            >
              <View style={styles.noDietsIcon}>
                <Ionicons name="add-circle-outline" size={48} color={Colors.primary} />
              </View>
              <Text style={styles.noDietsText}>{t('noDietsYet')}</Text>
              <Text style={styles.noDietsSubtext}>
                {t('noDietsSubtext')}
              </Text>
              <View style={styles.noDietsButton}>
                <Text style={styles.noDietsButtonText}>{t('goToDiets')}</Text>
                <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Recipe Book Section */}
          <View style={styles.recipeBookSection}>
            <View style={styles.recipeBookHeader}>
              <Ionicons name="book" size={24} color={Colors.primary} />
              <Text style={styles.recipeBookTitle}>{t('recipeBook') || 'Tarif Kitapçığı'}</Text>
            </View>
            <Text style={styles.recipeBookSubtitle}>
              {t('recipeBookSubtitle') || 'Sağlıklı ve lezzetli tarifler keşfedin'}
            </Text>
            
            <TouchableOpacity
              style={styles.recipeBookCard}
              onPress={() => router.push('/details/recipes')}
            >
              <View style={styles.recipeBookIconContainer}>
                <Ionicons name="restaurant" size={48} color={Colors.primary} />
              </View>
              <Text style={styles.recipeBookText}>{t('discoverRecipes') || 'Tarifleri Keşfet'}</Text>
              <Text style={styles.recipeBookSubtext}>
                {t('recipeBookDescription') || 'Diyet dostu, pratik ve lezzetli tarifler'}
              </Text>
              <View style={styles.recipeBookButton}>
                <Text style={styles.recipeBookButtonText}>{t('viewRecipes') || 'Tariflere Git'}</Text>
                <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Fast Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('quickAdd')}</Text>
              <TouchableOpacity 
                onPress={() => setShowAddModal(false)}
                style={styles.modalCloseButton}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={28} color={Colors.darkText} />
              </TouchableOpacity>
            </View>

            {/* Meal Type Selection */}
            <Text style={styles.sectionLabel}>{t('selectMeal')}</Text>
            <View style={styles.mealTypeRow}>
              {[
                { key: 'breakfast', icon: 'sunny', label: t('breakfast') },
                { key: 'lunch', icon: 'restaurant', label: t('lunch') },
                { key: 'dinner', icon: 'moon', label: t('dinner') },
                { key: 'snack', icon: 'cafe', label: t('snack') },
              ].map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.mealTypeCard,
                    selectedMealType === type.key && styles.mealTypeCardActive,
                  ]}
                  onPress={() => setSelectedMealType(type.key)}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={28}
                    color={selectedMealType === type.key ? Colors.white : Colors.primary}
                  />
                  <Text
                    style={[
                      styles.mealTypeLabel,
                      selectedMealType === type.key && styles.mealTypeLabelActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Search */}
            <TextInput
              style={styles.searchInput}
              placeholder={t('searchFood')}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {/* Food List */}
            <FlatList
              data={filteredFoods}
              keyExtractor={(item) => item.food_id}
              style={styles.foodList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.foodItem}
                  onPress={() => {
                    setShowAddModal(false);
                    router.push({
                      pathname: '/details/meal-detail',
                      params: {
                        food_id: item.food_id,
                        name: item.name,
                        calories: item.calories,
                        protein: item.protein,
                        carbs: item.carbs,
                        fat: item.fat,
                      },
                    });
                  }}
                >
                  <View style={styles.foodInfo}>
                    <Text style={styles.foodName}>{item.name}</Text>
                    <Text style={styles.foodMacros}>
                      {item.calories} kcal • P: {item.protein}g • K: {item.carbs}g • Y: {item.fat}g
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.lightText} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Notification Settings Modal */}
      <Modal visible={showNotificationModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.notificationModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('reminderSettings')}</Text>
              <TouchableOpacity 
                onPress={() => setShowNotificationModal(false)}
                style={styles.modalCloseButton}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={28} color={Colors.darkText} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.notificationScrollView} showsVerticalScrollIndicator={false}>
              {/* Water Reminders */}
              <View style={styles.reminderSection}>
                <View style={styles.reminderHeader}>
                  <View style={styles.reminderHeaderLeft}>
                    <Ionicons name="water" size={24} color={Colors.teal} />
                    <Text style={styles.reminderTitle}>{t('waterReminder')}</Text>
                  </View>
                  <Switch
                    value={waterReminderEnabled}
                    onValueChange={setWaterReminderEnabled}
                    trackColor={{ false: '#E0E0E0', true: Colors.teal }}
                    thumbColor={Colors.white}
                  />
                </View>

                {waterReminderEnabled && (
                  <View style={styles.reminderTimes}>
                    <Text style={styles.reminderSubtitle}>{t('reminderTimes')} ({waterReminderTimes.length})</Text>
                    <View style={styles.timeChips}>
                      {waterReminderTimes.map((time) => (
                        <View key={time} style={[styles.timeChip, { backgroundColor: Colors.teal + '20' }]}>
                          <Text style={[styles.timeChipText, { color: Colors.teal }]}>{time}</Text>
                          <TouchableOpacity onPress={() => removeReminderTimeForType(time, 'water')}>
                            <Ionicons name="close-circle" size={18} color={Colors.teal} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={[styles.addTimeChip, { borderColor: Colors.teal }]}
                      onPress={() => {
                        setReminderType('water');
                        addReminderTimeForType();
                      }}
                    >
                      <View style={styles.addTimeRow}>
                        <TextInput
                          style={styles.addTimeInput}
                          placeholder="HH:MM"
                          value={reminderType === 'water' ? newReminderTime : ''}
                          onChangeText={(text) => {
                            setReminderType('water');
                            setNewReminderTime(text);
                          }}
                          keyboardType="numbers-and-punctuation"
                        />
                        <TouchableOpacity
                          style={[styles.addTimeBtn, { backgroundColor: Colors.teal }]}
                          onPress={() => {
                            setReminderType('water');
                            addReminderTimeForType();
                          }}
                        >
                          <Ionicons name="add" size={20} color={Colors.white} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Vitamin Reminders */}
              <View style={styles.reminderSection}>
                <View style={styles.reminderHeader}>
                  <View style={styles.reminderHeaderLeft}>
                    <Ionicons name="medical" size={24} color={Colors.primary} />
                    <Text style={styles.reminderTitle}>{t('vitaminReminder')}</Text>
                  </View>
                  <Switch
                    value={vitaminReminderEnabled}
                    onValueChange={setVitaminReminderEnabled}
                    trackColor={{ false: '#E0E0E0', true: Colors.primary }}
                    thumbColor={Colors.white}
                  />
                </View>

                {vitaminReminderEnabled && (
                  <View style={styles.reminderTimes}>
                    <Text style={styles.reminderSubtitle}>{t('reminderTimes')} ({vitaminReminderTimes.length})</Text>
                    <View style={styles.timeChips}>
                      {vitaminReminderTimes.map((time) => (
                        <View key={time} style={[styles.timeChip, { backgroundColor: Colors.primary + '20' }]}>
                          <Text style={[styles.timeChipText, { color: Colors.primary }]}>{time}</Text>
                          <TouchableOpacity onPress={() => removeReminderTimeForType(time, 'vitamin')}>
                            <Ionicons name="close-circle" size={18} color={Colors.primary} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={[styles.addTimeChip, { borderColor: Colors.primary }]}
                      onPress={() => {
                        setReminderType('vitamin');
                        addReminderTimeForType();
                      }}
                    >
                      <View style={styles.addTimeRow}>
                        <TextInput
                          style={styles.addTimeInput}
                          placeholder="HH:MM"
                          value={reminderType === 'vitamin' ? newReminderTime : ''}
                          onChangeText={(text) => {
                            setReminderType('vitamin');
                            setNewReminderTime(text);
                          }}
                          keyboardType="numbers-and-punctuation"
                        />
                        <TouchableOpacity
                          style={[styles.addTimeBtn, { backgroundColor: Colors.primary }]}
                          onPress={() => {
                            setReminderType('vitamin');
                            addReminderTimeForType();
                          }}
                        >
                          <Ionicons name="add" size={20} color={Colors.white} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Alarm Style */}
              <View style={styles.alarmStyleSection}>
                <View style={styles.reminderHeader}>
                  <View style={styles.reminderHeaderLeft}>
                    <Ionicons name="volume-high" size={24} color={Colors.warning} />
                    <View>
                      <Text style={styles.reminderTitle}>{t('alarmStyle')}</Text>
                      <Text style={styles.alarmSubtext}>{t('alarmStyleDesc')}</Text>
                    </View>
                  </View>
                  <Switch
                    value={alarmStyle}
                    onValueChange={setAlarmStyle}
                    trackColor={{ false: '#E0E0E0', true: Colors.warning }}
                    thumbColor={Colors.white}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Save Button */}
            <TouchableOpacity style={styles.saveNotificationButton} onPress={saveNotificationSettings}>
              <Ionicons name="checkmark" size={24} color={Colors.white} />
              <Text style={styles.saveNotificationText}>{t('save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Premium Paywall */}
      <PremiumPaywall
        visible={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onSubscribe={async () => {
          try {
            const result = await activatePremium() as any;
            // Update user state with premium status
            if (result && setUser) {
              setUser({ ...user, ...result, is_premium: true });
            }
            alert('🎉 Premium aktif oldu! Tüm özellikler açıldı!');
            setShowPremiumModal(false);
          } catch (error) {
            console.error('Premium activation error:', error);
            alert('Hata oluştu. Lütfen tekrar deneyin.');
          }
        }}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={32} color={Colors.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  question: {
    fontSize: 14,
    color: Colors.lightText,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    justifyContent: 'space-around',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkText,
  },
  recentMealsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 12,
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  mealImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  mealInfo: {
    flex: 1,
    marginLeft: 12,
  },
  mealName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkText,
  },
  mealCalories: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 2,
  },
  grid: {
    gap: 16,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 16,
  },
  gridItemHalf: {
    flex: 1,
  },
  gridItemFull: {
    width: '100%',
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  modalCloseButton: {
    padding: 12,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: 12,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  mealTypeCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mealTypeCardActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  mealTypeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.darkText,
    marginTop: 4,
  },
  mealTypeLabelActive: {
    color: Colors.white,
  },
  searchInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  foodList: {
    maxHeight: 300,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  foodItemSelected: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: 4,
  },
  foodMacros: {
    fontSize: 12,
    color: Colors.lightText,
  },
  personalDietsSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  personalDietsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  personalDietsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  personalDietsSubtitle: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 16,
    lineHeight: 20,
  },
  noDietsCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  noDietsIcon: {
    marginBottom: 16,
  },
  noDietsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 8,
    textAlign: 'center',
  },
  noDietsSubtext: {
    fontSize: 14,
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  noDietsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  noDietsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  notificationModalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  notificationScrollView: {
    marginBottom: 16,
  },
  reminderSection: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
  },
  reminderTimes: {
    marginTop: 16,
  },
  reminderSubtitle: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 12,
  },
  timeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  timeChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addTimeChip: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 8,
  },
  addTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addTimeInput: {
    flex: 1,
    fontSize: 16,
    padding: 8,
  },
  addTimeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alarmStyleSection: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  alarmSubtext: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 2,
  },
  saveNotificationButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveNotificationText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Recipe Book Styles
  recipeBookSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  recipeBookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  recipeBookTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  recipeBookSubtitle: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 16,
    lineHeight: 20,
  },
  recipeBookCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  recipeBookIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  recipeBookText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 8,
    textAlign: 'center',
  },
  recipeBookSubtext: {
    fontSize: 14,
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  recipeBookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  recipeBookButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});
