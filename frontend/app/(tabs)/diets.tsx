import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Image, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store/useStore';
import PremiumPaywall from '../../components/PremiumPaywall';
import AdvancedDietForm from '../../components/AdvancedDietForm';
import { activatePremium } from '../../utils/api';

export default function DietsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, setUser } = useStore();
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // Check premium and guest status
  const isPremium = user?.is_premium || false;
  const isGuest = user?.user_id?.startsWith('guest_') || false;

  const premiumDiets = [
    {
      id: '1',
      name: t('ketoDiet'),
      description: t('ketoDesc'),
      duration: `30 ${t('days')}`,
      calories: 1800,
      image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400',
      isPremium: true,
      category: t('weightLoss')
    },
    {
      id: '2',
      name: t('mediterraneanDiet'),
      description: t('mediterraneanDesc'),
      duration: `30 ${t('days')}`,
      calories: 2000,
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
      isPremium: true,
      category: t('balanced')
    },
    {
      id: '3',
      name: t('muscleDiet'),
      description: t('muscleDesc'),
      duration: `60 ${t('days')}`,
      calories: 2500,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
      isPremium: true,
      category: t('muscleBuilding')
    },
    {
      id: '4',
      name: t('vegetarianDiet'),
      description: t('vegetarianDesc'),
      duration: `30 ${t('days')}`,
      calories: 1900,
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400',
      isPremium: true,
      category: t('vegetarian')
    },
  ];

  const handleDietClick = (diet: any) => {
    if (diet.isPremium && !isPremium) {
      setShowPaywall(true);
    } else {
      router.push({
        pathname: '/details/diet-detail',
        params: { dietId: diet.id }
      });
    }
  };

  const handleCreateCustomDiet = (dietData: any) => {
    console.log('Diet Data:', dietData);
    // TODO: Save to backend
    alert(`"${dietData.name}" ${t('dietCreated')}\n\n` +
          `${t('targetCalorie')}: ${dietData.targetCalories} kcal\n` +
          `${t('protein')}: ${dietData.macros.protein}% | ${t('carbs')}: ${dietData.macros.carbs}% | ${t('fat')}: ${dietData.macros.fat}%`);
    setShowAdvancedForm(false);
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
        t('premiumActivated') || 'Premium üyeliğiniz aktif edildi! Tüm özelliklere erişebilirsiniz.'
      );
      setShowPaywall(false);
      
    } catch (error: any) {
      console.error('Premium activation error:', error);
      Alert.alert(t('error'), t('premiumActivationFailed') || 'Premium aktivasyonu başarısız. Lütfen tekrar deneyin.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Back Button Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color={Colors.darkText} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.premiumButton}
          onPress={() => setShowPaywall(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="diamond" size={20} color={Colors.white} />
          <Text style={styles.premiumButtonText}>Premium</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{t('diets')}</Text>
            <Text style={styles.subtitle}>{t('dietsSubtitle')}</Text>
          </View>
        </View>

        {/* Premium Badge if user has premium */}
        {isPremium && (
          <View style={styles.premiumBanner}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            <Text style={styles.premiumBannerText}>{t('premiumMember')}</Text>
          </View>
        )}

        {/* AI Personal Diet Button */}
        <TouchableOpacity
          style={styles.aiDietButton}
          onPress={() => {
            if (!isPremium) {
              setShowPaywall(true);
            } else {
              router.push('/details/personal-diet');
            }
          }}
        >
          <View style={styles.aiDietButtonContent}>
            <View style={styles.aiDietIcon}>
              <Ionicons name="sparkles" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.aiDietText}>
              <Text style={styles.aiDietTitle}>
                {t('createPersonalDiet') || 'AI Kişisel Diyet Oluştur'}
              </Text>
              <Text style={styles.aiDietSubtitle}>
                {t('aiDietDesc') || 'Yapay zeka ile size özel diyet planı'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </View>
          {!isPremium && (
            <View style={styles.aiPremiumBadge}>
              <Ionicons name="diamond" size={12} color="#FFFFFF" />
              <Text style={styles.aiPremiumText}>Premium</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Premium Diets Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star" size={24} color={Colors.warning} />
            <Text style={styles.sectionTitle}>{t('premiumDiets')}</Text>
            {!isPremium && (
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed" size={14} color={Colors.white} />
              </View>
            )}
          </View>
          <Text style={styles.sectionSubtitle}>{t('premiumDietsSubtitle')}</Text>
          
          <View style={styles.dietGrid}>
            {premiumDiets.map((diet) => (
              <TouchableOpacity
                key={diet.id}
                style={[styles.dietCard, !isPremium && styles.dietCardLocked]}
                onPress={() => handleDietClick(diet)}
              >
                <Image
                  source={{ uri: diet.image }}
                  style={styles.dietImage}
                />
                {!isPremium && (
                  <View style={styles.lockOverlay}>
                    <Ionicons name="lock-closed" size={32} color={Colors.white} />
                  </View>
                )}
                <View style={styles.premiumBadge}>
                  <Ionicons name="star" size={12} color={Colors.white} />
                  <Text style={styles.premiumText}>Premium</Text>
                </View>
                <View style={styles.dietInfo}>
                  <Text style={styles.dietName}>{diet.name}</Text>
                  <Text style={styles.dietDescription} numberOfLines={2}>
                    {diet.description}
                  </Text>
                  <View style={styles.dietMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={14} color={Colors.lightText} />
                      <Text style={styles.metaText}>{diet.duration}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="flame-outline" size={14} color={Colors.lightText} />
                      <Text style={styles.metaText}>{diet.calories} kcal</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Custom Diet Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="create" size={24} color={Colors.primary} />
            <Text style={styles.sectionTitle}>{t('createCustomDiet')}</Text>
            {!isPremium && (
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed" size={14} color={Colors.white} />
              </View>
            )}
          </View>
          <Text style={styles.sectionSubtitle}>{t('createCustomDietSubtitle')}</Text>
          
          <TouchableOpacity
            style={[styles.customDietCard, !isPremium && styles.customDietCardLocked]}
            onPress={() => isPremium ? setShowAdvancedForm(true) : setShowPaywall(true)}
          >
            <View style={styles.customDietContent}>
              <View style={styles.iconCircle}>
                <Ionicons name={isPremium ? 'add' : 'lock-closed'} size={32} color={isPremium ? Colors.primary : Colors.lightText} />
              </View>
              <Text style={styles.customDietTitle}>{t('newDietPlan')}</Text>
              <Text style={styles.customDietSubtitle}>
                {isPremium ? t('setYourOwnMeals') : t('unlockWithPremium')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Advanced Diet Form */}
      <AdvancedDietForm
        visible={showAdvancedForm}
        onClose={() => setShowAdvancedForm(false)}
        onSubmit={handleCreateCustomDiet}
      />

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
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 12,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.lightText,
  },
  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  premiumButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '20',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  premiumBannerText: {
    flex: 1,
    fontSize: 14,
    color: Colors.success,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.darkText,
    flex: 1,
  },
  lockBadge: {
    backgroundColor: Colors.lightText,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 16,
  },
  dietGrid: {
    gap: 16,
  },
  dietCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  dietCardLocked: {
    opacity: 0.7,
  },
  dietImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  premiumBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.warning,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 2,
  },
  premiumText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  dietInfo: {
    padding: 16,
  },
  dietName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 4,
  },
  dietDescription: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 12,
  },
  dietMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.lightText,
  },
  customDietCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  customDietCardLocked: {
    borderColor: Colors.lightText,
    opacity: 0.7,
  },
  customDietContent: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  customDietTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 4,
  },
  customDietSubtitle: {
    fontSize: 14,
    color: Colors.lightText,
    textAlign: 'center',
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
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  createButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  aiDietButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  aiDietButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiDietIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  aiDietText: {
    flex: 1,
  },
  aiDietTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  aiDietSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  aiPremiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  aiPremiumText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

