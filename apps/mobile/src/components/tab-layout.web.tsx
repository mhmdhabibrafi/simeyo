import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useTheme } from "../lib/providers";
export default function Layout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 68,
          paddingTop: 8,
          paddingBottom: 8,
        },
      }}
    >
      {[
        ["index", "Beranda", "⌂"],
        ["explore", "Jelajahi", "⌕"],
        ["compose", "Cerita", "＋"],
        ["activity", "Aktivitas", "♡"],
        ["profile", "Profil", "○"],
      ].map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarAccessibilityLabel: title,
            tabBarIcon: ({ color }) => (
              <Text style={{ fontSize: 22, color }}>{icon}</Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
