import { useState } from "react";
import { Smartphone, Percent, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function PromoBanner() {
  const [open, setOpen] = useState(false);
  const [activated, setActivated] = useState(false);

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white">
        <div className="relative z-10">
          <p className="text-sm font-medium opacity-80">Special Offer</p>
          <h2 className="mt-1 text-2xl font-bold leading-tight">Unlimited Cashback</h2>
          <p className="mt-1 text-sm opacity-70">
            Instant 2% back on all your spendings on your account
          </p>
          <Button
            size="sm"
            className="mt-4 bg-white text-blue-600 hover:bg-blue-50 font-semibold"
            onClick={() => setOpen(true)}
          >
            {activated ? "Activated ✓" : "Upgrade Now →"}
          </Button>
        </div>
        <div className="pointer-events-none absolute -right-4 top-1/2 -translate-y-1/2 opacity-10">
          <div className="h-40 w-40 rounded-full border-[16px] border-white" />
        </div>
        <div className="pointer-events-none absolute right-12 top-4 opacity-10">
          <Smartphone className="h-20 w-20" />
        </div>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          {activated ? (
            <>
              <AlertDialogHeader>
                <AlertDialogMedia className="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
                  <CheckCircle2 />
                </AlertDialogMedia>
                <AlertDialogTitle>Cashback Activated!</AlertDialogTitle>
                <AlertDialogDescription>
                  You're all set. 2% cashback will be applied to all future purchases and credited to your account monthly.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setOpen(false)}
                >
                  Done
                </Button>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogMedia className="bg-blue-50 text-blue-600 dark:bg-blue-950/30">
                  <Percent />
                </AlertDialogMedia>
                <AlertDialogTitle>Activate 2% Cashback</AlertDialogTitle>
                <AlertDialogDescription>
                  Earn 2% back on every purchase, automatically. No minimum spend, no exclusions — credited monthly to your account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <ul className="space-y-2 text-sm text-muted-foreground -mt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  No minimum spend required
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  Applies to all spending categories
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  Cashback credited automatically each month
                </li>
              </ul>
              <AlertDialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => setActivated(true)}
                >
                  Confirm & Activate
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
