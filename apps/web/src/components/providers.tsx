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
import { MotionPreference } from "./accessibility";
import { PwaProvider } from "./pwa";
function ViewportSizing() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      if (viewport.scale !== 1) return;
      const style = document.documentElement.style;
      style.setProperty(
        "--app-viewport-height",
        `${Math.round(viewport.height)}px`,
      );
      style.setProperty(
        "--app-viewport-top",
        `${Math.round(viewport.offsetTop)}px`,
      );
      style.setProperty(
        "--message-viewport-height",
        `${Math.round(viewport.height)}px`,
      );
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);
  return null;
}
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
        <ViewportSizing />
        <MotionPreference />
        <PwaProvider>{children}</PwaProvider>
        {toast && (
          <div
            role="status"
            className="toast-message fixed left-1/2 z-[80] flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-4 rounded-2xl bg-[var(--foreground)] px-5 py-4 text-sm text-[var(--surface)] shadow-lg"
          >
            {toast}
            <button
              className="inline-flex min-h-11 min-w-11 items-center justify-center"
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
