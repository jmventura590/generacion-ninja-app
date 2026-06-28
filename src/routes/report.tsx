import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/report")({
  beforeLoad: () => {
    throw redirect({ to: "/adn/auth" });
  },
  component: () => null,
});
