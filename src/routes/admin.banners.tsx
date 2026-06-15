import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { listBanners, upsertBanner, deleteBanner } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/banners")({
  head: () => ({ meta: [{ title: "Banners — Admin" }] }),
  component: Page,
});

function Page() {
  const fn = useServerFn(listBanners);
  const save = useServerFn(upsertBanner);
  const del = useServerFn(deleteBanner);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-banners"], queryFn: () => fn() });
  const [form, setForm] = useState({ id: "", title: "", subtitle: "", image_url: "", link_url: "", position: 0, is_active: true });
  const reset = () => setForm({ id: "", title: "", subtitle: "", image_url: "", link_url: "", position: 0, is_active: true });

  const submit = async () => {
    try {
      await save({ data: { id: form.id || undefined, title: form.title, subtitle: form.subtitle || null, image_url: form.image_url, link_url: form.link_url || null, position: Number(form.position) || 0, is_active: form.is_active } });
      toast.success("Salvo"); reset(); qc.invalidateQueries({ queryKey: ["admin-banners"] });
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };
  const remove = async (id: string) => {
    if (!confirm("Excluir banner?")) return;
    try { await del({ data: { id } }); qc.invalidateQueries({ queryKey: ["admin-banners"] }); }
    catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  return (
    <AdminShell title="Banners" description="Banners exibidos na home da loja.">
      <div className="grid lg:grid-cols-[1fr_380px] gap-4">
        <div className="space-y-3">
          {isLoading && <div className="text-muted-foreground text-sm">Carregando…</div>}
          {data?.map((b: any) => (
            <div key={b.id} className="bg-card border border-border rounded-xl overflow-hidden flex">
              <img src={b.image_url} alt="" className="w-40 h-28 object-cover bg-muted" />
              <div className="flex-1 p-3 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold truncate">{b.title}</div>
                  <span className={`text-xs px-2 py-0.5 rounded ${b.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{b.is_active ? "Ativo" : "Inativo"}</span>
                </div>
                {b.subtitle && <div className="text-xs text-muted-foreground line-clamp-2">{b.subtitle}</div>}
                <div className="text-xs text-muted-foreground mt-1">Posição: {b.position}</div>
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setForm({ id: b.id, title: b.title, subtitle: b.subtitle ?? "", image_url: b.image_url, link_url: b.link_url ?? "", position: b.position, is_active: b.is_active })} className="text-xs px-2 h-8 rounded-md border border-border">Editar</button>
                  <button onClick={() => remove(b.id)} className="text-xs px-2 h-8 rounded-md border border-destructive/40 text-destructive">Excluir</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-card border border-border rounded-xl p-4 h-fit space-y-2">
          <h3 className="font-bold mb-2">{form.id ? "Editar banner" : "Novo banner"}</h3>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título" className="h-10 w-full px-3 rounded-md border border-border bg-background text-sm" />
          <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Subtítulo (opcional)" className="h-10 w-full px-3 rounded-md border border-border bg-background text-sm" />
          <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="URL da imagem (https://...)" className="h-10 w-full px-3 rounded-md border border-border bg-background text-sm" />
          <input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="URL de destino (opcional)" className="h-10 w-full px-3 rounded-md border border-border bg-background text-sm" />
          <input type="number" value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} placeholder="Posição" className="h-10 w-full px-3 rounded-md border border-border bg-background text-sm" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Ativo</label>
          <div className="flex gap-2 pt-2">
            <button onClick={submit} className="flex-1 h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold">{form.id ? "Salvar" : "Criar"}</button>
            {form.id && <button onClick={reset} className="h-10 px-3 rounded-md border border-border text-sm">Cancelar</button>}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
