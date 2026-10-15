"use client";
import * as Menu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import {
  Menu as MenuIcon,
  UserRound,
  Settings,
  Bookmark,
  ShieldCheck,
  LogOut,
  PanelLeft,
} from "lucide-react";
import { useMe } from "@/lib/auth";
export function AccountMenu({
  onLogout,
  onToggleNavigation,
  collapsed,
}: {
  onLogout?: () => void;
  onToggleNavigation?: () => void;
  collapsed?: boolean;
}) {
  const { data: user } = useMe();
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <button className="icon-button" aria-label="Menu akun">
          <MenuIcon size={20} />
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
          {[
            ...(user?.verified
              ? [{ href: "/bookmarks", label: "Tersimpan", icon: Bookmark }]
              : []),
            {
              href: "/verification",
              label: "Status verifikasi",
              icon: ShieldCheck,
            },
            ...(user?.can_moderate
              ? [
                  {
                    href: "/admin/moderation",
                    label: "Moderasi",
                    icon: ShieldCheck,
                  },
                ]
              : []),
            ...(user?.can_review_verifications
              ? [
                  {
                    href: "/admin/verifications",
                    label: "Review afiliasi",
                    icon: ShieldCheck,
                  },
                ]
              : []),
          ].map((item) => (
            <Menu.Item asChild key={item.href}>
              <Link
                href={item.href}
                className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm outline-none data-[highlighted]:bg-[var(--soft)]"
              >
                <item.icon size={17} />
                {item.label}
              </Link>
            </Menu.Item>
          ))}
          {onToggleNavigation && (
            <div className="hidden xl:contents">
            <Menu.Item
              className="menu-choice gap-3"
              onSelect={onToggleNavigation}
            >
              <PanelLeft size={17} />
              {collapsed ? "Perluas navigasi" : "Ringkas navigasi"}
            </Menu.Item>
            </div>
          )}
          {onLogout && (
            <>
              <Menu.Separator className="my-1 h-px bg-[var(--border)]" />
              <Menu.Item className="menu-choice gap-3" onSelect={onLogout}>
                <LogOut size={17} />
                Keluar
              </Menu.Item>
            </>
          )}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
