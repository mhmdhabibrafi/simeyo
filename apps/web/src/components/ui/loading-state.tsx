import { LoaderCircle } from "lucide-react";

export function LoadingState({ label = "Memuat…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 py-4 text-sm text-[var(--muted)]"
    >
      <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}
