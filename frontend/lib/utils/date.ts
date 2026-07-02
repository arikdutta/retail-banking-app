export function fmtDate(iso: string): string {
  return iso.slice(0, 10);
}

export function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
