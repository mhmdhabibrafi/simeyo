"use client";
import * as Popover from "@radix-ui/react-popover";
import { Info } from "lucide-react";
export function InfoPopover({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="icon-button" aria-label={title}>
          <Info size={18} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          className="z-40 max-w-[280px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6 shadow-lg"
        >
          {children}
          <Popover.Arrow className="fill-[var(--surface)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
