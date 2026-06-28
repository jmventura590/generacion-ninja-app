import { useEffect, useMemo } from "react";
import confetti from "canvas-confetti";

import cake from "@/assets/birthday/cake.png";
import gift from "@/assets/birthday/gift.png";
import balloons from "@/assets/birthday/balloons.png";
import hat from "@/assets/birthday/hat.png";
import popper from "@/assets/birthday/popper.png";
import trophy from "@/assets/birthday/trophy.png";
import star from "@/assets/birthday/star.png";
import rocket from "@/assets/birthday/rocket.png";
import medal from "@/assets/birthday/medal.png";

const GIFT_SCENES: { img: string; label: string }[] = [
  { img: cake,     label: "Torta neón" },
  { img: gift,     label: "Regalo sorpresa" },
  { img: balloons, label: "Globos voladores" },
  { img: hat,      label: "Gorro de fiesta" },
  { img: popper,   label: "Cañón de confeti" },
  { img: trophy,   label: "Trofeo dorado" },
  { img: rocket,   label: "Cohete ninja" },
  { img: medal,    label: "Medalla de honor" },
];

// 20 mensajes en castellano (es-AR)
const MESSAGES: string[] = [
  "¡Feliz cumple, ninja! Que este año esté lleno de saltos, risas y pasamanos.",
  "Hoy el Gimnasio entero te festeja. ¡Que cumplas muchísimos más!",
  "Un año más fuerte, un año más rápido, un año más ninja. ¡Feliz cumple!",
  "Que tu energía de hoy te dure todo el año. ¡Feliz cumpleaños!",
  "El obstáculo de hoy es soplar las velitas. ¡Vos podés!",
  "Hoy no entrenás: hoy festejás. ¡Feliz cumple, crack!",
  "Que el año que arranca tenga la misma garra con la que entrenás. ¡Feliz cumple!",
  "Una palmada gigante para vos. ¡Feliz cumpleaños, ninja!",
  "Hoy te ganaste el medallero entero. ¡Feliz cumple!",
  "Que cada día de este año sea un PR. ¡Feliz cumpleaños!",
  "¡Sos parte de la familia ADN! Que tengas un día increíble.",
  "Hoy el cohete despega para vos. ¡Feliz cumple!",
  "Brillás como un neón. ¡Feliz cumpleaños, campeón/a!",
  "Que este año subas todos los niveles que te propongas. ¡Feliz cumple!",
  "Hoy vale doble: doble torta y doble festejo. ¡Feliz cumpleaños!",
  "Tus profes y tus compañeros te mandan el mejor de los abrazos.",
  "Que tu año sea como un pasamanos: agarrate fuerte y disfrutalo.",
  "Hoy soplás velitas, mañana soplás récords. ¡Feliz cumple!",
  "Que el ninja interior te acompañe siempre. ¡Feliz cumpleaños!",
  "¡Otro año más en el Gimnasio! Gracias por entrenar con nosotros. ¡Feliz cumple!",
];

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
  seed: string; // ej: `${studentId}-${year}` para que sea estable durante el día
  onClose: () => void;
}) {
  const scene = useMemo(() => GIFT_SCENES[pickIndex(seed + ":scene", GIFT_SCENES.length)], [seed]);
  const message = useMemo(() => MESSAGES[pickIndex(seed + ":msg", MESSAGES.length)], [seed]);

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

      <div className="relative mt-6 w-[240px] h-[240px]">
        <div
          className="absolute inset-0 rounded-full blur-3xl opacity-80 animate-pulse"
          style={{ background: "radial-gradient(circle, #39ff14 0%, #df00ff 60%, transparent 75%)" }}
        />
        <img
          src={scene.img}
          alt={scene.label}
          width={1024}
          height={1024}
          loading="eager"
          draggable={false}
          className="relative w-full h-full object-contain drop-shadow-[0_0_18px_#39ff14] animate-bounce"
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
