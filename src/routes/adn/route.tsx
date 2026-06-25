import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/adn")({
  ssr: false,
  component: () => (
    <div className="adn-root">
      <Outlet />
    </div>
  ),
});
