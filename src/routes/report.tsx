import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Calendar, Clock, Sparkles } from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Reporte Mensual — ADN Ninja Warrior" },
      { name: "description", content: "Reporte de asistencia y desarrollo físico estimulado." },
      { property: "og:title", content: "Reporte Mensual — ADN Ninja Warrior" },
      { property: "og:description", content: "Resumen mensual del compromiso y capacidades físicas de tu hijo." },
    ],
  }),
  component: ReportPage,
});

type MonthData = {
  attended: number;
  total: number;
  minutes: number;
  radar: { skill: string; value: number }[];
};

const SKILLS = ["Fuerza", "Salto", "Agarre", "Equilibrio", "Coordinación", "Resistencia", "Velocidad"] as const;

const MONTHLY_DATA: Record<string, MonthData> = {
  "Mayo 2026": {
    attended: 8,
    total: 8,
    minutes: 480,
    radar: [
      { skill: "Fuerza", value: 85 },
      { skill: "Salto", value: 78 },
      { skill: "Agarre", value: 90 },
      { skill: "Equilibrio", value: 82 },
      { skill: "Coordinación", value: 88 },
      { skill: "Resistencia", value: 80 },
      { skill: "Velocidad", value: 75 },
    ],
  },
  "Abril 2026": {
    attended: 6,
    total: 8,
    minutes: 360,
    radar: [
      { skill: "Fuerza", value: 70 },
      { skill: "Salto", value: 65 },
      { skill: "Agarre", value: 72 },
      { skill: "Equilibrio", value: 68 },
      { skill: "Coordinación", value: 74 },
      { skill: "Resistencia", value: 66 },
      { skill: "Velocidad", value: 62 },
    ],
  },
  "Marzo 2026": {
    attended: 5,
    total: 8,
    minutes: 300,
    radar: [
      { skill: "Fuerza", value: 55 },
      { skill: "Salto", value: 50 },
      { skill: "Agarre", value: 58 },
      { skill: "Equilibrio", value: 60 },
      { skill: "Coordinación", value: 62 },
      { skill: "Resistencia", value: 52 },
      { skill: "Velocidad", value: 48 },
    ],
  },
};

const MONTHS = Object.keys(MONTHLY_DATA);

function ReportPage() {
  const [month, setMonth] = useState<string>(MONTHS[0]);
  const data = MONTHLY_DATA[month];
  const perfect = data.attended === data.total;

  return (
    <div className="px-5 pt-5 pb-6 space-y-5">
      {/* Month selector */}
      <div className="flex items-center gap-3">
        <Calendar className="h-5 w-5 text-electric shrink-0" />
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="h-11 flex-1 rounded-xl border-border/70 bg-surface text-sm font-semibold tracking-wide">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Commitment cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/70 bg-surface p-4 shadow-card">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3 w-3 text-neon" />
            Asistencia
          </div>
          <div className="mt-2 font-display text-2xl font-black text-foreground">
            {data.attended}<span className="text-muted-foreground/70">/{data.total}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">Clases asistidas</div>
          {perfect && (
            <div className="mt-2 inline-flex rounded-full bg-gradient-neon px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-neon">
              ¡Perfecta! 🌟
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border/70 bg-surface p-4 shadow-card">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <Clock className="h-3 w-3 text-electric" />
            Movimiento
          </div>
          <div className="mt-2 font-display text-2xl font-black text-electric">
            {data.minutes}<span className="ml-1 text-xs text-muted-foreground/70">min</span>
          </div>
          <div className="text-[11px] text-muted-foreground">de desarrollo motor</div>
        </div>
      </div>

      {/* Radar chart card */}
      <div className="rounded-2xl border border-border/70 bg-surface p-4 shadow-card">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
            Capacidades <span className="text-neon">Estimuladas</span>
          </h2>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            7 ejes
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Basado en obstáculos practicados este mes.
        </p>

        <div className="mt-2 h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data.radar} outerRadius="72%">
              <defs>
                <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="oklch(0.72 0.22 240)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="oklch(0.88 0.27 145)" stopOpacity={0.25} />
                </radialGradient>
              </defs>
              <PolarGrid stroke="oklch(0.4 0.02 260 / 60%)" />
              <PolarAngleAxis
                dataKey="skill"
                tick={{
                  fill: "oklch(0.85 0.02 260)",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
              <Radar
                key={month}
                dataKey="value"
                stroke="oklch(0.88 0.27 145)"
                strokeWidth={2}
                fill="url(#radarFill)"
                fillOpacity={1}
                isAnimationActive
                animationDuration={650}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 grid grid-cols-7 gap-1">
          {SKILLS.map((s, i) => (
            <div key={s} className="text-center">
              <div className="text-[10px] font-bold text-neon">{data.radar[i].value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl border border-border/60 bg-background/40 p-4">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Este reporte traduce la asistencia de tu hijo en capacidades físicas
          estimuladas. En <span className="font-semibold text-neon">ADN</span> promovemos
          la salud integral a través del juego y el desafío adaptado.
        </p>
      </div>
    </div>
  );
}
