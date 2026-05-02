import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Files, 
  Users, 
  Percent, 
  BookOpen, 
  Briefcase,
  Bell,
  Search,
  Settings
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/loans", label: "Pipeline", icon: Files },
    { href: "/borrowers", label: "Borrowers", icon: Users },
    { href: "/rates", label: "Rate Sheet", icon: Percent },
    { href: "/products", label: "Products", icon: Briefcase },
    { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  ];

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border/50">
          <div className="flex items-center gap-2 text-sidebar-primary font-bold text-xl tracking-tight">
            <div className="w-6 h-6 bg-sidebar-primary rounded-sm flex items-center justify-center text-sidebar text-xs">P</div>
            Pursuit Bank
          </div>
        </div>
        
        <div className="px-4 py-6">
          <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-3 px-2">Command Center</div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}`}>
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-sidebar-border/50">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary text-sidebar font-medium flex items-center justify-center text-sm">
              JD
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Jane Doe</span>
              <span className="text-xs text-sidebar-foreground/50">Loan Officer</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-background border-b flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center w-96 relative">
            <Search className="w-4 h-4 absolute left-3 text-muted-foreground" />
            <Input 
              placeholder="Search loans, borrowers, guidelines..." 
              className="pl-9 bg-muted/50 border-transparent focus-visible:bg-background h-9"
            />
          </div>
          
          <div className="flex items-center gap-4">
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
