import { createFileRoute } from "@tanstack/react-router";
import { AdminSellersPage } from "@/routes/admin.sellers";

export const Route = createFileRoute("/admin/vendors")({
  head: () => ({ meta: [{ title: "Vendedores — Admin" }] }),
  component: AdminSellersPage,
});