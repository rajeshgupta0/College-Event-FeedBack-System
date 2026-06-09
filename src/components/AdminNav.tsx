import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Calendar,
  Package,
  Users,
  ClipboardCheck,
  QrCode,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const AdminNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const navItems = [
    { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/admin/calendar", icon: Calendar, label: "Calendar" },
    { path: "/admin/events", icon: Settings, label: "Events" },
    { path: "/admin/resources", icon: Package, label: "Resources" },
    { path: "/admin/volunteers", icon: Users, label: "Volunteers" },
    { path: "/admin/registrations", icon: ClipboardCheck, label: "Registrations" },
    { path: "/admin/attendance", icon: QrCode, label: "Attendance" },
    { path: "/admin/feedback", icon: MessageSquare, label: "Feedback" },
    { path: "/admin/analytics", icon: BarChart3, label: "Analytics" },
    { path: "/admin/roles", icon: Settings, label: "Roles" },
  ];

  return (
    <nav className="bg-card border-b border-border px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={location.pathname === item.path ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </nav>
  );
};

export default AdminNav;