import { createFileRoute } from "@tanstack/react-router";
import AccountProfilePage from "@/domain/account/page-account-profile";

export const Route = createFileRoute("/account/profile")({
  component: () => {
    const { user } = Route.useRouteContext();
    return <AccountProfilePage user={user!} />;
  },
});
