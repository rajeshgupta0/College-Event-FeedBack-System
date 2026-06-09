import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Calendar as CalendarIcon, MapPin } from "lucide-react";
import { format, isSameDay } from "date-fns";

interface Event {
  id: string;
  name: string;
  event_type: string;
  event_date: string | null;
  venue: string | null;
  speakers: string[] | null;
}

const AdminEventCalendar = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [conflicts, setConflicts] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
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

  const fetchEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });

    if (data) {
      setEvents(data);
      detectConflicts(data);
    }
  };

  const detectConflicts = (eventList: Event[]) => {
    const conflictMessages: string[] = [];
    const eventsByDate: { [key: string]: Event[] } = {};

    eventList.forEach(event => {
      if (event.event_date) {
        const dateKey = format(new Date(event.event_date), 'yyyy-MM-dd');
        if (!eventsByDate[dateKey]) {
          eventsByDate[dateKey] = [];
        }
        eventsByDate[dateKey].push(event);
      }
    });

    Object.entries(eventsByDate).forEach(([date, dayEvents]) => {
      if (dayEvents.length > 1) {
        const venueConflicts = dayEvents.filter((e, i, arr) => 
          arr.findIndex(other => other.venue === e.venue && other.id !== e.id) !== -1
        );
        
        if (venueConflicts.length > 0) {
          conflictMessages.push(
            `${format(new Date(date), 'MMM dd, yyyy')}: Venue conflict at ${venueConflicts[0].venue} - Multiple events scheduled`
          );
        }

        const speakerConflicts = dayEvents.some((e1, i) => 
          dayEvents.slice(i + 1).some(e2 => 
            e1.speakers && e2.speakers && 
            e1.speakers.some(s => e2.speakers?.includes(s))
          )
        );

        if (speakerConflicts) {
          conflictMessages.push(
            `${format(new Date(date), 'MMM dd, yyyy')}: Speaker conflict - Same speaker assigned to multiple events`
          );
        }
      }
    });

    setConflicts(conflictMessages);
  };

  const eventsOnSelectedDate = events.filter(event => 
    event.event_date && selectedDate && isSameDay(new Date(event.event_date), selectedDate)
  );

  const eventDates = events
    .filter(e => e.event_date)
    .map(e => new Date(e.event_date!));

  const getEventTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      cultural: "bg-pink-500",
      technical: "bg-blue-500",
      sports: "bg-green-500",
      seminar: "bg-purple-500",
      workshop: "bg-orange-500",
      hackathon: "bg-red-500",
      webinar: "bg-cyan-500",
      club: "bg-yellow-500"
    };
    return colors[type.toLowerCase()] || "bg-gray-500";
  };

  return (
    <AdminLayout title="Event Calendar" description="View all events and detect scheduling conflicts">
      <div className="space-y-6">
        {conflicts.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-2">Scheduling Conflicts Detected:</div>
              <ul className="list-disc pl-4 space-y-1">
                {conflicts.map((conflict, idx) => (
                  <li key={idx}>{conflict}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Calendar View</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{ hasEvent: eventDates }}
                modifiersClassNames={{
                  hasEvent: "bg-primary/20 font-bold"
                }}
                className="rounded-md border"
              />
              <div className="mt-4 space-y-2">
                <div className="text-sm font-medium">Event Types</div>
                <div className="flex flex-wrap gap-2">
                  {['Cultural', 'Technical', 'Sports', 'Seminar', 'Workshop', 'Hackathon', 'Webinar'].map(type => (
                    <Badge key={type} className={getEventTypeColor(type)}>
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Events on {selectedDate ? format(selectedDate, 'MMMM dd, yyyy') : 'Selected Date'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {eventsOnSelectedDate.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No events scheduled for this date</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {eventsOnSelectedDate.map(event => (
                    <div key={event.id} className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{event.name}</h3>
                          <Badge className={`${getEventTypeColor(event.event_type)} mt-2`}>
                            {event.event_type}
                          </Badge>
                        </div>
                      </div>
                      {event.venue && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                          <MapPin className="h-4 w-4" />
                          {event.venue}
                        </div>
                      )}
                      {event.speakers && event.speakers.length > 0 && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium">Speakers:</span> {event.speakers.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminEventCalendar;