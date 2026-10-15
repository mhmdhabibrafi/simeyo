"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { Moon, Sun, X } from "lucide-react";
import { PwaProvider } from "./pwa";
const ToastContext = createContext<(message: string) => void>(() => {});
export function useToast() {
  return useContext(ToastContext);
}
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: 15000,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timeout);
  }, [toast]);
  return (
    <QueryClientProvider client={client}>
      <ToastContext.Provider value={setToast}>
        <PwaProvider>{children}</PwaProvider>
        {toast && (
          <div
            role="status"
            className="fixed bottom-24 left-1/2 z-[80] flex max-w-[90vw] -translate-x-1/2 items-center gap-4 rounded-2xl bg-[var(--foreground)] px-5 py-4 text-sm text-[var(--surface)] shadow-lg"
          >
            {toast}
            <button
              aria-label="Tutup pemberitahuan"
              onClick={() => setToast("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </ToastContext.Provider>
    </QueryClientProvider>
  );
}
export function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribeTheme,
    () => document.documentElement.dataset.theme === "dark",
    () => false,
  );
  useEffect(() => {
    const value = localStorage.getItem("ruang-theme");
    const enabled =
      value === "dark" ||
      (!value && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = enabled ? "dark" : "light";
    window.dispatchEvent(new Event("ruang-theme"));
  }, []);
  return (
    <button
      className="icon-button"
      aria-label={dark ? "Gunakan tema terang" : "Gunakan tema gelap"}
      onClick={() => {
        const enabled = !dark;
        document.documentElement.dataset.theme = enabled ? "dark" : "light";
        localStorage.setItem("ruang-theme", enabled ? "dark" : "light");
        window.dispatchEvent(new Event("ruang-theme"));
      }}
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
function subscribeTheme(callback: () => void) {
  window.addEventListener("ruang-theme", callback);
  return () => window.removeEventListener("ruang-theme", callback);
}
