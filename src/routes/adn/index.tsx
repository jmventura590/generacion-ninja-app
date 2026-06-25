import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/adn/")({
  component: AdnLanding,
});

function AdnLanding() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate({ to: "/adn/auth" });
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      const isCoach = (roles ?? []).some((r) => r.role === "coach");
      navigate({ to: isCoach ? "/adn/coach" : "/adn/student" });
      setChecking(false);
    })();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="adn-card p-8 text-center">
        <div className="adn-fluor text-2xl font-black tracking-widest">GENERACIÓN ADN</div>
        <p className="mt-3 text-sm text-white/70">{checking ? "Cargando..." : "Redirigiendo..."}</p>
      </div>
    </div>
  );
}
