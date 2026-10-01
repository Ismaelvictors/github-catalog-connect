import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — DZAMP" }],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="admin-shell">
      <Outlet />
    </div>
  );
}
