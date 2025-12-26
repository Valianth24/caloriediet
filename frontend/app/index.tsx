import { Text, View, StyleSheet, Image } from "react-native";
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || '';

export default function Index() {
  if (__DEV__) {
    console.log('[Index] Backend URL:', BACKEND_URL);
  }

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/app-image.png")}
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0c0c0c",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
});
