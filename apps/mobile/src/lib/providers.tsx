import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  AppState,
  Platform,
  Text,
  View,
  useColorScheme,
} from "react-native";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
  focusManager,
} from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { createSessionTransport, normalizeOrigin, type ApiClient } from "./client";
import { readToken, saveToken } from "./session-storage";
import { userSchema, type User } from "./contracts";
type Session = {
  token: string | null;
  user: User | null;
  ready: boolean;
  api: ApiClient;
  origin: string;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};
const SessionContext = createContext<Session | null>(null);
export const light = {
  background: "#ffffff",
  surface: "#f7f7fa",
  text: "#17171b",
  muted: "#686872",
  border: "#e8e8ef",
  accent: "#6342e8",
  accentSoft: "#f0edff",
  danger: "#b42338",
};
export const dark = {
  background: "#111113",
  surface: "#1b1b20",
  text: "#f4f4f6",
  muted: "#aaaab7",
  border: "#303039",
  accent: "#b49cff",
  accentSoft: "#292039",
  danger: "#ff8fa0",
};
type Theme = {
  colors: typeof light;
  mode: "system" | "light" | "dark";
  setMode: (mode: "system" | "light" | "dark") => void;
  isDark: boolean;
};
const ThemeContext = createContext<Theme>({
  colors: light,
  mode: "system",
  setMode: () => {},
  isDark: false,
});
export function useTheme() {
  return useContext(ThemeContext);
}
export function useSession() {
  const s = useContext(SessionContext);
  if (!s) throw new Error("Session provider missing");
  return s;
}
function SessionProvider({ children }: { children: React.ReactNode }) {
  const client = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [origin] = useState(() =>
    normalizeOrigin(
      process.env.EXPO_PUBLIC_API_URL ??
        (Platform.OS === "android"
          ? "http://10.0.2.2:8000"
          : "http://localhost:8000"),
      __DEV__,
    ),
  );
  const clearView = () => {
    setToken(null);
    setUser(null);
    client.clear();
    void Image.clearMemoryCache().catch(()=>{});
    void saveToken(null).catch(() =>
      setError("Sesi lokal belum dapat dihapus. Tutup aplikasi dan coba lagi."),
    );
  };
  const [transport] = useState(() => createSessionTransport(origin,clearView));
  const {api}=transport;
  const clear=()=>{transport.setToken(null);clearView();};
  const refresh = async () => {
    const value = transport.getToken();
    if (!value) return;
    const r = await api<{ data: unknown }>("me");
    if (value === transport.getToken()) setUser(userSchema.parse(r.data));
  };
  useEffect(() => {
    let alive = true;
    readToken()
      .then(async (value) => {
        if (!alive) return;
        if (value) {
          transport.setToken(value);
          setToken(value);
          const r = await api<{ data: unknown }>("me");
          if (alive && transport.getToken() === value)
            setUser(userSchema.parse(r.data));
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [api,transport]);
  const login = async (email: string, password: string) => {
    const r = await api<{ data: { token: string; user: unknown } }>(
      "auth/native/login",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          device_name:
            Platform.OS === "android"
              ? "Simeyo Android"
              : Platform.OS === "ios"
                ? "Simeyo iOS"
                : "Simeyo web preview",
        }),
      },
    );
    const profile = userSchema.parse(r.data.user);
    if (typeof r.data.token !== "string" || !r.data.token)
      throw new Error("Sesi layanan tidak valid.");
    try { await saveToken(r.data.token); } catch (error) {await api('auth/native/logout',{method:'POST',headers:{Authorization:`Bearer ${r.data.token}`}}).catch(()=>{});throw error;}
    client.clear();
    transport.setToken(r.data.token);
    setToken(r.data.token);
    setUser(profile);
    setError("");
  };
  const logout = async () => {
    let failed = false;
    try {
      await api("auth/native/logout", { method: "POST" });
    } catch {
      failed = true;
    } finally {
      clear();
    }
    if (failed)
      throw new Error(
        "Kamu sudah keluar dari perangkat ini. Pencabutan sesi server belum dapat dikonfirmasi.",
      );
  };
  if (!ready)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: light.background,
        }}
      >
        <ActivityIndicator
          accessibilityLabel="Memuat sesi aman"
          color={light.accent}
        />
      </View>
    );
  return (
    <SessionContext.Provider
      value={{ token, user, ready, api, origin, refresh, login, logout }}
    >
      {!!error && (
        <Text
          accessibilityRole="alert"
          style={{ padding: 16, color: light.danger }}
        >
          {error}
        </Text>
      )}
      {children}
    </SessionContext.Provider>
  );
}
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: 10000,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );
  const system = useColorScheme();
  const [mode, setThemeMode] = useState<"system" | "light" | "dark">("system");
  useEffect(() => {
    AsyncStorage.getItem("ruang.theme")
      .then((value) => {
        if (value === "dark" || value === "light") setThemeMode(value);
      })
      .catch(() => {});
    const sub = AppState.addEventListener("change", (state) =>
      focusManager.setFocused(state === "active"),
    );
    return () => sub.remove();
  }, []);
  const isDark = mode === "system" ? system === "dark" : mode === "dark";
  const setMode = (value: "system" | "light" | "dark") => {
    setThemeMode(value);
    void AsyncStorage.setItem("ruang.theme", value).catch(() => {});
  };
  return (
    <QueryClientProvider client={client}>
      <ThemeContext.Provider
        value={{ colors: isDark ? dark : light, mode, setMode, isDark }}
      >
        <SessionProvider>{children}</SessionProvider>
      </ThemeContext.Provider>
    </QueryClientProvider>
  );
}
