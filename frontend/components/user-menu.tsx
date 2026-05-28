import { useNavigate, Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { emailInitials } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMe } from "@/hooks/data/use-me";

const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3001";

export function UserMenu() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me, isLoading } = useMe();

  if (isLoading) return null;

  if (!me?.email) {
    return (
      <Link
        to="/login"
        className="hidden md:inline-flex rounded-md px-3 py-1.5 text-sm font-medium border border-border hover:bg-muted/60 transition-colors"
      >
        Sign in
      </Link>
    );
  }

  async function handleLogout() {
    await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
    queryClient.setQueryData(["me"], null);
    navigate({ to: "/login" });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Menu utilisateur"
        >
          <Avatar className="size-7 cursor-pointer">
            <AvatarFallback className="text-[11px]">
              {emailInitials(me.email)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-xs text-muted-foreground">{me.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
