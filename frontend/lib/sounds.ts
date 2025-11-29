// iOS-style double-chime via Web Audio API — no dependencies
export function playInvoiceCreated(): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    // C6 → E6, 80ms apart
    ([1046.5, 1318.51] as const).forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + i * 0.08;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      osc.start(t);
      osc.stop(t + 0.45);
    });
  } catch {
    // AudioContext blocked (no user gesture yet) — fail silently
  }
}
