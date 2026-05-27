import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Wallet,
  Activity,
  BarChart3,
  HelpCircle,
  Settings,
  ArrowLeftRight,
  Users,
  ChevronRight,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { UserMenu } from "@/components/user-menu";
import type { Role } from "@/lib/roles";

const MAIN_NAV = [
  { href: "/dashboard",           label: "Dashboard",  icon: LayoutDashboard, exact: true },
  { href: "/dashboard/invoices",  label: "Invoices",   icon: FileText,        exact: false },
  { href: "/dashboard/messages",  label: "Messages",   icon: MessageSquare,   exact: false, badge: 3 },
  { href: "/dashboard/wallets",   label: "My Wallets", icon: Wallet,          exact: false },
];

const ACTIVITY_SUB = [
  { href: "/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/dashboard/recipients",   label: "Recipients",   icon: Users },
];

const BOTTOM_NAV = [
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/help",      label: "Get Help",  icon: HelpCircle },
  { href: "/dashboard/settings",  label: "Settings",  icon: Settings },
];

type Props = {
  user: { email: string; role: Role };
  children: React.ReactNode;
};

function matchActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export function DashboardShell({ user, children }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activityActive = ACTIVITY_SUB.some((s) => pathname.startsWith(s.href));
  const [activityOpen, setActivityOpen] = useState(activityActive);

  const currentLabel =
    MAIN_NAV.find((i) => matchActive(pathname, i.href, i.exact))?.label ??
    ACTIVITY_SUB.find((i) => pathname.startsWith(i.href))?.label ??
    BOTTOM_NAV.find((i) => pathname.startsWith(i.href))?.label ??
    "Dashboard";

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        {/* Logo */}
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
                    O
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-bold text-base tracking-tight">
                      Overpay<span className="text-blue-600">.</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">Banking</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {/* Main nav */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {MAIN_NAV.map(({ href, label, icon: Icon, exact, badge }) => {
                  const active = matchActive(pathname, href, exact);
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={label}>
                        <Link to={href}>
                          <Icon />
                          <span>{label}</span>
                          {badge && (
                            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-semibold text-white">
                              {badge}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}

                {/* Activity collapsible */}
                <Collapsible open={activityOpen} onOpenChange={setActivityOpen} asChild>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton isActive={activityActive} tooltip="Activity">
                        <Activity />
                        <span>Activity</span>
                        <ChevronRight
                          className="ml-auto size-4 transition-transform duration-200"
                          style={{ transform: activityOpen ? "rotate(90deg)" : "rotate(0deg)" }}
                        />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {ACTIVITY_SUB.map(({ href, label, icon: Icon }) => (
                          <SidebarMenuSubItem key={href}>
                            <SidebarMenuSubButton asChild isActive={pathname.startsWith(href)}>
                              <Link to={href}>
                                <Icon />
                                <span>{label}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Bottom nav */}
          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel>More</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {BOTTOM_NAV.map(({ href, label, icon: Icon }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith(href)}
                      tooltip={label}
                    >
                      <Link to={href}>
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {/* Main content */}
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium">{currentLabel}</span>
          <div className="ml-auto md:hidden">
            <UserMenu />
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
