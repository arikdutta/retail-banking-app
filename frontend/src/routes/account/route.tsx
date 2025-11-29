import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AccountShell } from "@/domain/account/account-shell";

export const Route = createFileRoute("/account")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/account" || location.pathname === "/account/") {
      throw redirect({ to: "/account/profile" });
    }
  },
  component: () => {
    const { user } = Route.useRouteContext();
    return (
      <AccountShell user={user!}>
        <Outlet />
      </AccountShell>
    );
  },
});
