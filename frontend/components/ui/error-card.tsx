import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorCardProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorCard({ message = "Failed to load.", onRetry }: ErrorCardProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-5 text-center">
      <AlertCircle className="h-5 w-5 text-destructive/70" />
      <p className="text-xs text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="xs" onClick={onRetry} className="gap-1.5 mt-0.5">
          <RefreshCw className="h-3 w-3" />
          Retry
        </Button>
      )}
    </div>
  );
}
