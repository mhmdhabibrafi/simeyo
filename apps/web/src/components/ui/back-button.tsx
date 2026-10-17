"use client";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { hasNavigationHistory } from "../navigation-memory";
export function BackButton({
  fallback = "/home",
  label = "Kembali",
}: {
  fallback?: string;
  label?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="icon-button -ml-2 shrink-0"
      aria-label={label}
      onClick={() =>
        hasNavigationHistory() ? router.back() : router.replace(fallback)
      }
    >
      <ArrowLeft size={20} />
    </button>
  );
}
