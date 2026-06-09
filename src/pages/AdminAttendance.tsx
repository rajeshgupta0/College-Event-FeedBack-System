import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { QrCode, UserCheck, Clock, AlertCircle, Download } from "lucide-react";
import { format } from "date-fns";

interface Attendance {
  id: string;
  student_id: string;
  event_id: string;
  attended: boolean | null;
  attended_at: string | null;
  qr_code: string;
  events: { name: string };
  profiles: { full_name: string | null; email: string };
}

const AdminAttendance = () => {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [qrInput, setQrInput] = useState("");
  const [liveCount, setLiveCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchAttendance();
    }
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
      .select("id, name, event_date")
      .eq("archived", false)
      .order("event_date", { ascending: false });

    if (data) {
      setEvents(data);
      if (data.length > 0) {
        setSelectedEvent(data[0].id);
      }
    }
  };

  const fetchAttendance = async () => {
    const { data } = await supabase
      .from("event_registrations")
      .select(`
        *,
        events(name),
        profiles(full_name, email)
      `)
      .eq("event_id", selectedEvent)
      .order("registered_at", { ascending: false });

    if (data) {
      setAttendances(data);
      setLiveCount(data.filter(a => a.attended).length);
    }
  };

  const markAttendance = async (qrCode?: string) => {
    const codeToMark = qrCode || qrInput;
    if (!codeToMark) {
      toast.error("Please enter a QR code");
      return;
    }

    const { data: registration, error: findError } = await supabase
      .from("event_registrations")
      .select("*")
      .eq("qr_code", codeToMark)
      .eq("event_id", selectedEvent)
      .single();

    if (findError || !registration) {
      toast.error("Invalid QR code or not registered for this event");
      return;
    }

    if (registration.attended) {
      toast.error("Attendance already marked");
      return;
    }

    const { error: updateError } = await supabase
      .from("event_registrations")
      .update({
        attended: true,
        attended_at: new Date().toISOString()
      })
      .eq("id", registration.id);

    if (updateError) {
      toast.error("Failed to mark attendance");
      return;
    }

    toast.success("Attendance marked successfully");
    setQrInput("");
    fetchAttendance();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      markAttendance();
    }
  };

  const exportAttendance = () => {
    const selectedEventData = events.find(e => e.id === selectedEvent);
    const headers = ["Student Name", "Email", "Status", "Time"];
    const rows = attendances.map(a => [
      a.profiles.full_name || "N/A",
      a.profiles.email,
      a.attended ? "Present" : "Absent",
      a.attended_at ? format(new Date(a.attended_at), "HH:mm:ss") : "-"
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${selectedEventData?.name}-${Date.now()}.csv`;
    a.click();
  };

  const totalRegistered = attendances.length;
  const attendanceRate = totalRegistered > 0 ? ((liveCount / totalRegistered) * 100).toFixed(1) : "0";

  return (
    <AdminLayout title="QR Attendance Tracking" description="Scan QR codes to mark student attendance">
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={exportAttendance} disabled={!selectedEvent}>
            <Download className="h-4 w-4 mr-2" />
            Export Attendance
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <UserCheck className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{liveCount}</div>
                  <div className="text-sm text-muted-foreground">Present</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <AlertCircle className="h-8 w-8 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold">{totalRegistered - liveCount}</div>
                  <div className="text-sm text-muted-foreground">Absent</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <QrCode className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{totalRegistered}</div>
                  <div className="text-sm text-muted-foreground">Registered</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Clock className="h-8 w-8 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{attendanceRate}%</div>
                  <div className="text-sm text-muted-foreground">Attendance Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>QR Scanner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Scan QR Code or enter manually"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
                autoFocus
              />
              <Button onClick={() => markAttendance()}>
                <UserCheck className="h-4 w-4 mr-2" />
                Mark Attendance
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attendances.map((attendance) => (
                <div
                  key={attendance.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-medium">{attendance.profiles.full_name || "N/A"}</div>
                      <div className="text-sm text-muted-foreground">{attendance.profiles.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {attendance.attended && attendance.attended_at && (
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(attendance.attended_at), "HH:mm:ss")}
                      </div>
                    )}
                    {attendance.attended ? (
                      <Badge className="bg-green-500">Present</Badge>
                    ) : (
                      <Badge className="bg-yellow-500">Absent</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminAttendance;