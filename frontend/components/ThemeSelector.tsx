import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ToastAndroid, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { themes, themeMetadata, ThemeName } from '../constants/Themes';

const showToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
};

function ThemeSelector() {
  const { currentTheme, setTheme, isPremium } = useTheme();

  const handleThemePress = useCallback((themeName: ThemeName) => {
    // Varsayılan tema her zaman açık, diğerleri premium
    if (themeName !== 'default' && !isPremium) {
      Alert.alert(
        'Premium Tema',
        'Bu temayı kullanmak için Premium üyelik gerekiyor.',
        [{ text: 'Tamam', style: 'default' }]
      );
      return;
    }
    
    setTheme(themeName);
    showToast(`${themeMetadata[themeName].name} teması aktif!`);
  }, [setTheme, isPremium]);

  const themeList = Object.keys(themeMetadata) as ThemeName[];

  return (
    <View style={styles.container}>
      {/* Başlık */}
      <View style={styles.header}>
        <Ionicons name="color-palette-outline" size={22} color="#4CAF50" />
        <Text style={styles.headerText}>Temalar</Text>
        {isPremium && (
          <View style={styles.proBadge}>
            <Text style={styles.proText}>PRO</Text>
          </View>
        )}
      </View>

      {/* Tema Kartları */}
      <View style={styles.grid}>
        {themeList.map((themeName) => {
          const meta = themeMetadata[themeName];
          const isActive = currentTheme === themeName;
          const isLocked = themeName !== 'default' && !isPremium;

          return (
            <TouchableOpacity
              key={themeName}
              style={[
                styles.card,
                isActive && { borderColor: meta.color, borderWidth: 2 },
                isLocked && styles.lockedCard,
              ]}
              onPress={() => handleThemePress(themeName)}
              activeOpacity={0.8}
            >
              {/* Kilit veya Aktif Badge */}
              {isActive && (
                <View style={[styles.badge, { backgroundColor: meta.color }]}>
                  <Ionicons name="checkmark" size={12} color="#FFF" />
                </View>
              )}
              {isLocked && (
                <View style={[styles.badge, { backgroundColor: '#9CA3AF' }]}>
                  <Ionicons name="lock-closed" size={10} color="#FFF" />
                </View>
              )}

              {/* İkon */}
              <View style={[styles.iconCircle, { backgroundColor: meta.color }]}>
                <Ionicons name={meta.icon as any} size={24} color="#FFF" />
              </View>

              {/* İsim */}
              <Text style={[styles.themeName, isLocked && styles.lockedText]}>
                {meta.name}
              </Text>

              {/* Renk Noktası */}
              <View style={[styles.colorDot, { backgroundColor: meta.color }]} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Premium Bilgi */}
      {!isPremium && (
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color="#757575" />
          <Text style={styles.infoText}>
            Premium üyelik ile tüm temalara erişin
          </Text>
        </View>
      )}
    </View>
  );
}

export default memo(ThemeSelector);

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  headerText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  proBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  proText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47%',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  lockedCard: {
    opacity: 0.6,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  lockedText: {
    color: '#9CA3AF',
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#757575',
    flex: 1,
  },
});
