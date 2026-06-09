import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  MessageSquare, 
  Settings,
  LogOut,
  Menu,
  X,
  CalendarDays,
  Package,
  UserCheck,
  ClipboardList,
  QrCode,
  BarChart3,
  Activity,
  Image,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
}

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/calendar", label: "Event Calendar", icon: CalendarDays },
  { href: "/admin/events", label: "Manage Events", icon: Calendar },
  { href: "/admin/resources", label: "Resources", icon: Package },
  { href: "/admin/volunteers", label: "Volunteers", icon: UserCheck },
  { href: "/admin/registrations", label: "Registrations", icon: ClipboardList },
  { href: "/admin/attendance", label: "Attendance", icon: QrCode },
  { href: "/admin/feedback", label: "Feedback Analytics", icon: MessageSquare },
  { href: "/admin/live-monitoring", label: "Live Monitoring", icon: Activity },
  { href: "/admin/media-review", label: "Media Review", icon: Image },
  { href: "/admin/roles", label: "Role Management", icon: Shield },
];

export default function AdminLayout({ children, title, description }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const NavItem = ({ href, label, icon: Icon }: typeof navItems[0]) => {
    const isActive = location.pathname === href;
    return (
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-3 h-10",
          isActive && "bg-primary/10 text-primary font-medium"
        )}
        onClick={() => {
          navigate(href);
          setSidebarOpen(false);
        }}
      >
        <Icon className="h-4 w-4" />
        <span className="truncate">{label}</span>
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 h-screen w-64 bg-card border-r z-50 transition-transform duration-300",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate("/admin")}
            >
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <LayoutDashboard className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">Admin Panel</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 p-3">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavItem key={item.href} {...item} />
              ))}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center gap-4 p-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{title}</h1>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
