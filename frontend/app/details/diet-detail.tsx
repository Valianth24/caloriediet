import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function DietDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Mock data - gerçek veride backend'den gelecek
  const diet = {
    id: params.dietId,
    name: 'Keto Diyeti',
    description: 'Düşük karbonhidrat, yüksek yağ içeren bir beslenme planı. Vücudunuzu yağ yakma moduna sokar.',
    duration: '30 gün',
    calories: 1800,
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800',
    category: 'Kilo Verme',
    macros: {
      protein: 25,
      carbs: 5,
      fat: 70,
    },
    meals: [
      {
        type: 'Kahvaltı',
        items: ['Yumurta (2 adet)', 'Avokado (yarım)', 'Somon (100g)', 'Yeşil çay'],
        calories: 450,
      },
      {
        type: 'Öğle Yemeği',
        items: ['Izgara tavuk göğsü (150g)', 'Karışık yeşil salata', 'Zeytinyağı (1 yemek kaşığı)'],
        calories: 500,
      },
      {
        type: 'Ara Öğün',
        items: ['Çiğ badem (30g)', 'Peynir (50g)'],
        calories: 250,
      },
      {
        type: 'Akşam Yemeği',
        items: ['Izgara somon (200g)', 'Brokoli (200g)', 'Zeytinyağı'],
        calories: 600,
      },
    ],
    benefits: [
      'Hızlı kilo kaybı',
      'Enerji seviyesinde artış',
      'Mental netlik',
      'İştah kontrolü',
    ],
    warnings: [
      'İlk günlerde yorgunluk hissedilebilir',
      'Bol su tüketimi önemli',
      'Kronik hastalığı olanlar doktor kontrolünde uygulamalı',
    ],
  };

  const handleActivateDiet = () => {
    // Burada diyet aktifleştirme API çağrısı yapılacak
    alert('Diyet aktifleştirildi! Öğünleriniz planlandı.');
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={Colors.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <Image source={{ uri: diet.image }} style={styles.headerImage} />

      <ScrollView style={styles.content}>
        {/* Title Section */}
        <View style={styles.titleSection}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{diet.category}</Text>
          </View>
          <Text style={styles.title}>{diet.name}</Text>
          <Text style={styles.description}>{diet.description}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
            <Text style={styles.statLabel}>Süre</Text>
            <Text style={styles.statValue}>{diet.duration}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="flame-outline" size={24} color={Colors.primary} />
            <Text style={styles.statLabel}>Kalori</Text>
            <Text style={styles.statValue}>{diet.calories} kcal</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="fitness-outline" size={24} color={Colors.primary} />
            <Text style={styles.statLabel}>Makro</Text>
            <Text style={styles.statValue}>P/C/Y</Text>
          </View>
        </View>

        {/* Macros */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Makro Oranları</Text>
          <View style={styles.macrosGrid}>
            <View style={styles.macroItem}>
              <View style={[styles.macroBar, { backgroundColor: '#FF6B6B', width: `${diet.macros.protein}%` }]} />
              <Text style={styles.macroLabel}>Protein {diet.macros.protein}%</Text>
            </View>
            <View style={styles.macroItem}>
              <View style={[styles.macroBar, { backgroundColor: '#4ECDC4', width: `${diet.macros.carbs}%` }]} />
              <Text style={styles.macroLabel}>Karbonhidrat {diet.macros.carbs}%</Text>
            </View>
            <View style={styles.macroItem}>
              <View style={[styles.macroBar, { backgroundColor: '#FFE66D', width: `${diet.macros.fat}%` }]} />
              <Text style={styles.macroLabel}>Yağ {diet.macros.fat}%</Text>
            </View>
          </View>
        </View>

        {/* Meals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Örnek Günlük Öğünler</Text>
          {diet.meals.map((meal, index) => (
            <View key={index} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealType}>{meal.type}</Text>
                <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
              </View>
              <View style={styles.mealItems}>
                {meal.items.map((item, idx) => (
                  <View key={idx} style={styles.mealItemRow}>
                    <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                    <Text style={styles.mealItem}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Benefits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Faydaları</Text>
          {diet.benefits.map((benefit, index) => (
            <View key={index} style={styles.listItem}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
              <Text style={styles.listText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {/* Warnings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dikkat Edilmesi Gerekenler</Text>
          {diet.warnings.map((warning, index) => (
            <View key={index} style={styles.listItem}>
              <Ionicons name="alert-circle" size={20} color={Colors.warning} />
              <Text style={styles.listText}>{warning}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Activate Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.activateButton} onPress={handleActivateDiet}>
          <Ionicons name="rocket" size={24} color={Colors.white} />
          <Text style={styles.activateButtonText}>Diyeti Başlat</Text>
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
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  content: {
    flex: 1,
  },
  titleSection: {
    padding: 20,
    backgroundColor: Colors.white,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: Colors.lightText,
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginTop: 8,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.lightText,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkText,
  },
  section: {
    backgroundColor: Colors.white,
    padding: 20,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.darkText,
    marginBottom: 16,
  },
  macrosGrid: {
    gap: 12,
  },
  macroItem: {
    gap: 8,
  },
  macroBar: {
    height: 8,
    borderRadius: 4,
  },
  macroLabel: {
    fontSize: 14,
    color: Colors.darkText,
  },
  mealCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  mealType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkText,
  },
  mealCalories: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  mealItems: {
    gap: 8,
  },
  mealItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealItem: {
    fontSize: 14,
    color: Colors.darkText,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    color: Colors.darkText,
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  activateButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  activateButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
