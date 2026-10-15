import type { ExpoConfig } from "expo/config";
const production = ["preview", "production"].includes(process.env.EAS_BUILD_PROFILE ?? "");
if (production) {
  for (const variable of ["EXPO_PUBLIC_API_URL", "EXPO_PUBLIC_WEB_URL"]) {
    let valid = false;
    try {
      const url = new URL(process.env[variable] ?? "");
      valid = url.protocol === "https:" && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash;
    } catch { /* Report the setting name without echoing its value. */ }
    if (!valid) throw new Error(`Release builds require ${variable} as an HTTPS origin.`);
  }
}
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
