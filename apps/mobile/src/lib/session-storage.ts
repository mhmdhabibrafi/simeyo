import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
const KEY = "ruang.native.token";
let previewToken: string | null = null;
export async function readToken(): Promise<string | null> {
  if (Platform.OS === "web") return previewToken;
  if (!(await SecureStore.isAvailableAsync()))
    throw new Error(
      "Penyimpanan sesi yang aman tidak tersedia pada perangkat ini.",
    );
  if (!(await AsyncStorage.getItem("ruang.installation"))) {
    await SecureStore.deleteItemAsync(KEY);
    await AsyncStorage.setItem("ruang.installation", "1");
  }
  return SecureStore.getItemAsync(KEY);
}
export async function saveToken(token: string | null): Promise<void> {
  if (Platform.OS === "web") {
    previewToken = token;
    return;
  }
  if (token)
    await SecureStore.setItemAsync(KEY, token, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  else await SecureStore.deleteItemAsync(KEY);
}
