import React from 'react';
import { Stack } from 'expo-router';

export default function DetailsLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="vitamins" 
        options={{ title: 'Vitamins' }}
      />
      <Stack.Screen 
        name="water-detail" 
        options={{ title: 'Water Tracking' }}
      />
      <Stack.Screen 
        name="meal-detail" 
        options={{ title: 'Meal Detail' }}
      />
      <Stack.Screen 
        name="steps" 
        options={{ title: 'Steps' }}
      />
      <Stack.Screen 
        name="diet-detail" 
        options={{ title: 'Diet Detail' }}
      />
    </Stack>
  );
}
