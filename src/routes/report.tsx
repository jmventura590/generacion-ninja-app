import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Monthly Report — ADN Ninja Warrior" },
      { name: "description", content: "Attendance and discipline report for parents." },
      { property: "og:title", content: "Monthly Report — ADN Ninja Warrior" },
      { property: "og:description", content: "Attendance and discipline report for parents." },
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
      <h2 className="mt-5 font-display text-2xl font-black uppercase tracking-wide">Monthly Report</h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        Parents' attendance & discipline summary. Coming up next.
      </p>
    </div>
  );
}
