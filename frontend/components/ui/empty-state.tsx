import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  className?: string;
}

export function EmptyState({ icon: Icon, message, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-5 text-center", className)}>
      <Icon className="h-5 w-5 text-muted-foreground/40" />
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
