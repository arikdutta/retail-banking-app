import { useState } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { FileDown, Loader2, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DateRangePicker, dateRangeSchema } from "@/components/date-range-picker";
import { useStatementExport } from "@/hooks/use-statement-export";

export function StatementsModal({ onClose }: { onClose: () => void }) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [dateError, setDateError] = useState<string | undefined>(undefined);
  const { downloading, emailing, downloadPdf, emailPdf } = useStatementExport();

  const parsedRange = dateRangeSchema.safeParse(dateRange);
  const canExport = parsedRange.success && !downloading && !emailing;

  function withValidRange(action: (from: string, to: string) => void) {
    if (!parsedRange.success) {
      const issue = parsedRange.error.issues[0];
      setDateError(issue?.message ?? "Invalid date range");
      return;
    }
    setDateError(undefined);
    action(format(parsedRange.data.from, "yyyy-MM-dd"), format(parsedRange.data.to, "yyyy-MM-dd"));
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>View Statements</DialogTitle>
          <DialogDescription>Pick a statement period to download or email as a PDF.</DialogDescription>
        </DialogHeader>
        <DateRangePicker
          value={dateRange}
          onChange={(r) => { setDateRange(r); setDateError(undefined); }}
          error={dateError}
          placeholder="Statement period"
          className="w-full"
        />
        <DialogFooter>
          <Button
            variant="outline"
            className="gap-1.5"
            disabled={!canExport}
            onClick={() => withValidRange(emailPdf)}
          >
            {emailing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
            Email statement
          </Button>
          <Button
            className="gap-1.5"
            disabled={!canExport}
            onClick={() => withValidRange(downloadPdf)}
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
