import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/yangiliklar")({
  component: YangiliklarLayout,
});

function YangiliklarLayout() {
  return <Outlet />;
}
