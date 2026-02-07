import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { BugReportsPermission } from "@/domain/dashboard/permissions";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ context }) => {
    if (!BugReportsPermission.View.hasPermission(context.user!.role)) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: () => {
    const { user } = Route.useRouteContext();
    return (
      <SidebarProvider>
        <AdminSidebar user={user!} />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span className="text-sm font-medium text-muted-foreground">Admin</span>
          </header>
          <div className="flex flex-1 flex-col p-6">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  },
});
