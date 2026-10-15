"use client";
import * as Menu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { MoreHorizontal, UserRound, Settings } from "lucide-react";
export function AccountMenu() {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <button className="icon-button" aria-label="Menu akun">
          <MoreHorizontal size={20} />
        </button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          sideOffset={6}
          align="end"
          className="z-40 min-w-48 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-lg"
        >
          <Menu.Item asChild>
            <Link
              href="/profile"
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm outline-none data-[highlighted]:bg-[var(--soft)]"
            >
              <UserRound size={17} />
              Profilmu
            </Link>
          </Menu.Item>
          <Menu.Item asChild>
            <Link
              href="/settings"
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm outline-none data-[highlighted]:bg-[var(--soft)]"
            >
              <Settings size={17} />
              Pengaturan
            </Link>
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
