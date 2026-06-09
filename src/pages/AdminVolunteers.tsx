import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Users, UserCheck } from "lucide-react";

interface Volunteer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  department: string | null;
  skills: string[] | null;
}

interface VolunteerAssignment {
  id: string;
  volunteer_id: string;
  event_id: string;
  task: string;
  status: string;
  volunteers: { name: string };
  events: { name: string };
}

const AdminVolunteers = () => {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [assignments, setAssignments] = useState<VolunteerAssignment[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [isVolunteerDialogOpen, setIsVolunteerDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [volunteerForm, setVolunteerForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    skills: ""
  });
  const [assignmentForm, setAssignmentForm] = useState({
    volunteer_id: "",
    event_id: "",
    task: "registration_desk"
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
    fetchVolunteers();
    fetchAssignments();
    fetchEvents();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (!roles || !roles.some(r => r.role === "admin")) {
      navigate("/");
    }
  };

  const fetchVolunteers = async () => {
    const { data } = await supabase
      .from("volunteers")
      .select("*")
      .order("name");

    if (data) {
      setVolunteers(data);
    }
  };

  const fetchAssignments = async () => {
    const { data } = await supabase
      .from("volunteer_assignments")
      .select("*, volunteers(name), events(name)")
      .order("created_at", { ascending: false });

    if (data) {
      setAssignments(data);
    }
  };

  const fetchEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("id, name")
      .eq("archived", false)
      .order("name");

    if (data) {
      setEvents(data);
    }
  };

  const handleVolunteerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const skills = volunteerForm.skills ? volunteerForm.skills.split(',').map(s => s.trim()) : [];

    const { error } = await supabase
      .from("volunteers")
      .insert([{
        name: volunteerForm.name,
        email: volunteerForm.email,
        phone: volunteerForm.phone || null,
        department: volunteerForm.department || null,
        skills
      }]);

    if (error) {
      toast.error("Failed to add volunteer");
      return;
    }

    toast.success("Volunteer added successfully");
    setIsVolunteerDialogOpen(false);
    setVolunteerForm({ name: "", email: "", phone: "", department: "", skills: "" });
    fetchVolunteers();
  };

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from("volunteer_assignments")
      .insert([assignmentForm]);

    if (error) {
      toast.error("Failed to assign volunteer");
      return;
    }

    toast.success("Volunteer assigned successfully");
    setIsAssignmentDialogOpen(false);
    setAssignmentForm({ volunteer_id: "", event_id: "", task: "registration_desk" });
    fetchAssignments();
  };

  const updateAssignmentStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("volunteer_assignments")
      .update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update assignment status");
      return;
    }

    toast.success("Assignment status updated");
    fetchAssignments();
  };

  const deleteVolunteer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this volunteer?")) return;

    const { error } = await supabase
      .from("volunteers")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete volunteer");
      return;
    }

    toast.success("Volunteer deleted successfully");
    fetchVolunteers();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "active": return "bg-blue-500";
      case "pending": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <AdminLayout title="Volunteer Management" description="Manage volunteers and task assignments">
      <div className="space-y-6">
        <div className="flex justify-end gap-2">
          <Dialog open={isVolunteerDialogOpen} onOpenChange={setIsVolunteerDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Volunteer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Volunteer</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleVolunteerSubmit} className="space-y-4">
                <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={volunteerForm.name}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={volunteerForm.email}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={volunteerForm.phone}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={volunteerForm.department}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, department: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="skills">Skills (comma-separated)</Label>
                    <Input
                      id="skills"
                      value={volunteerForm.skills}
                      onChange={(e) => setVolunteerForm({ ...volunteerForm, skills: e.target.value })}
                      placeholder="e.g., Registration, Audio, Stage Management"
                    />
                  </div>
                  <Button type="submit" className="w-full">Add Volunteer</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Assign Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Volunteer to Task</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAssignmentSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="volunteer">Volunteer</Label>
                    <Select value={assignmentForm.volunteer_id} onValueChange={(value) => setAssignmentForm({ ...assignmentForm, volunteer_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select volunteer" />
                      </SelectTrigger>
                      <SelectContent>
                        {volunteers.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="event">Event</Label>
                    <Select value={assignmentForm.event_id} onValueChange={(value) => setAssignmentForm({ ...assignmentForm, event_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select event" />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map(e => (
                          <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="task">Task</Label>
                    <Select value={assignmentForm.task} onValueChange={(value) => setAssignmentForm({ ...assignmentForm, task: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="registration_desk">Registration Desk</SelectItem>
                        <SelectItem value="stage">Stage Management</SelectItem>
                        <SelectItem value="audio">Audio/Visual</SelectItem>
                        <SelectItem value="crowd_control">Crowd Control</SelectItem>
                        <SelectItem value="refreshments">Refreshments</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">Assign Task</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Volunteers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {volunteers.map((volunteer) => (
                    <TableRow key={volunteer.id}>
                      <TableCell className="font-medium">{volunteer.name}</TableCell>
                      <TableCell>{volunteer.email}</TableCell>
                      <TableCell>{volunteer.department || '-'}</TableCell>
                      <TableCell>
                        <Button variant="destructive" size="sm" onClick={() => deleteVolunteer(volunteer.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Task Assignments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="border border-border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold">{assignment.volunteers.name}</div>
                        <div className="text-sm text-muted-foreground">{assignment.events.name}</div>
                      </div>
                      <Badge className={getStatusColor(assignment.status)}>
                        {assignment.status}
                      </Badge>
                    </div>
                    <div className="text-sm mt-2">
                      <span className="font-medium">Task:</span> {assignment.task.replace('_', ' ')}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAssignmentStatus(assignment.id, 'active')}
                        disabled={assignment.status === 'active'}
                      >
                        Mark Active
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateAssignmentStatus(assignment.id, 'completed')}
                        disabled={assignment.status === 'completed'}
                      >
                        Mark Complete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminVolunteers;