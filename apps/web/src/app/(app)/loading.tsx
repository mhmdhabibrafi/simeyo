import { LoadingState } from "@/components/ui/loading-state";

export default function Loading() {
  return (
    <div className="p-5 sm:p-6">
      <LoadingState label="Memuat halaman…" />
      <div className="space-y-6" aria-hidden="true">
        {[0, 1, 2].map((key) => (
          <div key={key} className="flex gap-3">
            <div className="skeleton h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="skeleton h-3 w-28" />
              <div className="skeleton h-20 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
