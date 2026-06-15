import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { listUsers, setUserBanned, deleteUser } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Usuários — Admin" }] }),
  component: Page,
});

function Page() {
  const [search, setSearch] = useState("");
  const fn = useServerFn(listUsers);
  const ban = useServerFn(setUserBanned);
  const del = useServerFn(deleteUser);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => fn({ data: { search } }),
  });

  const handleBan = async (id: string, banned: boolean) => {
    try { await ban({ data: { userId: id, banned } }); toast.success(banned ? "Usuário bloqueado" : "Usuário desbloqueado"); qc.invalidateQueries({ queryKey: ["admin-users"] }); }
    catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este usuário permanentemente?")) return;
    try { await del({ data: { userId: id } }); toast.success("Usuário excluído"); qc.invalidateQueries({ queryKey: ["admin-users"] }); }
    catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  return (
    <AdminShell title="Usuários" description="Listar, buscar, bloquear e excluir contas.">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por e-mail..."
        className="h-10 w-full sm:w-80 px-3 rounded-md border border-border bg-background text-sm mb-4"
      />
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="text-left p-3">E-mail</th><th className="text-left p-3">Papéis</th><th className="text-left p-3">Criado</th><th className="text-left p-3">Status</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">Carregando…</td></tr>}
            {data?.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3">{u.email}</td>
                <td className="p-3"><div className="flex flex-wrap gap-1">{u.roles.map((r) => <span key={r} className="px-1.5 py-0.5 rounded bg-secondary text-xs">{r}</span>)}</div></td>
                <td className="p-3 text-muted-foreground text-xs">{new Date(u.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="p-3">{u.banned_until && u.banned_until !== "none" ? <span className="text-destructive text-xs font-semibold">Bloqueado</span> : <span className="text-success text-xs font-semibold">Ativo</span>}</td>
                <td className="p-3 text-right">
                  <div className="inline-flex gap-2">
                    <button onClick={() => handleBan(u.id, !(u.banned_until && u.banned_until !== "none"))} className="text-xs px-2 h-8 rounded-md border border-border hover:border-primary">{u.banned_until && u.banned_until !== "none" ? "Desbloquear" : "Bloquear"}</button>
                    <button onClick={() => handleDelete(u.id)} className="text-xs px-2 h-8 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10">Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
