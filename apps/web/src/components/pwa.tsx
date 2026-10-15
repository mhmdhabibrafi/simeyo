"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { Button } from "./ui/button";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
type PwaState = {
  install: InstallEvent | null;
  waiting: ServiceWorker | null;
  error: string;
};
const Context = createContext<PwaState>({
  install: null,
  waiting: null,
  error: "",
});
export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    let disposed = false;
    let chosenUpdate = false;
    const prompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const installed = () => setInstall(null);
    const updating = () => {
      chosenUpdate = true;
    };
    const controlled = () => {
      if (chosenUpdate) location.reload();
    };
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("appinstalled", installed);
    window.addEventListener("ruang-update", updating);
    navigator.serviceWorker.addEventListener("controllerchange", controlled);
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        if (disposed) return;
        setWaiting(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (
              !disposed &&
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            )
              setWaiting(worker);
          });
        });
      })
      .catch(() => {
        if (!disposed)
          setError(
            "Pemasangan offline belum tersedia. Kamu tetap bisa menggunakan Simeyo melalui browser.",
          );
      });
    return () => {
      disposed = true;
      window.removeEventListener("beforeinstallprompt", prompt);
      window.removeEventListener("appinstalled", installed);
      window.removeEventListener("ruang-update", updating);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        controlled,
      );
    };
  }, []);
  return (
    <Context.Provider value={{ install, waiting, error }}>
      {children}
    </Context.Provider>
  );
}
export function PwaControls() {
  const { install, waiting, error } = useContext(Context);
  const [message, setMessage] = useState("");
  return (
    <section className="border-t border-[var(--border)] pt-6">
      <h2 className="text-sm font-semibold">Aplikasi web</h2>
      <p className="my-3 text-xs leading-6 text-[var(--muted)]">
        Pasang Simeyo dari menu browser atau Bagikan → Tambahkan ke Layar Utama
        pada Safari. Cerita dan pesan privat memerlukan koneksi internet.
      </p>
      {install && (
        <Button
          variant="outline"
          onClick={async () => {
            await install.prompt();
            const choice = await install.userChoice;
            setMessage(
              choice.outcome === "accepted"
                ? "Pemasangan dimulai."
                : "Kamu bisa memasang melalui menu browser kapan saja.",
            );
          }}
        >
          Pasang Simeyo
        </Button>
      )}
      {waiting && (
        <div className="mt-4">
          <p className="mb-3 text-xs leading-6">
            Versi baru tersedia. Simpan atau kirim draf sebelum memperbarui
            aplikasi.
          </p>
          <Button
            onClick={() => {
              window.dispatchEvent(new Event("ruang-update"));
              waiting.postMessage({ type: "SKIP_WAITING" });
            }}
          >
            Perbarui aplikasi
          </Button>
        </div>
      )}
      {(error || message) && (
        <p role="status" className="mt-3 text-xs">
          {error || message}
        </p>
      )}
    </section>
  );
}
