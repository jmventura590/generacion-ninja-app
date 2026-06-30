import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";

import cake from "@/assets/birthday/cake.png";
import gift from "@/assets/birthday/gift.png";
import balloons from "@/assets/birthday/balloons.png";
import hat from "@/assets/birthday/hat.png";
import popper from "@/assets/birthday/popper.png";
import trophy from "@/assets/birthday/trophy.png";
import star from "@/assets/birthday/star.png";
import rocket from "@/assets/birthday/rocket.png";
import medal from "@/assets/birthday/medal.png";

export const GIFT_SCENES: { img: string; label: string }[] = [
  { img: cake,     label: "Torta neón" },
  { img: gift,     label: "Regalo sorpresa" },
  { img: balloons, label: "Globos voladores" },
  { img: hat,      label: "Gorro de fiesta" },
  { img: popper,   label: "Cañón de confeti" },
  { img: trophy,   label: "Trofeo dorado" },
  { img: rocket,   label: "Cohete ninja" },
  { img: medal,    label: "Medalla de honor" },
];

// Fallback si la DB todavía no respondió.
export const DEFAULT_MESSAGES: string[] = [
  "¡Feliz cumple, ninja! Hoy el gimnasio entero festeja con vos.",
  "Un año más fuerte, más rápido, más vos. ¡Feliz cumpleaños!",
  "Hoy no hay obstáculo que se te resista. ¡Feliz cumple, campeón!",
  "Otro año de garra y constancia. ¡Que lo festejes a lo grande!",
  "Hoy es tu día, ninja. Disfrutalo a pleno, te lo ganaste.",
  "Un año más cerca de tu próxima muñequera. ¡Feliz cumpleaños!",
  "Que este nuevo año venga con más saltos, más fuerza y más logros.",
  "¡Feliz cumple! Hoy el circuito de obstáculos te aplaude.",
  "Cada vez más fuerte, cada vez más ninja. ¡Feliz cumpleaños!",
  "Hoy festejamos no solo tu cumple, también tu esfuerzo de todo el año.",
  "¡Feliz cumpleaños! Que este año esté lleno de nuevos desafíos.",
  "Un año más grande, un ninja más fuerte. ¡Que lo disfrutes!",
  "Hoy te toca a vos brillar. ¡Feliz cumpleaños, campeón!",
  "Gracias por tu constancia este año. ¡Feliz cumple, ninja!",
  "Que la energía de hoy te acompañe en cada entrenamiento del año que empieza.",
  "¡Feliz cumpleaños! Seguí entrenando con esa garra que te caracteriza.",
  "Hoy el gimnasio se viste de fiesta por vos. ¡Feliz cumple!",
  "Un año más de aventuras, obstáculos y logros. ¡Felicidades, ninja!",
  "Que cumplas muchos años más, y todos entrenando con esta misma energía.",
  "¡Feliz cumpleaños! Hoy celebramos lo lejos que llegaste, y lo lejos que vas a llegar.",
];

void star; // (no se usa actualmente como escena, pero queda disponible)

function pickIndex(seed: string, mod: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % mod;
}

export function BirthdayCelebration({
  studentName,
  seed,
  onClose,
}: {
  studentName: string;
  seed: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<string[]>(DEFAULT_MESSAGES);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await (supabase.from as any)("app_settings")
          .select("value").eq("key", "birthday_messages").maybeSingle();
        const arr = Array.isArray(data?.value) ? (data!.value as string[]).filter((m) => typeof m === "string" && m.trim()) : null;
        if (arr && arr.length) setMessages(arr);
      } catch { /* fallback */ }
    })();
  }, []);

  const scene = useMemo(() => GIFT_SCENES[pickIndex(seed + ":scene", GIFT_SCENES.length)], [seed]);
  const message = useMemo(() => messages[pickIndex(seed + ":msg", messages.length)], [seed, messages]);

  useEffect(() => {
    const colors = ["#39ff14", "#df00ff", "#ffffff", "#00ffae", "#ffd700"];
    const end = Date.now() + 3500;
    const tick = () => {
      confetti({ particleCount: 6, angle: 60,  spread: 75, startVelocity: 60, origin: { x: 0,   y: 0.85 }, colors });
      confetti({ particleCount: 6, angle: 120, spread: 75, startVelocity: 60, origin: { x: 1,   y: 0.85 }, colors });
      confetti({ particleCount: 4, spread: 360, startVelocity: 30, origin: { x: 0.5, y: 0.35 }, colors, scalar: 1 });
      if (Date.now() < end) requestAnimationFrame(tick);
    };
    tick();
  }, [seed]);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-6 animate-fade-in"
      style={{
        background:
          "radial-gradient(circle at 50% 30%, rgba(223,0,255,0.35) 0%, rgba(0,0,0,0.92) 60%, rgba(0,0,0,0.98) 100%)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div className="text-[11px] tracking-[0.5em] adn-fluor">¡FELIZ CUMPLE!</div>
      <h2
        className="mt-2 text-3xl sm:text-4xl font-black text-center"
        style={{ fontFamily: "Orbitron, sans-serif", textShadow: "0 0 18px #39ff14, 0 0 32px #df00ff" }}
      >
        {studentName.toUpperCase()}
      </h2>

      <div className="relative mt-6 w-[260px] h-[260px] flex items-center justify-center">
        <img
          src={scene.img}
          alt={scene.label}
          width={1024}
          height={1024}
          loading="eager"
          draggable={false}
          className="relative w-full h-full object-contain drop-shadow-[0_0_28px_#39ff14aa] animate-bounce"
        />
      </div>

      <p className="mt-6 text-sm sm:text-base text-white/85 text-center max-w-sm leading-relaxed">
        {message}
      </p>
      <div className="mt-1 text-[10px] tracking-[0.3em] text-white/40">{scene.label.toUpperCase()}</div>

      <button onClick={onClose} className="adn-btn-primary mt-7 px-10 py-3 text-sm">
        ¡GRACIAS!
      </button>
    </div>
  );
}
