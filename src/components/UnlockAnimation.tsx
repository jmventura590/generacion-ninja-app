import { useEffect, useMemo } from "react";
import { playDing } from "@/lib/ding";

export type UnlockVariant = "obstacle" | "avatar" | "scenario" | "belt";

type Props = {
  variant: UnlockVariant;
  title: string;
  subtitle?: string;
  image: string;
  onClose: () => void;
};

const COLORS = ["#39FF14", "#BF00FF", "#FFFFFF", "#A5FF7A"];

/**
 * Animación diferenciada por tipo de desbloqueo:
 * - obstacle: confeti neón + imagen se ilumina de gris a color con destello final
 * - avatar: entra corriendo desde la derecha con destellos
 * - scenario: barrido de color de izquierda a derecha (cortina)
 * - belt: destello dorado + vibración corta del dispositivo
 */
export function UnlockAnimation({ variant, title, subtitle, image, onClose }: Props) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.4,
        rotate: Math.random() * 360,
        size: 6 + Math.random() * 8,
        color: variant === "belt" ? ["#FFD700", "#FFC300", "#FFEB99", "#FFFFFF"][i % 4] : COLORS[i % COLORS.length],
        shape: i % 3,
      })),
    [variant, title],
  );

  useEffect(() => {
    playDing();
    if (variant === "belt" && typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate?.(200); } catch { /* ignora */ }
    }
  }, [variant, title]);

  const showConfetti = variant === "obstacle" || variant === "belt";

  const label =
    variant === "obstacle" ? "¡Obstáculo desbloqueado!" :
    variant === "avatar"   ? "¡Nuevo personaje!" :
    variant === "scenario" ? "¡Nuevo escenario!" :
                             "¡Nueva pulsera!";

  const accentColor = variant === "belt" ? "#FFD700" : "#39FF14";

  return (
    <div
      role="dialog"
      aria-live="assertive"
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden bg-[#0B0F17]/95 px-6 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      {/* Confeti (obstáculo + pulsera con paleta dorada) */}
      {showConfetti && (
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
      )}

      {/* Destellos neón alrededor del avatar cuando "entra corriendo" */}
      {variant === "avatar" && (
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="absolute block rounded-full"
              style={{
                left: `${45 + Math.random() * 10}%`,
                top: `${35 + Math.random() * 30}%`,
                width: 6 + Math.random() * 8,
                height: 6 + Math.random() * 8,
                background: "#39FF14",
                boxShadow: "0 0 14px #39FF14",
                opacity: 0,
                animation: `sparkle 1.4s ${0.3 + Math.random() * 0.8}s ease-out infinite`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center text-center">
        <p className="text-base font-semibold tracking-wide" style={{ color: accentColor }}>
          {label}
        </p>

        {/* Contenedor de la imagen con animación específica */}
        <div
          className="relative mt-4 h-64 w-64 overflow-hidden rounded-2xl border"
          style={{ borderColor: `${accentColor}55`, boxShadow: `0 0 30px ${accentColor}55` }}
        >
          {/* OBSTÁCULO: gris → color + destello final */}
          {variant === "obstacle" && (
            <>
              <img
                src={image}
                alt={title}
                className="absolute inset-0 h-full w-full object-contain"
                style={{
                  animation: "obstacleReveal 1.6s ease-out forwards",
                }}
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: "radial-gradient(circle, rgba(57,255,20,0.6) 0%, transparent 70%)",
                  opacity: 0,
                  animation: "flashBurst 0.8s 1.5s ease-out forwards",
                }}
              />
            </>
          )}

          {/* AVATAR: entra corriendo desde la derecha */}
          {variant === "avatar" && (
            <img
              src={image}
              alt={title}
              className="absolute inset-0 h-full w-full object-contain"
              style={{ animation: "runInFromRight 1.2s cubic-bezier(.2,.7,.3,1) forwards" }}
            />
          )}

          {/* ESCENARIO: barrido cortina izq → der */}
          {variant === "scenario" && (
            <>
              <img
                src={image}
                alt={title}
                className="absolute inset-0 h-full w-full object-cover grayscale"
                style={{ animation: "scenarioColor 1.6s ease-out forwards" }}
              />
              <div
                className="pointer-events-none absolute inset-y-0 left-0 w-full"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(57,255,20,0.35) 45%, rgba(57,255,20,0.9) 50%, rgba(57,255,20,0.35) 55%, transparent 100%)",
                  animation: "curtainWipe 1.6s ease-out forwards",
                }}
              />
            </>
          )}

          {/* PULSERA: destello dorado */}
          {variant === "belt" && (
            <>
              <img
                src={image}
                alt={title}
                className="absolute inset-0 h-full w-full object-contain"
                style={{ animation: "beltPulse 1.6s ease-out forwards" }}
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: "radial-gradient(circle, rgba(255,215,0,0.75) 0%, transparent 70%)",
                  opacity: 0,
                  animation: "flashBurst 1.2s 0.2s ease-out forwards",
                }}
              />
            </>
          )}
        </div>

        <h2
          className="mt-4 font-display text-2xl font-black text-foreground"
          style={{ textShadow: `0 0 18px ${accentColor}88` }}
        >
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-foreground/70">{subtitle}</p>}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="mt-6 rounded-2xl px-8 py-3 font-display text-base font-bold transition active:scale-95"
          style={{
            background: accentColor,
            color: "#0B0F17",
            boxShadow: `0 0 24px ${accentColor}88`,
          }}
        >
          ¡Genial!
        </button>
      </div>

      {/* Keyframes locales */}
      <style>{`
        @keyframes obstacleReveal {
          0%   { filter: grayscale(1) brightness(.6); }
          70%  { filter: grayscale(0) brightness(1); }
          85%  { filter: grayscale(0) brightness(1.6) drop-shadow(0 0 20px #39FF14); }
          100% { filter: grayscale(0) brightness(1); }
        }
        @keyframes flashBurst {
          0%   { opacity: 0; transform: scale(.6); }
          40%  { opacity: 1; transform: scale(1.15); }
          100% { opacity: 0; transform: scale(1.35); }
        }
        @keyframes runInFromRight {
          0%   { transform: translateX(120%) rotate(6deg); opacity: 0; }
          60%  { transform: translateX(-6%) rotate(-3deg); opacity: 1; }
          80%  { transform: translateX(3%) rotate(1deg); }
          100% { transform: translateX(0) rotate(0); }
        }
        @keyframes sparkle {
          0%   { opacity: 0; transform: scale(.4); }
          50%  { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(.4); }
        }
        @keyframes scenarioColor {
          0%   { filter: grayscale(1) brightness(.5); }
          100% { filter: grayscale(0) brightness(1); }
        }
        @keyframes curtainWipe {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes beltPulse {
          0%   { transform: scale(.85); filter: brightness(.8); }
          50%  { transform: scale(1.05); filter: brightness(1.8) drop-shadow(0 0 24px #FFD700); }
          100% { transform: scale(1); filter: brightness(1); }
        }
      `}</style>
    </div>
  );
}
