import { useState } from "react";
import { toast } from "sonner";
import { downloadStatementPdf, emailStatement } from "@/lib/api/statements";

export function useStatementExport() {
  const [downloading, setDownloading] = useState(false);
  const [emailing, setEmailing] = useState(false);

  async function downloadPdf(from: string, to: string) {
    setDownloading(true);
    try {
      await downloadStatementPdf(from, to);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "PDF generation failed");
    } finally {
      setDownloading(false);
    }
  }

  async function emailPdf(from: string, to: string) {
    setEmailing(true);
    try {
      const email = await emailStatement(from, to);
      toast.success(`Statement sent to ${email}`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Email sending failed");
    } finally {
      setEmailing(false);
    }
  }

  return { downloading, emailing, downloadPdf, emailPdf };
}
