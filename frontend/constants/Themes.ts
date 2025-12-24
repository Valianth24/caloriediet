// Varsayılan Tema - Yeşil/Beyaz (Orijinal)
export const DefaultTheme = {
  primary: '#4CAF50',
  secondary: '#26C6DA',
  teal: '#26C6DA',
  background: '#F5F5F5',
  white: '#FFFFFF',
  darkText: '#212121',
  lightText: '#757575',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  cardShadow: 'rgba(0, 0, 0, 0.1)',
  grey: '#9CA3AF',
  orange: '#FF9800',
  lightGreen: '#81C784',
};

// Pembe Tema - Açık Pastel Pembe
export const PinkTheme = {
  primary: '#E91E63',
  secondary: '#F48FB1',
  teal: '#F48FB1',
  background: '#FFF5F7',
  white: '#FFFFFF',
  darkText: '#4A2C3D',
  lightText: '#8E7583',
  success: '#81C784',
  error: '#E91E63',
  warning: '#FFB74D',
  cardShadow: 'rgba(233, 30, 99, 0.1)',
  grey: '#D7CCD4',
  orange: '#FF4081',
  lightGreen: '#81E6B8',
};

// Mavi Tema - Okyanus
export const OceanTheme = {
  primary: '#2196F3',
  secondary: '#64B5F6',
  teal: '#26C6DA',
  background: '#F0F8FF',
  white: '#FFFFFF',
  darkText: '#1A365D',
  lightText: '#4A5568',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  cardShadow: 'rgba(33, 150, 243, 0.1)',
  grey: '#90A4AE',
  orange: '#FF9800',
  lightGreen: '#81C784',
};

// Turuncu Tema - Gün Batımı
export const SunsetTheme = {
  primary: '#FF5722',
  secondary: '#FF8A65',
  teal: '#FF8A65',
  background: '#FFF8F5',
  white: '#FFFFFF',
  darkText: '#3E2723',
  lightText: '#6D4C41',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FFB300',
  cardShadow: 'rgba(255, 87, 34, 0.1)',
  grey: '#BCAAA4',
  orange: '#FF9800',
  lightGreen: '#81C784',
};

export const themes = {
  default: DefaultTheme,
  pink: PinkTheme,
  ocean: OceanTheme,
  sunset: SunsetTheme,
};

export type ThemeName = keyof typeof themes;

export const themeMetadata = {
  default: {
    name: 'Varsayılan',
    icon: 'leaf',
    color: '#4CAF50',
  },
  pink: {
    name: 'Pembe',
    icon: 'heart',
    color: '#E91E63',
  },
  ocean: {
    name: 'Okyanus',
    icon: 'water',
    color: '#2196F3',
  },
  sunset: {
    name: 'Gün Batımı',
    icon: 'sunny',
    color: '#FF5722',
  },
};
