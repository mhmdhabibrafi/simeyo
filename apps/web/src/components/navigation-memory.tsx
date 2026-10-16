"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const positions = new Map<string, { x: number; y: number }>();
let activeKey: string | null = null;
export function clearNavigationMemory() {
  positions.clear();
  activeKey = null;
}
export function hasNavigationHistory() {
  return (
    typeof history.state?.simeyoPreviousEntry === "string" &&
    positions.has(history.state.simeyoPreviousEntry)
  );
}
export function NavigationMemory({ userId }: { userId: number }) {
  const pathname = usePathname();
  useEffect(() => {
    const restoreDocument = !pathname.startsWith("/messages");
    const previousMode = history.scrollRestoration;
    if (restoreDocument) history.scrollRestoration = "manual";
    let entry = history.state?.simeyoScrollEntry as string | undefined;
    if (!entry || history.state?.simeyoScrollPath !== pathname) {
      entry = crypto.randomUUID();
      history.replaceState(
        {
          ...history.state,
          simeyoScrollEntry: entry,
          simeyoScrollPath: pathname,
          simeyoPreviousEntry: activeKey?.startsWith(`${userId}:`)
            ? activeKey
            : null,
        },
        "",
      );
    }
    const key = `${userId}:${entry}`;
    activeKey = key;
    const target = positions.get(key);
    let restoring = !!target && restoreDocument;
    let cancelled = false;
    function save() {
      if (
        restoring ||
        location.pathname !== pathname ||
        history.state?.simeyoScrollEntry !== entry
      )
        return;
      positions.delete(key);
      positions.set(key, { x: scrollX, y: scrollY });
      if (positions.size > 60) positions.delete(positions.keys().next().value!);
    }
    function restore() {
      if (
        !cancelled &&
        restoreDocument &&
        target &&
        document.documentElement.scrollHeight - innerHeight >= target.y
      )
        window.scrollTo({ left: target.x, top: target.y, behavior: "instant" });
    }
    function stop() {
      cancelled = true;
      restoring = false;
    }
    const frame = requestAnimationFrame(() => requestAnimationFrame(restore));
    const settle = setTimeout(restore, 150);
    const deadline = setTimeout(() => {
      restoring = false;
      cancelled = true;
    }, 3000);
    const observer = new ResizeObserver(restore);
    observer.observe(document.body);
    window.addEventListener("scroll", save, { passive: true });
    document.addEventListener("click", save, true);
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);
    return () => {
      save();
      cancelled = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      clearTimeout(deadline);
      window.removeEventListener("scroll", save);
      document.removeEventListener("click", save, true);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
      history.scrollRestoration = previousMode;
    };
  }, [pathname, userId]);
  return null;
}
