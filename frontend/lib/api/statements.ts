const API_URL = import.meta.env["VITE_API_URL"] ?? "http://localhost:3001";

export async function downloadStatementPdf(from: string, to: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/transactions/pdf?from=${from}&to=${to}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`PDF generation failed: ${res.status}`);
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `transactions-${from}-to-${to}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function emailStatement(from: string, to: string): Promise<string> {
  const res = await fetch(`${API_URL}/api/transactions/email-statement?from=${from}&to=${to}`, {
    method: "POST",
    credentials: "include",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Email sending failed: ${res.status}`);
  return body.email;
}
