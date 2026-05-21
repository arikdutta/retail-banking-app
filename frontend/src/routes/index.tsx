import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useMe } from "@/hooks/use-me";

export const Route = createFileRoute("/")({
  component: Page,
});

function Page() {
  const { data: me } = useMe();
  const showDashboard = me?.role != null;

  return (
    <main className="mx-auto max-w-2xl px-4 pt-16 pb-24 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Welcome</h1>
        {me && (
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as <span className="font-medium">{me.email}</span>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <Link
          to="/account/profile"
          className="rounded-xl border bg-card p-5 hover:bg-muted/40 transition-colors"
        >
          <p className="font-semibold">My Account</p>
          <p className="text-sm text-muted-foreground mt-1">Manage your profile</p>
        </Link>

        {showDashboard && (
          <Link
            to="/dashboard"
            className="rounded-xl border bg-card p-5 hover:bg-muted/40 transition-colors"
          >
            <p className="font-semibold">Dashboard</p>
            <p className="text-sm text-muted-foreground mt-1">Stats and users</p>
          </Link>
        )}
      </div>
    </main>
  );
}
