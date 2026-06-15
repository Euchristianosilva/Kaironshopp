import { Link } from "@tanstack/react-router";
import { Header } from "@/components/marketplace/Header";
import { Footer } from "@/components/marketplace/Footer";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export function AdminShell({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  const { checking, isAdmin } = useAdminGuard();

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 grid place-items-center text-muted-foreground">Verificando permissões...</main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 grid place-items-center px-4 text-center">
          <div>
            <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-destructive" />
            <h1 className="text-2xl font-black">Acesso negado.</h1>
            <Link to="/" className="mt-4 inline-block text-primary underline text-sm">Voltar para a loja</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Painel Admin
        </Link>
        <div className="mt-3 mb-6">
          <h1 className="text-2xl sm:text-3xl font-black">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {children}
      </main>
      <Footer />
    </div>
  );
}
