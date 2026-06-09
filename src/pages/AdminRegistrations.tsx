import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, ClipboardCheck, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface Registration {
  id: string;
  student_id: string;
  event_id: string;
  attended: boolean | null;
  registered_at: string;
  events: { name: string; event_date: string | null } | null;
  profiles: { full_name: string | null; email: string } | null;
}

const AdminRegistrations = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [stats, setStats] = useState({ total: 0, attended: 0, pending: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
    fetchEvents();
    fetchRegistrations();
  }, []);

  useEffect(() => {
    fetchRegistrations();
  }, [selectedEvent]);

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

  const fetchEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("id, name")
      .order("name");

    if (data) {
      setEvents(data);
    }
  };

  const fetchRegistrations = async () => {
    let query = supabase
      .from("event_registrations")
      .select(`
        *,
        events(name, event_date),
        profiles(full_name, email)
      `)
      .order("registered_at", { ascending: false });

    if (selectedEvent !== "all") {
      query = query.eq("event_id", selectedEvent);
    }

    const { data } = await query;

    if (data) {
      setRegistrations(data);
      setStats({
        total: data.length,
        attended: data.filter(r => r.attended).length,
        pending: data.filter(r => !r.attended).length
      });
    }
  };

  const exportToCSV = () => {
    const headers = ["Student Name", "Email", "Event", "Registered Date", "Attended"];
    const rows = registrations.map(r => [
      r.profiles?.full_name || "N/A",
      r.profiles?.email || "N/A",
      r.events?.name || "N/A",
      format(new Date(r.registered_at), "MMM dd, yyyy HH:mm"),
      r.attended ? "Yes" : "No"
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registrations-${selectedEvent === "all" ? "all" : "event"}-${Date.now()}.csv`;
    a.click();
  };

  return (
    <AdminLayout title="Registration Management" description="Track student registrations and attendance">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-foreground">{stats.total}</div>
                <div className="text-sm text-muted-foreground mt-2">Total Registrations</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-500">{stats.attended}</div>
                <div className="text-sm text-muted-foreground mt-2">Attended</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-500">{stats.pending}</div>
                <div className="text-sm text-muted-foreground mt-2">Pending Attendance</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                All Registrations
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filter by event:</span>
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    {events.map(event => (
                      <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Registration Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((registration) => (
                  <TableRow key={registration.id}>
                    <TableCell className="font-medium">
                      {registration.profiles?.full_name || "N/A"}
                    </TableCell>
                    <TableCell>{registration.profiles?.email || "N/A"}</TableCell>
                    <TableCell>{registration.events?.name || "N/A"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(registration.registered_at), "MMM dd, yyyy HH:mm")}
                      </div>
                    </TableCell>
                    <TableCell>
                      {registration.attended ? (
                        <Badge className="bg-green-500">Attended</Badge>
                      ) : (
                        <Badge className="bg-yellow-500">Pending</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminRegistrations;