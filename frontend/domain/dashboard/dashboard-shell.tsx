import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, Bug, ShieldCheck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { UserMenu } from "@/components/user-menu";
import type { Role } from "@/lib/roles";
import type { PermissionDef } from "@/lib/permission";
import { UserPermission, BugReportsPermission } from "@/domain/dashboard/permissions";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: PermissionDef;
};

const ALL_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",             label: "Overview",    icon: LayoutDashboard },
  { href: "/dashboard/users",       label: "Users",       icon: Users,       permission: UserPermission.ListAll },
  { href: "/dashboard/bugreports",  label: "Bug Reports", icon: Bug,         permission: BugReportsPermission.View },
  { href: "/dashboard/access-demo", label: "Access Demo", icon: ShieldCheck },
];


type Props = {
  user: { email: string; role: Role };
  children: React.ReactNode;
};

export function DashboardShell({ user, children }: Props) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const visibleNavItems = ALL_NAV_ITEMS.filter(({ permission }) =>
    !permission || permission.hasPermission(user.role)
  );

  const currentLabel =
    visibleNavItems.find((item) =>
      item.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname.startsWith(item.href)
    )?.label ?? "Dashboard";

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link to="/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <LayoutDashboard className="size-4" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">Auth App</span>
                    <span className="text-xs text-muted-foreground">Dashboard</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleNavItems.map(({ href, label, icon: Icon }) => {
                  const active =
                    href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(href);
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton asChild isActive={active} tooltip={label}>
                        <Link to={href}>
                          <Icon />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm font-medium">{currentLabel}</span>
          <div className="ml-auto md:hidden">
            <UserMenu />
          </div>
        </header>
        <div className="flex flex-1 flex-col p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
