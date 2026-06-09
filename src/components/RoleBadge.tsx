import { Badge } from "@/components/ui/badge";
import { Shield, User } from "lucide-react";

interface RoleBadgeProps {
  role: "admin" | "student" | string;
  size?: "sm" | "md" | "lg";
}

export default function RoleBadge({ role, size = "md" }: RoleBadgeProps) {
  const isAdmin = role === "admin";
  
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <Badge 
      variant={isAdmin ? "default" : "secondary"}
      className={`${sizeClasses[size]} flex items-center gap-1 capitalize`}
    >
      {isAdmin ? (
        <Shield className={iconSizes[size]} />
      ) : (
        <User className={iconSizes[size]} />
      )}
      {role}
    </Badge>
  );
}
