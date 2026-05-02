import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FilePlus2,
  Files,
  Building2,
  CreditCard,
  ClipboardList,
  Users,
  Percent,
  BookOpen,
  Briefcase,
  Bell,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const opsNavItems = [
    { href: "/", label: "Operations Center", icon: LayoutDashboard },
    { href: "/new-loan", label: "New Application", icon: FilePlus2 },
    { href: "/tasks", label: "Task Queue", icon: ClipboardList },
    { href: "/escrow", label: "Escrow", icon: Building2 },
    { href: "/heloc", label: "HELOC", icon: CreditCard },
  ];

  const pipelineNavItems = [
    { href: "/pipeline", label: "Loan Pipeline", icon: Files },
    { href: "/borrowers", label: "Borrowers", icon: Users },
  ];

  const referenceNavItems = [
    { href: "/rates", label: "Rate Sheet", icon: Percent },
    { href: "/products", label: "Products", icon: Briefcase },
    { href: "/knowledge", label: "Knowledge Base", icon: BookOpen },
  ];

  const isActive = (href: string) =>
    href === "/"
      ? location === "/"
      : location.startsWith(href);

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border/50">
          <div className="flex items-center gap-2 text-sidebar-primary font-bold text-xl tracking-tight">
            <div className="w-6 h-6 bg-sidebar-primary rounded-sm flex items-center justify-center text-sidebar text-xs font-bold">P</div>
            Pursuit Bank
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Operations */}
          <NavSection label="Operations" items={opsNavItems} isActive={isActive} />

          {/* Pipeline */}
          <NavSection label="Pipeline" items={pipelineNavItems} isActive={isActive} />

          {/* Reference */}
          <NavSection label="Reference" items={referenceNavItems} isActive={isActive} />
        </div>

        <div className="p-4 border-t border-sidebar-border/50">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary text-sidebar font-bold flex items-center justify-center text-sm">
              MS
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">Mark Santos</span>
              <span className="text-xs text-sidebar-foreground/50">Loan Processor</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-background border-b flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-muted-foreground">Mortgage Operations</h2>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/new-loan">
              <Button size="sm" className="gap-2 h-8 text-xs">
                <FilePlus2 className="w-3.5 h-3.5" />
                New Loan
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full"></span>
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavSection({
  label,
  items,
  isActive,
}: {
  label: string;
  items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  isActive: (href: string) => boolean;
}) {
  return (
    <div>
      <div className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-2 px-2">
        {label}
      </div>
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
