import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { updateProfile } from '../../utils/api';
import { useStore } from '../../store/useStore';
import { Colors } from '../../constants/Colors';
import { useTranslation } from 'react-i18next';
import { languageList, changeLanguage, isFirstLaunch, setFirstLaunchDone, loadSavedLanguage } from '../../utils/i18n';
import { useAuth } from '../../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import AdvancedRulerPicker from '../../components/AdvancedRulerPicker';
import AgeWheelPicker from '../../components/AgeWheelPicker';

const { width } = Dimensions.get('window');

// BMR ve TDEE hesaplama fonksiyonları (Mifflin-St Jeor formülü)
const calculateBMR = (weight: number, height: number, age: number, gender: string): number => {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
};

const getActivityMultiplier = (level: string): number => {
  switch (level) {
    case 'sedentary': return 1.2;
    case 'light': return 1.375;
    case 'moderate': return 1.55;
    case 'active': return 1.725;
    case 'veryActive': return 1.9;
    default: return 1.55;
  }
};

const calculateTDEE = (bmr: number, activityLevel: string): number => {
  return Math.round(bmr * getActivityMultiplier(activityLevel));
};

// Minimum kalori sınırı - sağlık açısından önemli
const MIN_DAILY_CALORIES = 1600;

// Kalori açığı hesaplama
// 1 kg yağ ≈ 7700 kalori
// Haftada 1 kg vermek için: 7700 / 7 = ~1100 kalori/gün açık
// Haftada 0.75 kg vermek için: ~825 kalori/gün açık
// Haftada 0.5 kg vermek için: ~550 kalori/gün açık
const calculateTargetCalories = (tdee: number, goal: string): number => {
  let targetCalories: number;
  
  switch (goal) {
    case 'lose': 
      targetCalories = Math.round(tdee - 750);        // ~0.7 kg/hafta
      break;
    case 'loseFast': 
      targetCalories = Math.round(tdee - 1100);       // ~1 kg/hafta
      break;
    case 'maintain': 
      targetCalories = tdee;
      break;
    case 'gain': 
      targetCalories = Math.round(tdee + 400);        // Kas kazanımı
      break;
    case 'gainFast': 
      targetCalories = Math.round(tdee + 700);        // Hızlı kilo alma
      break;
    default: 
      targetCalories = tdee;
  }
  
  // Sağlık sınırı: 1600 kalorinin altına düşme
  // Bu sınır, vücudun temel metabolik ihtiyaçlarını karşılamak için gereklidir
  return Math.max(targetCalories, MIN_DAILY_CALORIES);
};

const calculateIdealWeight = (height: number, gender: string): number => {
  const heightInMeters = height / 100;
  const idealBMI = gender === 'male' ? 22.5 : 21.5;
  return Math.round(heightInMeters * heightInMeters * idealBMI);
};

const calculateWeeksToGoal = (currentWeight: number, targetWeight: number, goal: string): number => {
  const diff = Math.abs(currentWeight - targetWeight);
  const weeklyRate = goal === 'loseFast' || goal === 'gainFast' ? 0.75 : 0.5;
  return Math.ceil(diff / weeklyRate);
};

type OnboardingStep = 'language' | 'welcome' | 'gender' | 'age' | 'height' | 'weight' | 'targetWeight' | 'activityLevel' | 'goal' | 'result';

