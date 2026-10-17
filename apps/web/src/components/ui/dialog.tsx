"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef } from "react";
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  variant = "default",
  busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "composer" | "media";
  busy?: boolean;
}) {
  const previousFocus = useRef<HTMLElement | null>(null);
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <DialogPrimitive.Content
          data-layout={variant}
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (busy) event.preventDefault();
          }}
          onOpenAutoFocus={() => {
            previousFocus.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
          }}
          onCloseAutoFocus={(event) => {
            if (previousFocus.current?.isConnected) {
              event.preventDefault();
              previousFocus.current.focus();
            }
          }}
          className={cn(
            "app-dialog fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl",
            className,
            variant === "composer" &&
              "p-0 max-sm:bottom-0 max-sm:top-auto max-sm:max-h-[calc(100dvh-24px)] max-sm:w-full max-sm:translate-y-0 max-sm:rounded-b-none max-sm:pb-[env(safe-area-inset-bottom)]",
          )}
        >
          <DialogPrimitive.Title
            className={
              variant === "media"
                ? "sr-only"
                : variant === "composer"
                  ? "border-b border-[var(--border)] px-20 py-5 text-center text-base font-semibold"
                  : "pr-8 text-xl font-semibold"
            }
          >
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description
            className={
              variant === "media"
                ? "sr-only"
                : variant === "composer"
                  ? "sr-only"
                  : "my-4 text-sm leading-6 text-[var(--muted)]"
            }
          >
            {description}
          </DialogPrimitive.Description>
          {variant === "composer" ? (
            <div className="px-5 py-5 sm:px-6">{children}</div>
          ) : (
            children
          )}
          <DialogPrimitive.Close
            disabled={busy}
            className={
              variant === "composer"
                ? "absolute left-4 top-4 rounded-lg px-2 py-1.5 text-sm"
                : "absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-xl disabled:opacity-40"
            }
            aria-label={variant === "composer" ? "Batal" : "Tutup"}
          >
            {variant === "composer" ? "Batal" : <X size={20} />}
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
