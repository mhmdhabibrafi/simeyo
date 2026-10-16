"use client";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { hasNavigationHistory } from "../navigation-memory";
export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="icon-button -ml-2 shrink-0"
      aria-label="Kembali"
      onClick={() =>
        hasNavigationHistory() ? router.back() : router.replace("/home")
      }
    >
      <ArrowLeft size={20} />
    </button>
  );
}
