import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Lock, Check, X } from "lucide-react";
import pasamanos from "@/assets/obstacles/pasamanos.png";
import arana from "@/assets/obstacles/arana.png";
import muro from "@/assets/obstacles/muro.png";
import palestra from "@/assets/obstacles/palestra.png";
import tronco from "@/assets/obstacles/tronco.png";
import escalera from "@/assets/obstacles/escalera.png";
import escalones from "@/assets/obstacles/escalones.png";
import pegboard from "@/assets/obstacles/pegboard.png";

import pelotas from "@/assets/obstacles/pelotas.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mi Camino Ninja — ADN Generación Ninja" },
      { name: "description", content: "Progreso de asistencia del Ninja Benjamín, obstáculos desbloqueados y próximas metas." },
      { property: "og:title", content: "Mi Camino Ninja — ADN Generación Ninja" },
      { property: "og:description", content: "Seguí la asistencia, desbloqueá obstáculos y reclamá tus pines." },
    ],
  }),
  component: CaminoNinja,
});

type Obstacle = {
  name: string;
  image: string;
  unlocked: boolean;
  times?: number;
};

const OBSTACLES: Obstacle[] = [
  { name: "Pasamanos", image: pasamanos, unlocked: true, times: 10 },
  { name: "Salto de la Araña", image: arana, unlocked: true, times: 10 },
  { name: "Muro Curvado", image: muro, unlocked: true, times: 10 },
  { name: "Palestra", image: palestra, unlocked: true, times: 10 },
  { name: "Tronco Giratorio", image: tronco, unlocked: false },
  { name: "Escalera Invertida", image: escalera, unlocked: false },
  { name: "5 Escalones", image: escalones, unlocked: false },
  { name: "Pegboard", image: pegboard, unlocked: false },
  
  { name: "Pelotas Colgantes", image: pelotas, unlocked: false },
];

function CaminoNinja() {
  const [selected, setSelected] = useState<Obstacle | null>(null);
  const progress = 65;

  return (
    <div className="px-5 pt-5">
      {/* Perfil */}
      <section className="flex items-center gap-4">
        <div className="relative">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-neon p-[3px] shadow-neon">
            <div className="grid h-full w-full place-items-center rounded-full bg-surface text-2xl font-black text-neon">
              NB
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Ninja</p>
          <h2 className="truncate text-2xl font-black text-foreground">Ninja Benjamín</h2>
          <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.7_0.2_145/40%)] bg-[oklch(0.7_0.2_145/12%)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-neon">
            <span className="h-1.5 w-1.5 rounded-full bg-neon" />
            Muñequera Verde 🟢
          </div>
        </div>
      </section>

      {/* Progreso */}
      <section className="mt-7 rounded-2xl border border-border/70 bg-surface p-5 shadow-card">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-foreground">
            Progreso hacia <span className="text-electric">Muñequera Azul</span>
          </p>
          <p className="font-display text-lg font-black text-neon">{progress}%</p>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-[oklch(0.25_0.015_260)]">
          <div
            className="h-full rounded-full bg-gradient-neon shadow-neon animate-shimmer bg-[linear-gradient(90deg,oklch(0.88_0.27_145),oklch(0.72_0.22_200),oklch(0.88_0.27_145))]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-xs italic text-muted-foreground">
          (Faltan 7 asistencias para la próxima meta)
        </p>
      </section>

      {/* Medallas */}
      <section className="mt-7">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base font-bold uppercase tracking-wider text-foreground">
            Medallas de Obstáculos
          </h3>
          <span className="text-xs text-muted-foreground">
            {OBSTACLES.filter(o => o.unlocked).length} / {OBSTACLES.length}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {OBSTACLES.map((o) => (
            <ObstacleTile key={o.name} obstacle={o} onSelect={() => setSelected(o)} />
          ))}
        </div>
      </section>

      <ObstacleModal obstacle={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function ObstacleTile({ obstacle, onSelect }: { obstacle: Obstacle; onSelect: () => void }) {
  const { image, name, unlocked } = obstacle;
  return (
    <button
      onClick={onSelect}
      className={[
        "group relative flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center transition-all duration-200 active:scale-95",
        unlocked
          ? "border-[oklch(0.7_0.2_145/35%)] bg-surface shadow-card hover:-translate-y-0.5 hover:shadow-neon"
          : "border-border/60 bg-[oklch(0.19_0.01_260)] opacity-70 hover:opacity-90",
      ].join(" ")}
    >
      <img
        src={image}
        alt={name}
        loading="lazy"
        width={512}
        height={512}
        className={[
          "h-14 w-14 object-contain transition-transform group-hover:scale-110",
          unlocked
            ? "drop-shadow-[0_0_8px_oklch(0.88_0.27_145/55%)]"
            : "grayscale opacity-60",
        ].join(" ")}
      />
      <span
        className={[
          "line-clamp-2 text-[10.5px] font-semibold uppercase tracking-wide leading-tight",
          unlocked ? "text-foreground" : "text-muted-foreground",
        ].join(" ")}
      >
        {name}
      </span>
      <span
        className={[
          "absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-background",
          unlocked ? "bg-neon text-primary-foreground" : "bg-[oklch(0.3_0.01_260)] text-muted-foreground",
        ].join(" ")}
      >
        {unlocked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Lock className="h-3 w-3" strokeWidth={2.5} />}
      </span>
    </button>
  );
}

function ObstacleModal({ obstacle, onClose }: { obstacle: Obstacle | null; onClose: () => void }) {
  if (!obstacle) return null;
  const { image, name, unlocked, times } = obstacle;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-8 pt-20 backdrop-blur-sm animate-fade-in sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-card animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div
            className={[
              "grid h-28 w-28 place-items-center rounded-3xl p-3",
              unlocked ? "bg-gradient-neon shadow-neon" : "bg-[oklch(0.25_0.012_260)]",
            ].join(" ")}
          >
            <img
              src={image}
              alt={name}
              width={512}
              height={512}
              className={unlocked ? "h-full w-full object-contain" : "h-full w-full object-contain grayscale opacity-60"}
            />
          </div>

          <h3 className="mt-4 font-display text-xl font-black uppercase tracking-wide">
            {name}
          </h3>

          {unlocked ? (
            <>
              <p className="mt-4 text-sm leading-relaxed text-foreground/90">
                ¡Practicado <span className="font-bold text-neon">{times} veces!</span> Ya podés
                reclamar tu Pin físico en la recepción.
              </p>
              <button
                onClick={onClose}
                className="mt-6 w-full rounded-xl bg-gradient-neon py-3 font-display text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-neon transition active:scale-[0.98]"
              >
                Reclamar Pin
              </button>
            </>
          ) : (
            <>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                ¡Seguí viniendo a las clases para desbloquear este obstáculo!
              </p>
              <button
                onClick={onClose}
                className="mt-6 w-full rounded-xl border border-border bg-[oklch(0.25_0.012_260)] py-3 font-display text-sm font-bold uppercase tracking-widest text-foreground transition hover:bg-[oklch(0.28_0.012_260)] active:scale-[0.98]"
              >
                Entendido
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