export default function OnboardingScreen() {
  const router = useRouter();
  const { setUser } = useStore();
  const { setNeedsOnboarding } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<OnboardingStep>('language');
  const [selectedLang, setSelectedLang] = useState('en');
  const [checkingLang, setCheckingLang] = useState(true);
  
  const [formData, setFormData] = useState({
    height: '',
    weight: '',
    targetWeight: '',
    age: '',
    gender: 'male',
    activity_level: 'moderate',
    goal: 'maintain',
    goals: [] as string[], // Multi-goal support
  });

  const [calculations, setCalculations] = useState({
    bmr: 0,
    tdee: 0,
    targetCalories: 0,
    idealWeight: 0,
    weeksToGoal: 0,
    bmi: 0,
  });

  useEffect(() => {
    checkLanguageSelection();
  }, []);

  const checkLanguageSelection = async () => {
    try {
      const savedLang = await loadSavedLanguage();
      const firstLaunch = await isFirstLaunch();
      
      if (savedLang) {
        setSelectedLang(savedLang);
        setStep('welcome');
      } else if (!firstLaunch) {
        setStep('welcome');
      }
    } catch (error) {
      console.error('Error checking language:', error);
    } finally {
      setCheckingLang(false);
    }
  };

  const handleLanguageSelect = async () => {
    console.log('[Onboarding] handleLanguageSelect called, lang:', selectedLang);
    try {
      await changeLanguage(selectedLang);
      await setFirstLaunchDone();
      console.log('[Onboarding] Moving to welcome step');
      setStep('welcome');
    } catch (error) {
      console.error('[Onboarding] Error:', error);
    }
  };

  const goToNextStep = () => {
    const steps: OnboardingStep[] = ['language', 'welcome', 'gender', 'age', 'height', 'weight', 'targetWeight', 'activityLevel', 'goal', 'result'];
    const currentIndex = steps.indexOf(step);
    
    if (currentIndex < steps.length - 1) {
      // Validation
      if (step === 'age' && (!formData.age || parseInt(formData.age) < 10 || parseInt(formData.age) > 120)) {
        Alert.alert(t('error'), t('enterValidAge'));
        return;
      }
      if (step === 'height' && (!formData.height || parseFloat(formData.height) < 100 || parseFloat(formData.height) > 250)) {
        Alert.alert(t('error'), t('enterValidHeight'));
        return;
      }
      if (step === 'weight' && (!formData.weight || parseFloat(formData.weight) < 30 || parseFloat(formData.weight) > 300)) {
        Alert.alert(t('error'), t('enterValidWeight'));
        return;
      }
      if (step === 'targetWeight' && (!formData.targetWeight || parseFloat(formData.targetWeight) < 30 || parseFloat(formData.targetWeight) > 300)) {
        Alert.alert(t('error'), t('enterValidWeight'));
        return;
      }
      
      // Set default goal based on weight difference when entering goal step
      if (step === 'activityLevel') {
        const weight = parseFloat(formData.weight);
        const targetWeight = parseFloat(formData.targetWeight);
        const diff = targetWeight - weight;
        
        let defaultGoal = 'maintain';
        if (diff < -2) {
          defaultGoal = 'loseFast';  // Varsayılan olarak hızlı kilo verme seç
        } else if (diff > 2) {
          defaultGoal = 'gainFast';  // Varsayılan olarak hızlı kilo alma seç
        }
        setFormData(prev => ({ ...prev, goal: defaultGoal }));
      }
      
      // Calculate when going to result
      if (steps[currentIndex + 1] === 'result') {
        calculateResults();
      }
      
      setStep(steps[currentIndex + 1]);
    }
  };

  const goToPrevStep = () => {
    const steps: OnboardingStep[] = ['language', 'welcome', 'gender', 'age', 'height', 'weight', 'targetWeight', 'activityLevel', 'goal', 'result'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 1) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const calculateResults = () => {
    const weight = parseFloat(formData.weight);
    const heightVal = parseFloat(formData.height);
    const age = parseInt(formData.age);
    const targetWeight = parseFloat(formData.targetWeight);
    
    const bmr = calculateBMR(weight, heightVal, age, formData.gender);
    const tdee = calculateTDEE(bmr, formData.activity_level);
    
    // Kullanıcının seçtiği goal'u kullan - override etme!
    const selectedGoal = formData.goal;
    
    const targetCalories = calculateTargetCalories(tdee, selectedGoal);
    const idealWeight = calculateIdealWeight(heightVal, formData.gender);
    const weeksToGoal = calculateWeeksToGoal(weight, targetWeight, selectedGoal);
    const bmi = weight / ((heightVal / 100) ** 2);
    
    setCalculations({
      bmr: Math.round(bmr),
      tdee,
      targetCalories,
      idealWeight,
      weeksToGoal,
      bmi: Math.round(bmi * 10) / 10,
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Validate calculations before submitting
      if (!calculations.targetCalories || calculations.targetCalories <= 0) {
        Alert.alert(t('error'), t('calculationError') || 'Hesaplama hatası. Lütfen tekrar deneyin.');
        return;
      }
      
      const profileData = {
        height: parseFloat(formData.height),
        weight: parseFloat(formData.weight),
        target_weight: parseFloat(formData.targetWeight),
        age: parseInt(formData.age),
        gender: formData.gender,
        activity_level: formData.activity_level,
        goal: formData.goal,
        daily_calorie_goal: calculations.targetCalories,
        bmr: calculations.bmr,
        tdee: calculations.tdee,
      };
      
      console.log('[Onboarding] Submitting profile data:', profileData);
      
      const userData = await updateProfile(profileData) as any;
      
      console.log('[Onboarding] Profile updated successfully:', userData);
      
      if (userData) {
        setUser(userData);
      }
      setNeedsOnboarding(false);
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('[Onboarding] Error updating profile:', error);
      
      // Show more specific error message
      let errorMessage = t('errorUpdatingProfile') || 'Profil güncellenirken bir hata oluştu';
      if (error?.message) {
        if (error.message.includes('Network')) {
          errorMessage = t('networkError') || 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.';
        } else if (error.message.includes('401')) {
          errorMessage = t('sessionExpired') || 'Oturum süresi doldu. Lütfen tekrar giriş yapın.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert(t('error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStepProgress = () => {
    const steps: OnboardingStep[] = ['welcome', 'gender', 'age', 'height', 'weight', 'targetWeight', 'activityLevel', 'goal', 'result'];
    const currentIndex = steps.indexOf(step);
    return currentIndex >= 0 ? (currentIndex + 1) / steps.length : 0;
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { text: t('underweight'), color: '#FFA500' };
    if (bmi < 25) return { text: t('normal'), color: Colors.success };
    if (bmi < 30) return { text: t('overweight'), color: '#FFA500' };
    return { text: t('obese'), color: Colors.error };
  };

  if (checkingLang) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Language Selection Step
  if (step === 'language') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.langContent}>
          <View style={styles.langHeader}>
            <Text style={styles.langLogo}>🍎</Text>
            <Text style={styles.langTitle}>CalorieDiet</Text>
            <Text style={styles.langSubtitle}>{t('selectLanguage')}</Text>
          </View>

          <View style={styles.langList}>
            {languageList.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.langItem, selectedLang === lang.code && styles.langItemSelected]}
                onPress={() => setSelectedLang(lang.code)}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={[styles.langName, selectedLang === lang.code && styles.langNameSelected]}>
                  {lang.name}
                </Text>
                {selectedLang === lang.code && (
                  <View style={styles.langCheck}>
                    <Text style={styles.langCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.continueBtn} onPress={handleLanguageSelect}>
            <LinearGradient colors={[Colors.primary, '#45a049']} style={styles.gradientBtn}>
              <Text style={styles.continueBtnText}>{t('continue')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Welcome Step
  if (step === 'welcome') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.stepContainer}>
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeEmoji}>👋🏻</Text>
            <Text style={styles.welcomeTitle}>{t('welcomeToApp')}</Text>
            <Text style={styles.welcomeSubtitle}>{t('letsPersonalize')}</Text>
            
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>📊</Text>
                <Text style={styles.featureText}>{t('personalizedCalories')}</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>🎯</Text>
                <Text style={styles.featureText}>{t('goalTracking')}</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>📈</Text>
                <Text style={styles.featureText}>{t('progressMonitoring')}</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity style={styles.continueBtn} onPress={goToNextStep}>
            <LinearGradient colors={[Colors.primary, '#45a049']} style={styles.gradientBtn}>
              <Text style={styles.continueBtnText}>{t('letsStart')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Gender Step
  if (step === 'gender') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.stepContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${getStepProgress() * 100}%` }]} />
          </View>
          
          <TouchableOpacity style={styles.backBtn} onPress={goToPrevStep}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t('whatIsYourGender')}</Text>
            <Text style={styles.stepSubtitle}>{t('genderHelpsCalculate')}</Text>
            
            <View style={styles.genderOptions}>
              <TouchableOpacity
                style={[styles.genderCard, formData.gender === 'male' && styles.genderCardSelected]}
                onPress={() => setFormData({ ...formData, gender: 'male' })}
              >
                <Text style={styles.genderEmoji}>🧑🏻</Text>
                <Text style={[styles.genderText, formData.gender === 'male' && styles.genderTextSelected]}>
                  {t('male')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.genderCard, formData.gender === 'female' && styles.genderCardSelected]}
                onPress={() => setFormData({ ...formData, gender: 'female' })}
              >
                <Text style={styles.genderEmoji}>👩🏻</Text>
                <Text style={[styles.genderText, formData.gender === 'female' && styles.genderTextSelected]}>
                  {t('female')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity style={styles.continueBtn} onPress={goToNextStep}>
            <LinearGradient colors={[Colors.primary, '#45a049']} style={styles.gradientBtn}>
              <Text style={styles.continueBtnText}>{t('continue')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Age Step - Enhanced with AgeWheelPicker
  if (step === 'age') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${getStepProgress() * 100}%` }]} />
            </View>
            
            <TouchableOpacity style={styles.backBtn} onPress={goToPrevStep}>
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
            
            <View style={styles.agePickerContainer}>
              <AgeWheelPicker
                minAge={10}
                maxAge={100}
                initialAge={parseInt(formData.age) || 25}
                onAgeChange={(age) => setFormData({ ...formData, age: age.toString() })}
                primaryColor={Colors.primary}
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.continueBtn, !formData.age && styles.continueBtnDisabled]} 
              onPress={goToNextStep}
              disabled={!formData.age}
            >
              <LinearGradient colors={formData.age ? [Colors.primary, '#45a049'] : ['#ccc', '#aaa']} style={styles.gradientBtn}>
                <Text style={styles.continueBtnText}>{t('continue')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Height Step
  if (step === 'height') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.stepContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${getStepProgress() * 100}%` }]} />
          </View>
          
          <TouchableOpacity style={styles.backBtn} onPress={goToPrevStep}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>📏</Text>
            <Text style={styles.stepTitle}>{t('whatIsYourHeight')}</Text>
            <Text style={styles.stepSubtitle}>{t('heightHelpsCalculate')}</Text>
            
            <View style={styles.rulerPickerContainer}>
              <RulerPicker
                min={100}
                max={250}
                step={1}
                initialValue={parseInt(formData.height) || 170}
                unit="cm"
                onValueChange={(value) => setFormData({ ...formData, height: value.toString() })}
                height={350}
              />
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.continueBtn, !formData.height && styles.continueBtnDisabled]} 
            onPress={goToNextStep}
            disabled={!formData.height}
          >
            <LinearGradient colors={formData.height ? [Colors.primary, '#45a049'] : ['#ccc', '#aaa']} style={styles.gradientBtn}>
              <Text style={styles.continueBtnText}>{t('continue')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Weight Step
  if (step === 'weight') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.stepContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${getStepProgress() * 100}%` }]} />
          </View>
          
          <TouchableOpacity style={styles.backBtn} onPress={goToPrevStep}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>⚖️</Text>
            <Text style={styles.stepTitle}>{t('whatIsYourWeight')}</Text>
            <Text style={styles.stepSubtitle}>{t('currentWeightHelps')}</Text>
            
            <View style={styles.rulerPickerContainer}>
              <RulerPicker
                min={30}
                max={200}
                step={0.5}
                initialValue={parseFloat(formData.weight) || 70}
                unit="kg"
                onValueChange={(value) => setFormData({ ...formData, weight: value.toString() })}
                height={350}
              />
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.continueBtn, !formData.weight && styles.continueBtnDisabled]} 
            onPress={goToNextStep}
            disabled={!formData.weight}
          >
            <LinearGradient colors={formData.weight ? [Colors.primary, '#45a049'] : ['#ccc', '#aaa']} style={styles.gradientBtn}>
              <Text style={styles.continueBtnText}>{t('continue')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Target Weight Step
  if (step === 'targetWeight') {
    const idealWeight = calculateIdealWeight(parseFloat(formData.height) || 170, formData.gender);
    
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.stepContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${getStepProgress() * 100}%` }]} />
            </View>
            
            <TouchableOpacity style={styles.backBtn} onPress={goToPrevStep}>
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
            
            <View style={styles.stepContent}>
              <Text style={styles.stepEmoji}>🎯</Text>
              <Text style={styles.stepTitle}>{t('whatIsYourTargetWeight')}</Text>
              <Text style={styles.stepSubtitle}>{t('idealWeightIs')} {idealWeight} kg</Text>
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.bigInput}
                  keyboardType="decimal-pad"
                  placeholder={String(idealWeight)}
                  placeholderTextColor={Colors.lightText}
                  value={formData.targetWeight}
                  onChangeText={(text) => setFormData({ ...formData, targetWeight: text.replace(/[^0-9.]/g, '') })}
                  maxLength={5}
                />
                <Text style={styles.inputUnit}>kg</Text>
              </View>
              
              <View style={styles.quickSelectRow}>
                <TouchableOpacity 
                  style={styles.quickSelectBtn}
                  onPress={() => setFormData({ ...formData, targetWeight: String(Math.round(parseFloat(formData.weight) * 0.9)) })}
                >
                  <Text style={styles.quickSelectText}>-10%</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.quickSelectBtn}
                  onPress={() => setFormData({ ...formData, targetWeight: formData.weight })}
                >
                  <Text style={styles.quickSelectText}>{t('maintain')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.quickSelectBtn}
                  onPress={() => setFormData({ ...formData, targetWeight: String(idealWeight) })}
                >
                  <Text style={styles.quickSelectText}>{t('ideal')}</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.continueBtn, !formData.targetWeight && styles.continueBtnDisabled]} 
              onPress={goToNextStep}
              disabled={!formData.targetWeight}
            >
              <LinearGradient colors={formData.targetWeight ? [Colors.primary, '#45a049'] : ['#ccc', '#aaa']} style={styles.gradientBtn}>
                <Text style={styles.continueBtnText}>{t('continue')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Activity Level Step
  if (step === 'activityLevel') {
    const activityLevels = [
      { key: 'sedentary', emoji: '🛋️', desc: t('sedentaryDesc') },
      { key: 'light', emoji: '🚶🏻', desc: t('lightDesc') },
      { key: 'moderate', emoji: '🏃🏻', desc: t('moderateDesc') },
      { key: 'active', emoji: '💪🏻', desc: t('activeDesc') },
      { key: 'veryActive', emoji: '🏋🏻', desc: t('veryActiveDesc') },
    ];
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.stepContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${getStepProgress() * 100}%` }]} />
          </View>
          
          <TouchableOpacity style={styles.backBtn} onPress={goToPrevStep}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          
          <ScrollView style={styles.scrollStepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepEmoji}>🏃🏻</Text>
            <Text style={styles.stepTitle}>{t('howActiveAreYou')}</Text>
            <Text style={styles.stepSubtitle}>{t('activityHelpsCalculate')}</Text>
            
            <View style={styles.activityOptions}>
              {activityLevels.map((level) => (
                <TouchableOpacity
                  key={level.key}
                  style={[styles.activityCard, formData.activity_level === level.key && styles.activityCardSelected]}
                  onPress={() => setFormData({ ...formData, activity_level: level.key })}
                >
                  <Text style={styles.activityEmoji}>{level.emoji}</Text>
                  <View style={styles.activityTextContainer}>
                    <Text style={[styles.activityTitle, formData.activity_level === level.key && styles.activityTitleSelected]}>
                      {t(level.key)}
                    </Text>
                    <Text style={styles.activityDesc}>{level.desc}</Text>
                  </View>
                  {formData.activity_level === level.key && (
                    <View style={styles.checkCircle}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ height: 120 }} />
          </ScrollView>
          
          <TouchableOpacity style={styles.continueBtn} onPress={goToNextStep}>
            <LinearGradient colors={[Colors.primary, '#45a049']} style={styles.gradientBtn}>
              <Text style={styles.continueBtnText}>{t('continue')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Goal Step - Multi-goal support
  if (step === 'goal') {
    const currentWeight = parseFloat(formData.weight);
    const targetWeight = parseFloat(formData.targetWeight);
    const diff = targetWeight - currentWeight;
    
    const toggleGoal = (goalId: string) => {
      const currentGoals = formData.goals || [];
      if (currentGoals.includes(goalId)) {
        setFormData({ 
          ...formData, 
          goals: currentGoals.filter(g => g !== goalId),
          goal: goalId // Keep single goal for compatibility
        });
      } else {
        setFormData({ 
          ...formData, 
          goals: [...currentGoals, goalId],
          goal: goalId
        });
      }
    };
    
    const isGoalSelected = (goalId: string) => {
      return (formData.goals || []).includes(goalId);
    };
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.stepContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${getStepProgress() * 100}%` }]} />
          </View>
          
          <TouchableOpacity style={styles.backBtn} onPress={goToPrevStep}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          
          <ScrollView style={styles.scrollStepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepEmoji}>🎯</Text>
            <Text style={styles.stepTitle}>{t('whatAreYourGoals')}</Text>
            <Text style={styles.stepSubtitle}>
              {t('selectMultipleGoals')} 
              {diff < 0 ? ` ${t('youWantToLose', { kg: Math.abs(diff).toFixed(1) })}` : 
               diff > 0 ? ` ${t('youWantToGain', { kg: diff.toFixed(1) })}` : ''}
            </Text>
            
            <View style={styles.goalOptions}>
              {/* Weight Loss Goals */}
              <TouchableOpacity
                style={[styles.goalCard, isGoalSelected('lose_weight') && styles.goalCardSelected]}
                onPress={() => toggleGoal('lose_weight')}
              >
                {isGoalSelected('lose_weight') && (
                  <View style={styles.checkMark}>
                    <Text style={styles.checkMarkText}>✓</Text>
                  </View>
                )}
                <Text style={styles.goalEmoji}>📉</Text>
                <Text style={[styles.goalTitle, isGoalSelected('lose_weight') && styles.goalTitleSelected]}>
                  {t('loseWeight')}
                </Text>
                <Text style={styles.goalDesc}>{t('burnFat')}</Text>
              </TouchableOpacity>
              
              {/* Muscle Building */}
              <TouchableOpacity
                style={[styles.goalCard, isGoalSelected('build_muscle') && styles.goalCardSelected]}
                onPress={() => toggleGoal('build_muscle')}
              >
                {isGoalSelected('build_muscle') && (
                  <View style={styles.checkMark}>
                    <Text style={styles.checkMarkText}>✓</Text>
                  </View>
                )}
                <Text style={styles.goalEmoji}>💪</Text>
                <Text style={[styles.goalTitle, isGoalSelected('build_muscle') && styles.goalTitleSelected]}>
                  {t('buildMuscle')}
                </Text>
                <Text style={styles.goalDesc}>{t('gainLeanMass')}</Text>
              </TouchableOpacity>
              
              {/* Gain Weight */}
              <TouchableOpacity
                style={[styles.goalCard, isGoalSelected('gain_weight') && styles.goalCardSelected]}
                onPress={() => toggleGoal('gain_weight')}
              >
                {isGoalSelected('gain_weight') && (
                  <View style={styles.checkMark}>
                    <Text style={styles.checkMarkText}>✓</Text>
                  </View>
                )}
                <Text style={styles.goalEmoji}>📈</Text>
                <Text style={[styles.goalTitle, isGoalSelected('gain_weight') && styles.goalTitleSelected]}>
                  {t('gainWeight')}
                </Text>
                <Text style={styles.goalDesc}>{t('bulkUp')}</Text>
              </TouchableOpacity>
              
              {/* Maintenance */}
              <TouchableOpacity
                style={[styles.goalCard, isGoalSelected('maintain') && styles.goalCardSelected]}
                onPress={() => toggleGoal('maintain')}
              >
                {isGoalSelected('maintain') && (
                  <View style={styles.checkMark}>
                    <Text style={styles.checkMarkText}>✓</Text>
                  </View>
                )}
                <Text style={styles.goalEmoji}>⚖️</Text>
                <Text style={[styles.goalTitle, isGoalSelected('maintain') && styles.goalTitleSelected]}>
                  {t('maintainWeight')}
                </Text>
                <Text style={styles.goalDesc}>{t('keepCurrentWeight')}</Text>
              </TouchableOpacity>
            </View>
            
            {/* Goal Combinations Info */}
            {formData.goals && formData.goals.length > 1 && (
              <View style={styles.infoBox}>
                <Text style={styles.infoIcon}>💡</Text>
                <Text style={styles.infoText}>
                  {formData.goals.includes('lose_weight') && formData.goals.includes('build_muscle') && 
                    t('bodyRecompInfo')}
                  {formData.goals.includes('build_muscle') && formData.goals.includes('gain_weight') && 
                    t('leanBulkInfo')}
                </Text>
              </View>
            )}
            
            <View style={{ height: 120 }} />
          </ScrollView>
          
          <TouchableOpacity 
            style={[styles.continueBtn, (!formData.goals || formData.goals.length === 0) && styles.continueBtnDisabled]} 
            onPress={goToNextStep}
            disabled={!formData.goals || formData.goals.length === 0}
          >
            <LinearGradient 
              colors={formData.goals && formData.goals.length > 0 ? [Colors.primary, '#45a049'] : ['#ccc', '#aaa']} 
              style={styles.gradientBtn}
            >
              <Text style={styles.continueBtnText}>{t('calculateMyPlan')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Result Step
  if (step === 'result') {
    const bmiCategory = getBMICategory(calculations.bmi);
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.stepContainer}>
          <ScrollView style={styles.scrollStepContent} showsVerticalScrollIndicator={false}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultEmoji}>🎉</Text>
              <Text style={styles.resultTitle}>{t('yourPersonalPlan')}</Text>
            </View>
            
            {/* Daily Calorie Card */}
            <View style={styles.mainResultCard}>
              <LinearGradient colors={[Colors.primary, '#45a049']} style={styles.calorieGradient}>
                <Text style={styles.calorieLabel}>{t('dailyCalorieGoal')}</Text>
                <Text style={styles.calorieValue}>{calculations.targetCalories}</Text>
                <Text style={styles.calorieUnit}>kcal/{t('day')}</Text>
              </LinearGradient>
            </View>
            
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>🔥</Text>
                <Text style={styles.statValue}>{calculations.bmr}</Text>
                <Text style={styles.statLabel}>BMR</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>⚡</Text>
                <Text style={styles.statValue}>{calculations.tdee}</Text>
                <Text style={styles.statLabel}>TDEE</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>📊</Text>
                <Text style={[styles.statValue, { color: bmiCategory.color }]}>{calculations.bmi}</Text>
                <Text style={styles.statLabel}>BMI ({bmiCategory.text})</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>🎯</Text>
                <Text style={styles.statValue}>{formData.targetWeight}</Text>
                <Text style={styles.statLabel}>{t('targetWeight')} (kg)</Text>
              </View>
            </View>
            
            {/* Journey Summary */}
            <View style={styles.journeyCard}>
              <Text style={styles.journeyTitle}>{t('yourJourney')}</Text>
              <View style={styles.journeyRow}>
                <View style={styles.journeyItem}>
                  <Text style={styles.journeyLabel}>{t('current')}</Text>
                  <Text style={styles.journeyValue}>{formData.weight} kg</Text>
                </View>
                <Text style={styles.journeyArrow}>→</Text>
                <View style={styles.journeyItem}>
                  <Text style={styles.journeyLabel}>{t('target')}</Text>
                  <Text style={styles.journeyValue}>{formData.targetWeight} kg</Text>
                </View>
              </View>
            </View>
            
            {/* Info Box */}
            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>{t('calorieExplanation')}</Text>
            </View>
            <View style={{ height: 120 }} />
          </ScrollView>
          
          <TouchableOpacity 
            style={[styles.continueBtn, loading && styles.continueBtnDisabled]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient colors={[Colors.primary, '#45a049']} style={styles.gradientBtn}>
              <Text style={styles.continueBtnText}>
                {loading ? t('saving') : t('startMyJourney')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
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
  },
  loadingText: {
    fontSize: 18,
    color: Colors.lightText,
  },
  stepContainer: {
    flex: 1,
    padding: 24,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backBtnText: {
    fontSize: 24,
    color: Colors.darkText,
  },
  stepContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  scrollStepContent: {
    flex: 1,
  },
  stepEmoji: {
    fontSize: 64,
    marginBottom: 24,
    textAlign: 'center',
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.darkText,
    textAlign: 'center',
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: 16,
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  // Language styles
  langContent: {
    flexGrow: 1,
    padding: 24,
  },
  langHeader: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  langLogo: {
    fontSize: 64,
    marginBottom: 16,
  },
  langTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 8,
  },
  langSubtitle: {
    fontSize: 18,
    color: Colors.lightText,
  },
  langList: {
    marginBottom: 20,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  langItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  langFlag: {
    fontSize: 32,
    marginRight: 16,
  },
  langName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.darkText,
  },
  langNameSelected: {
    color: Colors.primary,
  },
  langCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langCheckText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Welcome styles
  welcomeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  welcomeEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.darkText,
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: 40,
  },
  featureList: {
    alignSelf: 'stretch',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    color: Colors.darkText,
    fontWeight: '500',
  },
  // Gender styles
  genderOptions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
  },
  genderCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  genderCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  genderEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  genderText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.darkText,
  },
  genderTextSelected: {
    color: Colors.primary,
  },
  // Input styles
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  bigInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.darkText,
    textAlign: 'center',
    minWidth: 140,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
  },
  inputUnit: {
    fontSize: 24,
    color: Colors.lightText,
    fontWeight: '500',
  },
  quickSelectRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  quickSelectBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  quickSelectText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  // Activity styles
  activityOptions: {
    gap: 12,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activityCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  activityEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  activityTextContainer: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: 4,
  },
  activityTitleSelected: {
    color: Colors.primary,
  },
  activityDesc: {
    fontSize: 13,
    color: Colors.lightText,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMark: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Goal styles
  goalOptions: {
    gap: 12,
  },
  goalCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  goalCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  goalEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: 4,
  },
  goalTitleSelected: {
    color: Colors.primary,
  },
  goalDesc: {
    fontSize: 14,
    color: Colors.lightText,
  },
  // Result styles
  resultHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resultEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: Colors.darkText,
    textAlign: 'center',
  },
  mainResultCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  calorieGradient: {
    padding: 32,
    alignItems: 'center',
  },
  calorieLabel: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: 8,
  },
  calorieValue: {
    fontSize: 56,
    fontWeight: 'bold',
    color: Colors.white,
  },
  calorieUnit: {
    fontSize: 18,
    color: Colors.white,
    opacity: 0.9,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 4,
    textAlign: 'center',
  },
  journeyCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  journeyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: 16,
    textAlign: 'center',
  },
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  journeyItem: {
    alignItems: 'center',
  },
  journeyLabel: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 4,
  },
  journeyValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  journeyArrow: {
    fontSize: 28,
    color: Colors.primary,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
    lineHeight: 20,
  },
  // Continue Button
  continueBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 20,
  },
  continueBtnDisabled: {
    opacity: 0.6,
  },
  gradientBtn: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  continueBtnText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  rulerPickerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    marginBottom: 30,
  },
  checkMark: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  checkMarkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});


