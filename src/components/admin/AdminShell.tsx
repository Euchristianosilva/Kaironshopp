import { Link } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { ShieldCheck } from "lucide-react";

export function AdminShell({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { checking, isAdmin } = useAdminGuard();

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-muted-foreground text-sm">
        Verificando permissões...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4 text-center">
        <div>
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-destructive" />
          <h1 className="text-2xl font-black">Acesso negado.</h1>
          <p className="text-sm text-muted-foreground mt-1">Apenas o proprietário pode acessar esta área.</p>
          <Link to="/" className="mt-4 inline-block text-primary underline text-sm">Voltar para a loja</Link>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <AdminSidebar />
        <SidebarInset className="flex flex-col min-w-0">
          <AdminTopbar />
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
            {(title || actions) && (
              <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
                <div className="min-w-0">
                  {title && <h1 className="truncate text-xl sm:text-2xl font-black tracking-tight">{title}</h1>}
                  {description && <p className="text-sm text-muted-foreground mt-0.5 truncate">{description}</p>}
                </div>
                {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
              </div>
            )}
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
