import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Search, Star, Image as ImageIcon, Mic } from "lucide-react";
import { format } from "date-fns";

interface Feedback {
  id: string;
  feedback_text: string;
  rating: number | null;
  sentiment: string | null;
  mood_rating: string | null;
  image_url: string | null;
  audio_url: string | null;
  image_analysis: any;
  audio_analysis: any;
  tags: string[] | null;
  created_at: string;
  user_id: string;
  events: { name: string } | null;
}

const AdminFeedbackAnalytics = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [selectedSentiment, setSelectedSentiment] = useState<string>("all");
  const [selectedRating, setSelectedRating] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
    fetchEvents();
    fetchFeedbacks();
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [selectedEvent, selectedSentiment, selectedRating, searchQuery]);

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

  const fetchFeedbacks = async () => {
    let query = supabase
      .from("feedback")
      .select(`
        *,
        events(name)
      `)
      .order("created_at", { ascending: false });

    if (selectedEvent !== "all") {
      query = query.eq("event_id", selectedEvent);
    }

    if (selectedSentiment !== "all") {
      query = query.eq("sentiment", selectedSentiment);
    }

    if (selectedRating !== "all") {
      query = query.eq("rating", parseInt(selectedRating));
    }

    if (searchQuery) {
      query = query.ilike("feedback_text", `%${searchQuery}%`);
    }

    const { data } = await query;

    if (data) {
      setFeedbacks(data);
    }
  };

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case "Positive": return "bg-green-500";
      case "Negative": return "bg-red-500";
      case "Neutral": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const getMoodEmoji = (mood: string | null) => {
    const moods: { [key: string]: string } = {
      "very_happy": "😄",
      "happy": "😊",
      "neutral": "😐",
      "sad": "😔",
      "very_sad": "😢"
    };
    return mood ? moods[mood] || "😐" : "😐";
  };

  return (
    <AdminLayout title="Feedback Analytics" description="Monitor and analyze student feedback in real-time">
      <div className="space-y-6">

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Events" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    {events.map(event => (
                      <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={selectedSentiment} onValueChange={setSelectedSentiment}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sentiments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sentiments</SelectItem>
                    <SelectItem value="Positive">Positive</SelectItem>
                    <SelectItem value="Neutral">Neutral</SelectItem>
                    <SelectItem value="Negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Select value={selectedRating} onValueChange={setSelectedRating}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Ratings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="1">1 Star</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search feedback..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {feedbacks.map((feedback) => (
            <Card key={feedback.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getMoodEmoji(feedback.mood_rating)}</span>
                      <div>
                        <div className="font-semibold">Student Feedback</div>
                        <div className="text-sm text-muted-foreground">{feedback.events?.name || "Unknown Event"}</div>
                      </div>
                    </div>
                    <p className="text-foreground mb-3">{feedback.feedback_text}</p>
                    {feedback.tags && feedback.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {feedback.tags.map((tag, idx) => (
                          <Badge key={idx} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{format(new Date(feedback.created_at), "MMM dd, yyyy HH:mm")}</span>
                      {feedback.image_url && (
                        <span className="flex items-center gap-1">
                          <ImageIcon className="h-4 w-4" /> Photo attached
                        </span>
                      )}
                      {feedback.audio_url && (
                        <span className="flex items-center gap-1">
                          <Mic className="h-4 w-4" /> Audio attached
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {feedback.sentiment && (
                      <Badge className={getSentimentColor(feedback.sentiment)}>
                        {feedback.sentiment}
                      </Badge>
                    )}
                    {feedback.rating && (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: feedback.rating }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {feedback.image_analysis && (
                  <div className="mt-4 p-3 bg-accent/50 rounded-lg">
                    <div className="font-medium text-sm mb-1">AI Image Analysis:</div>
                    <div className="text-sm text-muted-foreground">
                      {JSON.stringify(feedback.image_analysis)}
                    </div>
                  </div>
                )}
                {feedback.audio_analysis && (
                  <div className="mt-4 p-3 bg-accent/50 rounded-lg">
                    <div className="font-medium text-sm mb-1">AI Audio Analysis:</div>
                    <div className="text-sm text-muted-foreground">
                      {JSON.stringify(feedback.audio_analysis)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {feedbacks.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No feedback found matching your filters</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminFeedbackAnalytics;