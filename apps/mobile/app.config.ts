import type { ExpoConfig } from "expo/config";
const production = process.env.EAS_BUILD_PROFILE === "production";
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
if (production && (!apiUrl || !apiUrl.startsWith("https://")))
  throw new Error("Production builds require EXPO_PUBLIC_API_URL with HTTPS.");
const config: ExpoConfig = {
  name: "Simeyo",
  slug: "simeyo",
  version: "0.4.0",
  scheme: "simeyo",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  icon: "./assets/icon.png",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "app.simeyo.mobile",
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: "app.simeyo.mobile",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#7047ff",
    },
    predictiveBackGestureEnabled: true,
    softwareKeyboardLayoutMode: "resize",
    ...(process.env.GOOGLE_SERVICES_JSON
      ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON }
      : {}),
  },
  web: { bundler: "metro", output: "single", favicon: "./assets/favicon.png" },
  plugins: [
    "expo-router",
    ["expo-secure-store", { configureAndroidBackup: true }],
    ["expo-notifications", { color: "#7047ff" }],
    [
      "expo-image-picker",
      {
        photosPermission: "Izinkan Simeyo memilih foto yang ingin kamu bagikan.",
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    [
      "expo-build-properties",
      {
        android: { usesCleartextTraffic: !production },
        ios: { enableSceneSupport: true },
      },
    ],
  ],
  extra: {
    ...(process.env.EXPO_PUBLIC_EAS_PROJECT_ID
      ? { eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID } }
      : {}),
  },
};
export default config;
