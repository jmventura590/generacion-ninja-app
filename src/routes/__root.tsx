import { createRootRouteWithContext, HeadContent, Outlet, Scripts, useRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-7xl font-black text-neon">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">Este obstáculo no existe.</p>
        <a href="/adn" className="mt-6 inline-block rounded-md bg-gradient-neon px-4 py-2 text-sm font-bold text-primary-foreground">
          Volver al inicio
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-bold">Algo salió mal</h1>
        <p className="mt-2 text-sm text-muted-foreground">Probá de nuevo en un momento.</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-md bg-gradient-neon px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "ADN Generación Ninja" },
      { name: "description", content: "Seguimiento de asistencia gamificado para el gimnasio de obstáculos ADN Generación Ninja." },
      { name: "theme-color", content: "#121212" },
      { property: "og:title", content: "ADN Generación Ninja" },
      { property: "og:description", content: "Seguimiento de asistencia gamificado para el gimnasio de obstáculos ADN Generación Ninja." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "ADN Generación Ninja" },
      { name: "twitter:description", content: "Seguimiento de asistencia gamificado para el gimnasio de obstáculos ADN Generación Ninja." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/2e5b46c7-3cb2-44d9-8bb2-579c8d9b24b9" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/2e5b46c7-3cb2-44d9-8bb2-579c8d9b24b9" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Rajdhani:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
