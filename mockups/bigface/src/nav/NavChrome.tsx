import type { ReactNode } from "react";
import { Avatar, AvatarFallback } from "@gjuoun/bigface-shadcn-ui/components/ui/avatar";
import { Button } from "@gjuoun/bigface-shadcn-ui/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@gjuoun/bigface-shadcn-ui/components/ui/dropdown-menu";
import { Boxes, KeyRound, LayoutGrid, LogOut, Server, Settings, UserRound } from "lucide-react";
import type { Nav } from "../lib/state";

// The three navigation options. Each is a full top bar; C also adds a left rail.
// Primary actions: "New instance" (order) and "Instances" (panel). Both must be one click away.
// Protocol endpoints (discovery, jwks) are not in the chrome; they live under Account.

export const NAV_LABEL: Record<Nav, string> = { a: "A 极简产品栏", b: "B SaaS 顶栏", c: "C 图标侧栏", none: "原调试顶栏" };

const USER = "user@example.com";

type Item = { id: "instances" | "services" | "account"; label: string; icon: ReactNode; active: boolean; href: string; disabled?: boolean };

function items(active: "instances" | "services" | "account", href: (id: string) => string): Item[] {
  return [
    { id: "instances", label: "Instances", icon: <Server className="size-4" />, active: active === "instances", href: href("instances") },
    { id: "services", label: "Services", icon: <Boxes className="size-4" />, active: active === "services", href: "#", disabled: true },
    { id: "account", label: "Account", icon: <UserRound className="size-4" />, active: active === "account", href: href("account") },
  ];
}

function Brand({ sub }: { sub?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold">
      <span aria-hidden>🏛️</span>
      <span>YourID</span>
      {sub && <span className="font-normal text-muted-foreground">· Agent Cloud</span>}
    </div>
  );
}

// A: brand, plain text nav with an underline on the active item, user and sign out on the right.
export function NavA({ active, href, primary }: { active: "instances" | "services" | "account"; href: (id: string) => string; primary: ReactNode }) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-[1200px] items-center gap-8 px-6 py-3 2xl:max-w-[1600px]">
        <Brand sub />
        <nav aria-label="Primary" className="flex items-center gap-5 text-sm">
          {items(active, href).map((i) => (
            <a
              key={i.id}
              href={i.disabled ? undefined : i.href}
              aria-disabled={i.disabled || undefined}
              className={
                "border-b-2 pb-1 " +
                (i.active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground") +
                (i.disabled ? " cursor-not-allowed opacity-50" : "")
              }
            >
              {i.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4 text-sm">
          {primary}
          <span className="text-muted-foreground">{USER}</span>
          <Button variant="ghost" size="sm">Sign out</Button>
        </div>
      </div>
    </header>
  );
}

// B: brand, pill nav with icon and label (selected pill in the primary colour), avatar menu on the right.
export function NavB({ active, href, primary }: { active: "instances" | "services" | "account"; href: (id: string) => string; primary: ReactNode }) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-6 py-3 2xl:max-w-[1600px]">
        <Brand />
        <nav aria-label="Primary" className="flex items-center gap-2">
          {items(active, href).map((i) => (
            <a
              key={i.id}
              href={i.disabled ? undefined : i.href}
              aria-disabled={i.disabled || undefined}
              className={
                "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm " +
                (i.active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground") +
                (i.disabled ? " cursor-not-allowed opacity-50" : "")
              }
            >
              {i.icon}
              {i.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {primary}
          <UserMenu href={href} />
        </div>
      </div>
    </header>
  );
}

// C: brand and user menu only on the top bar; the primary navigation is a 56px icon rail on the left.
export function NavC({ active, href, primary, children }: { active: "instances" | "services" | "account"; href: (id: string) => string; primary: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-6 py-3 2xl:max-w-[1600px]">
          <Brand />
          <div className="ml-auto flex items-center gap-3">
            {primary}
            <UserMenu href={href} />
          </div>
        </div>
      </header>
      <div className="flex">
        <aside aria-label="Primary" className="sticky top-0 flex h-[calc(100vh-57px)] w-14 shrink-0 flex-col items-center gap-2 border-r border-border bg-card py-3">
          {items(active, href).map((i) => (
            <a
              key={i.id}
              href={i.disabled ? undefined : i.href}
              title={i.label}
              aria-label={i.label}
              aria-disabled={i.disabled || undefined}
              className={
                "flex size-10 items-center justify-center rounded-lg " +
                (i.active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground") +
                (i.disabled ? " cursor-not-allowed opacity-50" : "")
              }
            >
              {i.icon}
            </a>
          ))}
          <div className="mt-auto flex size-10 items-center justify-center rounded-lg text-muted-foreground" title="Sign out" aria-label="Sign out">
            <LogOut className="size-4" />
          </div>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

// The avatar menu. Protocol links (discovery, jwks) are in here, not in the chrome.
function UserMenu({ href }: { href: (id: string) => string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Account menu" className="rounded-full">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">U</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal text-muted-foreground">{USER}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><a href={href("account")}><Settings className="size-4" />Account</a></DropdownMenuItem>
        <DropdownMenuItem asChild><a href={href("account")}><KeyRound className="size-4" />Connected apps</a></DropdownMenuItem>
        <DropdownMenuItem asChild><a href={href("account")}><LayoutGrid className="size-4" />Developer endpoints</a></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem><LogOut className="size-4" />Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { UserRound };
