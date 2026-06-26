import { Link, Outlet } from "@tanstack/react-router";
import { Footprints, BarChart3 } from "lucide-react";

export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-neon shadow-neon animate-pulse-neon" />
            <h1 className="text-sm font-bold tracking-[0.28em] text-foreground/90">
              ADN <span className="text-neon">GENERACIÓN</span> NINJA
            </h1>
          </div>
        </header>

        <main className="flex-1 pb-28">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-4 pb-4">
          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-surface/95 p-2 shadow-card backdrop-blur-xl">
            <NavItem to="/" label="Mi Camino Ninja" Icon={Footprints} />
            <NavItem to="/report" label="Reporte Mensual" Icon={BarChart3} />
          </div>
        </nav>
      </div>
    </div>
  );
}

function NavItem({
  to,
  label,
  Icon,
}: {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: true }}
      className="group flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-all hover:text-foreground data-[status=active]:bg-gradient-neon data-[status=active]:text-primary-foreground data-[status=active]:shadow-neon"
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}
