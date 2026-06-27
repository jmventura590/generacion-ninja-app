import { useEffect, useMemo } from "react";
import { playDing } from "@/lib/ding";

type Props = {
  obstacleName: string | null;
  onClose: () => void;
};

const COLORS = ["#39FF14", "#BF00FF", "#FFFFFF", "#A5FF7A"];

export function UnlockCelebration({ obstacleName, onClose }: Props) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.4,
        rotate: Math.random() * 360,
        size: 6 + Math.random() * 8,
        color: COLORS[i % COLORS.length],
        shape: i % 3,
      })),
    [obstacleName],
  );

  useEffect(() => {
    if (!obstacleName) return;
    playDing();
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [obstacleName, onClose]);

  if (!obstacleName) return null;

  return (
    <div
      role="dialog"
      aria-live="assertive"
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-[#0B0F17]/95 px-6 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      {/* Confeti */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {pieces.map((p) => (
          <span
            key={p.id}
            className="absolute -top-4 block"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 0.4,
              background: p.color,
              borderRadius: p.shape === 0 ? "9999px" : p.shape === 1 ? "2px" : "0",
              transform: `rotate(${p.rotate}deg)`,
              boxShadow: `0 0 8px ${p.color}`,
              animation: `confetti-fall ${p.duration}s ${p.delay}s cubic-bezier(.2,.6,.4,1) forwards`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <p className="text-base font-semibold tracking-wide text-[#39FF14]">
          ¡Nueva medalla!
        </p>
        <h2 className="mt-2 font-display text-3xl font-black text-foreground drop-shadow-[0_0_18px_rgba(57,255,20,0.55)]">
          {obstacleName}
        </h2>
        <p className="mt-3 max-w-xs text-base text-foreground/80">
          Ya podés reclamar tu Pin físico en la recepción.
        </p>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="mt-7 rounded-2xl bg-[#39FF14] px-8 py-3 font-display text-base font-bold text-[#0B0F17] shadow-[0_0_24px_rgba(57,255,20,0.55)] transition active:scale-95"
        >
          ¡Genial!
        </button>
      </div>
    </div>
  );
}
