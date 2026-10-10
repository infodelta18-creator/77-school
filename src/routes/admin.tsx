import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin")({
  component: AdminParentRoute,
});

function AdminParentRoute() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  if (currentPath === "/admin/login" || currentPath === "/admin/login/") {
    return <Outlet />;
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
