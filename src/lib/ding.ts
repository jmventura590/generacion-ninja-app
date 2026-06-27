// Reproduce un "ding" corto (<1s) usando Web Audio API, sin archivos externos.
let ctx: AudioContext | null = null;

export function playDing() {
  if (typeof window === "undefined") return;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    master.connect(ctx.destination);

    // Dos tonos rápidos (E6 → A6) para un "ding" tipo logro
    [
      { f: 1318.5, t: 0 },
      { f: 1760, t: 0.09 },
    ].forEach(({ f, t }) => {
      const osc = ctx!.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(f, now + t);
      osc.connect(master);
      osc.start(now + t);
      osc.stop(now + t + 0.55);
    });
  } catch {
    // silencio: el sonido es opcional
  }
}
