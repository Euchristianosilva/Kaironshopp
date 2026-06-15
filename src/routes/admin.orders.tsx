import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { listOrders, cancelOrder } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({ meta: [{ title: "Pedidos — Admin" }] }),
  component: Page,
});

const brl = (v: number) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Page() {
  const [status, setStatus] = useState("");
  const fn = useServerFn(listOrders);
  const cancel = useServerFn(cancelOrder);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-orders", status], queryFn: () => fn({ data: { status: status || undefined } }) });

  const handleCancel = async (id: string) => {
    if (!confirm("Cancelar este pedido?")) return;
    try { await cancel({ data: { orderId: id } }); toast.success("Pedido cancelado"); qc.invalidateQueries({ queryKey: ["admin-orders"] }); }
    catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  return (
    <AdminShell title="Pedidos" description="Listar, filtrar e cancelar pedidos.">
      <div className="flex flex-wrap gap-2 mb-4">
        {["", "pending", "paid", "canceled"].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`px-3 h-9 rounded-md text-sm border ${status === s ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{s || "Todos"}</button>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="text-left p-3">ID</th><th className="text-left p-3">Status</th><th className="text-left p-3">Pgto</th><th className="text-left p-3">Entrega</th><th className="text-left p-3">Total</th><th className="text-left p-3">Frete</th><th className="text-left p-3">Data</th><th className="p-3"></th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">Carregando…</td></tr>}
            {data?.map((o: any) => (
              <tr key={o.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                <td className="p-3 text-xs">{o.status}</td>
                <td className="p-3 text-xs">{o.payment_status}</td>
                <td className="p-3 text-xs">{o.fulfillment_status}</td>
                <td className="p-3">{brl(o.total)}</td>
                <td className="p-3 text-xs">{o.shipping_cents ? brl(o.shipping_cents / 100) : "—"}</td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="p-3 text-right">{o.status !== "canceled" && <button onClick={() => handleCancel(o.id)} className="text-xs px-2 h-8 rounded-md border border-destructive/40 text-destructive">Cancelar</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
