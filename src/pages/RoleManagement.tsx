import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import AdminLayout from "@/components/AdminLayout";
import AdminTable from "@/components/AdminTable";
import RoleBadge from "@/components/RoleBadge";

const roleSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "student"], {
    required_error: "Role is required",
  }),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  email: string;
}

export default function RoleManagement() {
  const navigate = useNavigate();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please login to access this page");
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleData?.role !== "admin") {
        toast.error("Unauthorized: Admin access required");
        navigate("/student");
        return;
      }

      fetchUserRoles();
    } catch (error) {
      console.error("Auth check error:", error);
      navigate("/auth");
    }
  };

  const fetchUserRoles = async () => {
    try {
      // Fetch user roles with profile data
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .order("role", { ascending: true });

      if (rolesError) throw rolesError;

      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email");

      if (profilesError) throw profilesError;

      // Create a map of user_id to email
      const emailMap = new Map(profilesData?.map(p => [p.id, p.email]) || []);

      // Combine the data
      const formatted = rolesData.map((ur: any) => ({
        id: ur.id,
        user_id: ur.user_id,
        role: ur.role,
        email: emailMap.get(ur.user_id) || "Unknown",
      }));

      setUserRoles(formatted);
    } catch (error: any) {
      console.error("Error fetching user roles:", error);
      toast.error("Failed to fetch user roles");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: RoleFormData) => {
    try {
      // Find user by email
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", data.email)
        .single();

      if (profileError || !profiles) {
        toast.error("User not found with this email");
        return;
      }

      // Check if role already exists
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", profiles.id)
        .eq("role", data.role)
        .single();

      if (existingRole) {
        toast.error("User already has this role");
        return;
      }

      // Delete existing role first if updating
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", profiles.id);

      // Insert new role
      const { error } = await supabase
        .from("user_roles")
        .insert([{
          user_id: profiles.id,
          role: data.role,
        }]);

      if (error) throw error;

      toast.success("Role assigned successfully!");
      setIsDialogOpen(false);
      reset();
      fetchUserRoles();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    reset();
  };

  const columns = [
    {
      key: "email",
      header: "Email",
      render: (userRole: UserRole) => (
        <span className="font-medium">{userRole.email}</span>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (userRole: UserRole) => (
        <RoleBadge role={userRole.role} />
      ),
    },
    {
      key: "user_id",
      header: "User ID",
      render: (userRole: UserRole) => (
        <span className="font-mono text-xs text-muted-foreground">{userRole.user_id}</span>
      ),
    },
  ];

  if (loading) {
    return (
      <AdminLayout title="Role Management" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Role Management" description="Manage user roles and permissions">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleDialogClose()}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign User Role</DialogTitle>
                <DialogDescription>
                  Assign or update a role for a registered user
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">User Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="user@college.com"
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    onValueChange={(value) => setValue("role", value as "admin" | "student")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-sm text-destructive">{errors.role.message}</p>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Assign Role
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <AdminTable
          title="User Roles"
          description={`${userRoles.length} user${userRoles.length !== 1 ? "s" : ""} in the system`}
          columns={columns}
          data={userRoles}
          keyExtractor={(userRole) => userRole.id}
          emptyMessage="No users found"
        />
      </div>
    </AdminLayout>
  );
}
