"use client";

import { Link, useRouterState } from "@tanstack/react-router";
import { Home, User, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/user-menu";
import { useMe } from "@/hooks/data/use-me";

const LINKS = [
  { href: "/",               label: "Home",      icon: Home,            exact: true },
  { href: "/account/profile", label: "Profile",   icon: User,            exact: false },
  { href: "/dashboard",      label: "Dashboard", icon: LayoutDashboard, exact: false },
];

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export function Nav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: me } = useMe();

  // Dashboard link only shown to authenticated users
  const links = me ? LINKS : LINKS.filter((l) => l.href !== "/dashboard");

  // On dashboard/account: sidebar owns desktop nav — hide top bar, keep mobile bottom nav
  const hiddenDesktop =
    pathname.startsWith("/dashboard") || pathname.startsWith("/account");

  return (
    <>
      {/* ── Desktop top nav ── */}
      <header className={cn("hidden sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur", !hiddenDesktop && "md:block")}>
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 h-12">
          <Link to="/" className="text-sm font-semibold tracking-tight mr-2">
            Auth App
          </Link>

          <nav className="flex items-center gap-1">
            {links.map(({ href, label, icon: Icon, exact }) => (
              <Link
                key={href}
                to={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive(pathname, href, exact)
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto">
            <UserMenu />
          </div>
        </div>
      </header>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur flex items-end pb-safe">
        {links.map(({ href, label, icon: Icon, exact }) => (
          <Link
            key={href}
            to={href}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-muted-foreground"
          >
            <Icon
              className={cn(
                "size-5",
                isActive(pathname, href, exact) && "text-foreground",
              )}
              strokeWidth={isActive(pathname, href, exact) ? 2.5 : 1.5}
            />
            <span
              className={cn(
                "text-[10px]",
                isActive(pathname, href, exact)
                  ? "text-foreground font-semibold"
                  : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </Link>
        ))}
      </nav>
    </>
  );
}
