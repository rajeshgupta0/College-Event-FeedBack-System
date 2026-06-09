import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Archive, ArchiveRestore, CheckSquare, Square, Upload, X, Calendar, MapPin, Users, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import AdminLayout from "@/components/AdminLayout";
import AdminTable from "@/components/AdminTable";

const eventSchema = z.object({
  name: z.string().min(3, "Event name must be at least 3 characters").max(100, "Event name must be less than 100 characters"),
  event_type: z.string().min(1, "Event type is required"),
  description: z.string().max(1000, "Description must be less than 1000 characters").optional(),
  venue: z.string().max(200, "Venue must be less than 200 characters").optional(),
  event_date: z.string().optional(),
  max_participants: z.number().min(1).max(10000).optional().nullable(),
  department: z.string().max(100).optional(),
  speakers: z.string().optional(),
  benefits: z.string().optional(),
  rewards: z.string().optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

interface Event {
  id: string;
  name: string;
  event_type: string;
  description: string | null;
  venue: string | null;
  event_date: string | null;
  max_participants: number | null;
  department: string | null;
  speakers: string[] | null;
  benefits: string[] | null;
  rewards: string[] | null;
  poster_url: string | null;
  created_at: string;
  archived: boolean;
}

const EVENT_TYPES = [
  { value: "club", label: "Club Activity" },
  { value: "workshop", label: "Workshop" },
  { value: "seminar", label: "Seminar" },
  { value: "sports", label: "Sports Event" },
  { value: "cultural", label: "Cultural Event" },
  { value: "technical", label: "Technical Event" },
  { value: "hackathon", label: "Hackathon" },
  { value: "webinar", label: "Webinar" },
  { value: "competition", label: "Competition" },
];

export default function EventManagement() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchEvents();
    }
  }, [showArchived]);

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

      fetchEvents();
    } catch (error) {
      console.error("Auth check error:", error);
      navigate("/auth");
    }
  };

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("archived", showArchived)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
      setSelectedEvents(new Set());
    } catch (error: any) {
      toast.error("Failed to fetch events: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setPosterFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPosterPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadPoster = async (): Promise<string | null> => {
    if (!posterFile) return editingEvent?.poster_url || null;
    
    try {
      const fileExt = posterFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `event-posters/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('feedback-images')
        .upload(filePath, posterFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('feedback-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error("Failed to upload poster");
      return null;
    }
  };

  const onSubmit = async (data: EventFormData) => {
    setUploading(true);
    try {
      const posterUrl = await uploadPoster();
      
      // Parse array fields
      const speakers = data.speakers ? data.speakers.split(',').map(s => s.trim()).filter(Boolean) : null;
      const benefits = data.benefits ? data.benefits.split(',').map(s => s.trim()).filter(Boolean) : null;
      const rewards = data.rewards ? data.rewards.split(',').map(s => s.trim()).filter(Boolean) : null;

      const eventData = {
        name: data.name,
        event_type: data.event_type,
        description: data.description || null,
        venue: data.venue || null,
        event_date: data.event_date || null,
        max_participants: data.max_participants || null,
        department: data.department || null,
        speakers,
        benefits,
        rewards,
        poster_url: posterUrl,
      };

      if (editingEvent) {
        const { error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", editingEvent.id);

        if (error) throw error;
        toast.success("Event updated successfully!");
      } else {
        const { error } = await supabase
          .from("events")
          .insert([eventData]);

        if (error) throw error;
        toast.success("Event created successfully!");
      }

      handleDialogClose();
      fetchEvents();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setValue("name", event.name);
    setValue("event_type", event.event_type);
    setValue("description", event.description || "");
    setValue("venue", event.venue || "");
    setValue("event_date", event.event_date ? event.event_date.slice(0, 16) : "");
    setValue("max_participants", event.max_participants);
    setValue("department", event.department || "");
    setValue("speakers", event.speakers?.join(", ") || "");
    setValue("benefits", event.benefits?.join(", ") || "");
    setValue("rewards", event.rewards?.join(", ") || "");
    if (event.poster_url) {
      setPosterPreview(event.poster_url);
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event? This will also delete all associated feedback.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Event deleted successfully!");
      fetchEvents();
    } catch (error: any) {
      toast.error("Error deleting event: " + error.message);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingEvent(null);
    setPosterFile(null);
    setPosterPreview("");
    reset();
  };

  const toggleEventSelection = (eventId: string) => {
    const newSelection = new Set(selectedEvents);
    if (newSelection.has(eventId)) {
      newSelection.delete(eventId);
    } else {
      newSelection.add(eventId);
    }
    setSelectedEvents(newSelection);
  };

  const toggleAllEvents = () => {
    if (selectedEvents.size === events.length) {
      setSelectedEvents(new Set());
    } else {
      setSelectedEvents(new Set(events.map(e => e.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEvents.size === 0) return;

    if (!confirm(`Delete ${selectedEvents.size} event(s)? This will also delete associated feedback.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .in("id", Array.from(selectedEvents));

      if (error) throw error;
      toast.success(`Deleted ${selectedEvents.size} event(s)`);
      fetchEvents();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

  const handleBulkArchive = async (archive: boolean) => {
    if (selectedEvents.size === 0) return;

    try {
      const { error } = await supabase
        .from("events")
        .update({ archived: archive })
        .in("id", Array.from(selectedEvents));

      if (error) throw error;
      toast.success(`${archive ? "Archived" : "Unarchived"} ${selectedEvents.size} event(s)`);
      fetchEvents();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Event",
      render: (event: Event) => (
        <div className="flex items-center gap-3">
          {event.poster_url ? (
            <img src={event.poster_url} alt="" className="h-10 w-10 rounded object-cover" />
          ) : (
            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-lg">🎉</div>
          )}
          <div>
            <p className="font-medium">{event.name}</p>
            <p className="text-xs text-muted-foreground">{event.department || "General"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "event_type",
      header: "Type",
      render: (event: Event) => (
        <Badge variant="outline" className="capitalize">{event.event_type}</Badge>
      ),
    },
    {
      key: "event_date",
      header: "Date & Venue",
      render: (event: Event) => (
        <div className="space-y-1">
          {event.event_date && (
            <p className="text-sm flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(event.event_date).toLocaleDateString()}
            </p>
          )}
          {event.venue && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {event.venue}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "max_participants",
      header: "Capacity",
      render: (event: Event) => (
        event.max_participants ? (
          <span className="flex items-center gap-1 text-sm">
            <Users className="h-3 w-3" />
            {event.max_participants}
          </span>
        ) : <span className="text-muted-foreground">-</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      render: (event: Event) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(event)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(event.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <AdminLayout title="Event Management" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Event Management" description="Create, edit, and manage events">
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowArchived(!showArchived);
                setLoading(true);
              }}
            >
              {showArchived ? <ArchiveRestore className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
              {showArchived ? "Show Active" : "Show Archived"}
            </Button>
            {selectedEvents.size > 0 && (
              <>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedEvents.size})
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkArchive(!showArchived)}>
                  {showArchived ? <ArchiveRestore className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
                  {showArchived ? "Unarchive" : "Archive"} ({selectedEvents.size})
                </Button>
              </>
            )}
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleDialogClose()}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEvent ? "Edit Event" : "Create New Event"}</DialogTitle>
                <DialogDescription>
                  {editingEvent ? "Update the event details below" : "Fill in the details to create a new event"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Poster Upload */}
                <div className="space-y-2">
                  <Label>Event Poster</Label>
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <Label 
                        htmlFor="poster-upload" 
                        className="cursor-pointer block border-2 border-dashed rounded-lg p-4 hover:border-primary transition-colors text-center"
                      >
                        {posterPreview ? (
                          <div className="relative">
                            <img src={posterPreview} alt="Preview" className="max-h-32 mx-auto rounded" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-0 right-0 h-6 w-6"
                              onClick={(e) => {
                                e.preventDefault();
                                setPosterFile(null);
                                setPosterPreview("");
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Click to upload poster (max 5MB)</p>
                          </>
                        )}
                      </Label>
                      <input
                        id="poster-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePosterChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Event Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Event Name *</Label>
                    <Input id="name" {...register("name")} placeholder="Annual Tech Fest" />
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                  </div>

                  {/* Event Type */}
                  <div className="space-y-2">
                    <Label htmlFor="event_type">Event Type *</Label>
                    <Select
                      onValueChange={(value) => setValue("event_type", value)}
                      defaultValue={editingEvent?.event_type || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.event_type && <p className="text-sm text-destructive">{errors.event_type.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Event Date */}
                  <div className="space-y-2">
                    <Label htmlFor="event_date">Event Date & Time</Label>
                    <Input id="event_date" type="datetime-local" {...register("event_date")} />
                  </div>

                  {/* Venue */}
                  <div className="space-y-2">
                    <Label htmlFor="venue">Venue</Label>
                    <Input id="venue" {...register("venue")} placeholder="Main Auditorium" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Max Participants */}
                  <div className="space-y-2">
                    <Label htmlFor="max_participants">Max Participants</Label>
                    <Input 
                      id="max_participants" 
                      type="number" 
                      {...register("max_participants", { valueAsNumber: true })} 
                      placeholder="100" 
                    />
                  </div>

                  {/* Department */}
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input id="department" {...register("department")} placeholder="Computer Science" />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" {...register("description")} placeholder="Describe the event..." rows={3} />
                </div>

                {/* Speakers */}
                <div className="space-y-2">
                  <Label htmlFor="speakers">Speakers (comma-separated)</Label>
                  <Input id="speakers" {...register("speakers")} placeholder="John Doe, Jane Smith" />
                </div>

                {/* Benefits */}
                <div className="space-y-2">
                  <Label htmlFor="benefits">Benefits (comma-separated)</Label>
                  <Input id="benefits" {...register("benefits")} placeholder="Certificate, Networking, Skills" />
                </div>

                {/* Rewards */}
                <div className="space-y-2">
                  <Label htmlFor="rewards">Rewards (comma-separated)</Label>
                  <Input id="rewards" {...register("rewards")} placeholder="Certificate, Prize Money, Goodies" />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={uploading}>
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingEvent ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      editingEvent ? "Update Event" : "Create Event"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Events Table */}
        <AdminTable
          title={showArchived ? "Archived Events" : "Active Events"}
          description={`${events.length} event${events.length !== 1 ? "s" : ""}`}
          columns={columns}
          data={events}
          keyExtractor={(event) => event.id}
          emptyMessage={showArchived ? "No archived events" : "No events yet. Create your first event!"}
          selectable
          selectedItems={selectedEvents}
          onSelectItem={toggleEventSelection}
          onSelectAll={toggleAllEvents}
        />
      </div>
    </AdminLayout>
  );
}
