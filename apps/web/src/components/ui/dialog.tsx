"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  variant = "default",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "composer";
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl",
            className,
            variant === "composer" && "p-0",
          )}
        >
          <DialogPrimitive.Title
            className={
              variant === "composer"
                ? "border-b border-[var(--border)] px-20 py-5 text-center text-base font-semibold"
                : "pr-8 text-xl font-semibold"
            }
          >
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description
            className={
              variant === "composer"
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
            className={
              variant === "composer"
                ? "absolute left-4 top-4 rounded-lg px-2 py-1.5 text-sm"
                : "absolute right-4 top-4 rounded-lg p-2"
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
