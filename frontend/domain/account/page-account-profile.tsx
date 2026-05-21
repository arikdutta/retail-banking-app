import { Mail, Shield } from "lucide-react";

type Props = {
  user: { email: string; role: string };
};

export default function AccountProfilePage({ user }: Props) {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your account information.
        </p>
      </div>

      <div className="rounded-xl border bg-card divide-y divide-border">
        <div className="flex items-center gap-3 px-5 py-4">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-medium truncate">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-4">
          <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Role</p>
            <p className="text-sm font-medium">{user.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
