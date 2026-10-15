"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useMe } from "@/lib/auth";
import { Avatar } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Composer } from "./composer";

const ComposerContext = createContext<() => void>(() => {});
export const useThreadComposer = () => useContext(ComposerContext);

export function ThreadComposerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [state, setState] = useState({ dirty: false, busy: false });
  const openComposer = useCallback(() => setOpen(true), []);
  function close(value: boolean) {
    if (!value && state.busy) return;
    if (!value && state.dirty) {
      setDiscard(true);
      return;
    }
    setOpen(value);
  }
  return (
    <ComposerContext.Provider value={openComposer}>
      {children}
      <ConfirmDialog
        open={open}
        onOpenChange={close}
        title="Cerita baru"
        description="Bagikan cerita, pertanyaan, atau sudut pandangmu."
        className="max-w-[620px]"
        variant="composer"
      >
        <Composer
          autoFocus
          onStateChange={setState}
          onDone={() => {
            setOpen(false);
            setState({ dirty: false, busy: false });
          }}
        />
      </ConfirmDialog>
      <ConfirmDialog
        open={discard}
        onOpenChange={setDiscard}
        title="Buang draf?"
        description="Tulisan dan lampiran ini belum dibagikan."
      >
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDiscard(false)}>
            Lanjut menulis
          </Button>
          <Button
            onClick={() => {
              setDiscard(false);
              setOpen(false);
              setState({ dirty: false, busy: false });
            }}
          >
            Buang draf
          </Button>
        </div>
      </ConfirmDialog>
    </ComposerContext.Provider>
  );
}

export function ThreadComposerTrigger() {
  const { data: user } = useMe();
  const open = useThreadComposer();
  if (!user?.verified || !user.email_verified) return null;
  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-4 sm:px-6">
      <Avatar name={user.name} url={user.avatar_url} size={36} />
      <button
        type="button"
        aria-label="Tulis cerita"
        onClick={open}
        className="min-w-0 flex-1 py-2 text-left text-[15px] text-[var(--muted)]"
      >
        Apa yang baru?
      </button>
      <Button variant="outline" onClick={open} className="min-h-9 px-4 py-1.5">
        Posting
      </Button>
    </div>
  );
}
