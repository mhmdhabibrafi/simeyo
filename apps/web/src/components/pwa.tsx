"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Download, X } from "lucide-react";
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
  const [offerInstall, setOfferInstall] = useState(false);
  const [installing, setInstalling] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    let disposed = false;
    let chosenUpdate = false;
    const prompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
      if (!matchMedia("(display-mode: standalone)").matches) {
        try {
          setOfferInstall(
            sessionStorage.getItem("simeyo-install-dismissed") !== "1",
          );
        } catch {
          setOfferInstall(true);
        }
      }
    };
    const installed = () => {
      setInstall(null);
      setOfferInstall(false);
    };
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
      {offerInstall && install && (
        <aside
          role="dialog"
          aria-label="Pasang Simeyo"
          aria-modal="false"
          className="install-offer fixed bottom-[calc(var(--mobile-nav-height)+12px)] left-4 right-4 z-40 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl sm:left-auto sm:w-80 md:bottom-6 md:right-6"
        >
          <div className="flex items-start gap-3">
            <Download size={24} className="mt-1 shrink-0" />
            <div className="flex-1">
              <h2 className="text-sm font-semibold">Simeyo di layar utamamu</h2>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                Buka lebih cepat, langsung seperti aplikasi.
              </p>
            </div>
            <button
              aria-label="Tutup ajakan instal"
              className="icon-button -mr-3 -mt-3"
              disabled={installing}
              onClick={() => {
                setOfferInstall(false);
                try {
                  sessionStorage.setItem("simeyo-install-dismissed", "1");
                } catch {}
              }}
            >
              <X size={17} />
            </button>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              disabled={installing}
              onClick={() => {
                setOfferInstall(false);
                try {
                  sessionStorage.setItem("simeyo-install-dismissed", "1");
                } catch {}
              }}
            >
              Nanti saja
            </Button>
            <Button
              disabled={installing}
              onClick={async () => {
                setInstalling(true);
                try {
                  await install.prompt();
                  const result = await install.userChoice;
                  setOfferInstall(false);
                  setInstall(null);
                  if (result.outcome !== "accepted") {
                    try {
                      sessionStorage.setItem("simeyo-install-dismissed", "1");
                    } catch {}
                  }
                } catch {
                  setError(
                    "Pemasangan belum dapat dimulai. Coba lewat Pengaturan.",
                  );
                  setOfferInstall(false);
                } finally {
                  setInstalling(false);
                }
              }}
            >
              {installing ? "Membuka…" : "Pasang"}
            </Button>
          </div>
        </aside>
      )}
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
