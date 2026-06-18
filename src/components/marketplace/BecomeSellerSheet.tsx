import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createMyStore } from "@/lib/seller-onboarding.functions";
import { toast } from "sonner";
import { Store } from "lucide-react";

const CATEGORIES = [
  "Eletrônicos",
  "Moda",
  "Casa & Decoração",
  "Esportes",
  "Games",
  "Beleza",
  "Pet Shop",
  "Brinquedos",
  "Livros",
  "Outros",
];

export function BecomeSellerSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}) {
  const qc = useQueryClient();
  const createFn = useServerFn(createMyStore);
  const [form, setForm] = useState({
    name: "",
    description: "",
    document: "",
    phone: "",
    pix_key: "",
    category: "",
    origin_zip: "",
    origin_address: "",
    origin_number: "",
    origin_city: "",
    origin_state: "",
  });

  const mut = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Informe o nome da loja");
      if (!form.document.trim()) throw new Error("Informe seu CPF ou CNPJ");
      if (!form.phone.trim()) throw new Error("Informe um telefone");
      if (!form.pix_key.trim()) throw new Error("Informe sua chave Pix");
      if (!form.category) throw new Error("Selecione uma categoria");
      return await createFn({ data: form });
    },
    onSuccess: async () => {
      toast.success("Loja criada! Você agora é vendedor.");
      await qc.invalidateQueries();
      onOpenChange(false);
      onCreated?.();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao criar loja"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" /> Tornar-se vendedor
          </DialogTitle>
          <DialogDescription>
            Crie sua loja e comece a vender. Você poderá editar tudo depois no painel do vendedor.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <Label>Nome da loja *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CPF / CNPJ *</Label>
              <Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} placeholder="Apenas números" required />
            </div>
            <div>
              <Label>Telefone *</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" required />
            </div>
          </div>
          <div>
            <Label>Chave Pix *</Label>
            <Input value={form.pix_key} onChange={(e) => setForm({ ...form, pix_key: e.target.value })} placeholder="CPF, e-mail, telefone ou aleatória" required />
          </div>
          <div>
            <Label>Categoria da loja *</Label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              required
            >
              <option value="">Selecione...</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Endereço de origem (para frete)</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <Label className="text-xs">CEP</Label>
                <Input value={form.origin_zip} onChange={(e) => setForm({ ...form, origin_zip: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Cidade</Label>
                <Input value={form.origin_city} onChange={(e) => setForm({ ...form, origin_city: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Endereço</Label>
                <Input value={form.origin_address} onChange={(e) => setForm({ ...form, origin_address: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Nº</Label>
                <Input value={form.origin_number} onChange={(e) => setForm({ ...form, origin_number: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">UF</Label>
                <Input value={form.origin_state} onChange={(e) => setForm({ ...form, origin_state: e.target.value })} maxLength={2} />
              </div>
            </div>
          </div>
          <div>
            <Label>Descrição da loja</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} maxLength={500} />
          </div>
          <Button type="submit" disabled={mut.isPending} className="w-full">
            {mut.isPending ? "Criando loja..." : "Criar loja"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
