"use client";

import Link from "next/link";
import { useRef } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Boxes, KeyRound, LayoutGrid, LogOut, Server, Settings, UserRound } from "lucide-react";

// Top bar for the bigface pages (/order, /panel, /panel/:id). The brand, a pill navigation and an
// avatar menu. No create button here: New instance sits in the page header. Protocol endpoints
// (discovery, jwks) live in the avatar menu, not in the bar. Sign out posts to /logout, the only
// method that route accepts.
const USER = "user@example.com";

export type Section = "instances" | "services" | "account";

const NAV: { id: Section; label: string; href?: string; icon: React.ReactNode; disabled?: boolean }[] = [
  { id: "instances", label: "Instances", href: "/panel", icon: <Server className="size-4" /> },
  { id: "services", label: "Services", icon: <Boxes className="size-4" />, disabled: true },
  { id: "account", label: "Account", href: "/account", icon: <UserRound className="size-4" /> },
];

export function AppHeader({ active }: { active: Section }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-6 py-3">
        <Link href="/panel" className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span aria-hidden>🏛️</span>
          <span>YourID</span>
          <span className="font-normal text-muted-foreground">· Agent Cloud</span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-2">
          {NAV.map((i) => {
            const on = i.id === active;
            const cls =
              "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm " +
              (on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground") +
              (i.disabled ? " cursor-not-allowed opacity-50" : "");
            return i.disabled || !i.href ? (
              <span key={i.id} aria-disabled="true" className={cls}>{i.icon}{i.label}</span>
            ) : (
              <Link key={i.id} href={i.href} aria-current={on ? "page" : undefined} className={cls}>{i.icon}{i.label}</Link>
            );
          })}
        </nav>
        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Account menu" className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">U</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal text-muted-foreground">{USER}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/account"><Settings className="size-4" />Account</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account"><KeyRound className="size-4" />Connected apps</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/.well-known/openid-configuration"><LayoutGrid className="size-4" />Discovery</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/.well-known/jwks.json"><LayoutGrid className="size-4" />JWKS</a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => formRef.current?.requestSubmit()}>
                <LogOut className="size-4" />Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <form ref={formRef} method="POST" action="/logout" className="hidden" />
        </div>
      </div>
    </header>
  );
}
