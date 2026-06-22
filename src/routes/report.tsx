import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Reporte Mensual — ADN Ninja Warrior" },
      { name: "description", content: "Reporte de asistencia y disciplina para los padres." },
      { property: "og:title", content: "Reporte Mensual — ADN Ninja Warrior" },
      { property: "og:description", content: "Reporte de asistencia y disciplina para los padres." },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-3xl bg-surface shadow-electric">
        <BarChart3 className="h-10 w-10 text-electric" />
      </div>
      <h2 className="mt-5 font-display text-2xl font-black uppercase tracking-wide">Reporte Mensual</h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        Resumen de asistencia y disciplina para los padres. Próximamente.
      </p>
    </div>
  );
}
