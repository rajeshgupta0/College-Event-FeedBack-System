import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TrendingUp, MessageSquare, Star, CalendarIcon, Filter, X, Image as ImageIcon, Music, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import KeywordTrendWidget from "@/components/KeywordTrendWidget";
import UrgentIssueWidget from "@/components/UrgentIssueWidget";
import SentimentTrendChart from "@/components/SentimentTrendChart";
import AdminLayout from "@/components/AdminLayout";

interface Feedback {
  id: string;
  feedback_text: string;
  rating: number | null;
  sentiment: string | null;
  polarity: number | null;
  created_at: string;
  event_id: string;
  user_id: string;
  image_url: string | null;
  audio_url: string | null;
  image_analysis: any;
  audio_analysis: any;
}

interface FeedbackWithDetails extends Feedback {
  event_name: string;
  user_email: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState<FeedbackWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [selectedSentiment, setSelectedSentiment] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  // Real-time subscription for feedback and registrations
  useEffect(() => {
    if (checking) return;

    const feedbackChannel = supabase
      .channel('admin-feedback-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback'
        },
        (payload) => {
          console.log('Feedback change:', payload);
          if (payload.eventType === 'INSERT') {
            toast.success('New feedback received!');
          }
          fetchFeedbacks();
        }
      )
      .subscribe();

    const registrationChannel = supabase
      .channel('admin-registration-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_registrations'
        },
        (payload) => {
          console.log('Registration change:', payload);
          if (payload.eventType === 'INSERT') {
            toast.success('New event registration!');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(feedbackChannel);
      supabase.removeChannel(registrationChannel);
    };
  }, [checking]);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please login to access admin dashboard");
        navigate("/auth");
        return;
      }

      const { data: roleData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error || roleData?.role !== "admin") {
        toast.error("Unauthorized: Admin access required");
        navigate("/student");
        return;
      }

      // Admin verified, load data
      setChecking(false);
      fetchFeedbacks();
    } catch (error) {
      console.error("Auth check error:", error);
      toast.error("Authentication error");
      navigate("/auth");
    }
  };

  const fetchFeedbacks = async () => {
    try {
      // Fetch feedback data
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (feedbackError) throw feedbackError;

      // Fetch events data
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("id, name");

      if (eventsError) throw eventsError;

      // Fetch profiles data
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email");

      if (profilesError) throw profilesError;

      // Create maps for quick lookup
      const eventMap = new Map(eventsData?.map(e => [e.id, e.name]) || []);
      const emailMap = new Map(profilesData?.map(p => [p.id, p.email]) || []);

      // Combine the data
      const formatted = feedbackData.map((fb: any) => ({
        ...fb,
        event_name: eventMap.get(fb.event_id) || "Unknown Event",
        user_email: emailMap.get(fb.user_id) || "Unknown User",
      }));

      setFeedbacks(formatted);
    } catch (error: any) {
      console.error("Error fetching feedbacks:", error);
      toast.error("Failed to load feedback data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const clearFilters = () => {
    setSelectedSentiment("all");
    setStartDate(undefined);
    setEndDate(undefined);
    toast.success("Filters cleared");
  };

  // Apply filters
  const filteredFeedbacks = feedbacks.filter((feedback) => {
    // Sentiment filter
    if (selectedSentiment !== "all" && feedback.sentiment?.toLowerCase() !== selectedSentiment.toLowerCase()) {
      return false;
    }

    // Date range filter
    const feedbackDate = new Date(feedback.created_at);
    if (startDate && feedbackDate < startDate) {
      return false;
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      if (feedbackDate > endOfDay) {
        return false;
      }
    }

    return true;
  });

  const totalFeedbacks = filteredFeedbacks.length;
  const avgRating = filteredFeedbacks.reduce((sum, fb) => sum + (fb.rating || 0), 0) / filteredFeedbacks.filter(fb => fb.rating).length || 0;
  
  const sentimentCounts = filteredFeedbacks.reduce((acc, fb) => {
    const sentiment = fb.sentiment || "Neutral";
    acc[sentiment] = (acc[sentiment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Chart data preparation
  const sentimentChartData = [
    { name: "Positive", value: sentimentCounts.Positive || 0, color: "hsl(var(--chart-1))" },
    { name: "Neutral", value: sentimentCounts.Neutral || 0, color: "hsl(var(--chart-2))" },
    { name: "Negative", value: sentimentCounts.Negative || 0, color: "hsl(var(--chart-3))" },
  ];

  // Word cloud data preparation
  const wordCloudWords = filteredFeedbacks
    .map(fb => fb.feedback_text)
    .join(" ")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 3)
    .reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const wordCloudData = Object.entries(wordCloudWords)
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment?.toLowerCase()) {
      case "positive": return "bg-green-500";
      case "negative": return "bg-red-500";
      default: return "bg-yellow-500";
    }
  };

  if (checking || loading) {
    return (
      <AdminLayout title="Dashboard" description="Loading...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Admin Dashboard" description="Overview of feedback analytics and insights">
      <div className="space-y-6">

        {/* Filters Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <CardDescription>Filter feedback by sentiment and date range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Sentiment Filter */}
              <div className="space-y-2">
                <Label>Sentiment</Label>
                <Select value={selectedSentiment} onValueChange={setSelectedSentiment}>
                  <SelectTrigger>
                    <SelectValue placeholder="All sentiments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sentiments</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date Filter */}
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* End Date Filter */}
              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Clear Filters Button */}
              <div className="space-y-2">
                <Label className="invisible">Clear</Label>
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="w-full"
                  disabled={selectedSentiment === "all" && !startDate && !endDate}
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              </div>
            </div>
            
            {/* Active Filters Indicator */}
            {(selectedSentiment !== "all" || startDate || endDate) && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>
                  Showing {totalFeedbacks} of {feedbacks.length} feedback{feedbacks.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Feedbacks</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFeedbacks}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgRating.toFixed(1)} / 5</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Positive Sentiment</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {Math.round((sentimentCounts.Positive / totalFeedbacks) * 100 || 0)}%
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Sentiment Distribution</CardTitle>
              <CardDescription>Breakdown of feedback sentiment</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sentimentChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sentimentChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Updated Word Cloud Card - Without ReactWordcloud */}
          <Card>
            <CardHeader>
              <CardTitle>Feedback Keywords</CardTitle>
              <CardDescription>
                Most common words extracted from student feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="min-h-[300px] rounded-xl border bg-muted/20 p-6 flex items-center justify-center">
                {wordCloudData.length > 0 ? (
                  <div className="flex flex-wrap gap-3 justify-center">
                    {wordCloudData.map((word, index) => (
                      <span
                        key={index}
                        className="rounded-full border px-3 py-2 font-medium transition-all duration-300 hover:scale-110 cursor-default"
                        style={{
                          fontSize: `${Math.min(14 + word.value * 1.5, 36)}px`,
                        }}
                      >
                        {word.text}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No feedback data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Feedback Submissions</CardTitle>
            <CardDescription>Complete list of student feedback with multi-modal content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Feedback</TableHead>
                    <TableHead>Attachments</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeedbacks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        {feedbacks.length === 0 ? "No feedback submissions yet" : "No feedback matches the selected filters"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredFeedbacks.map((feedback) => (
                      <TableRow key={feedback.id}>
                        <TableCell className="font-medium">{feedback.event_name}</TableCell>
                        <TableCell>{feedback.user_email}</TableCell>
                        <TableCell className="max-w-md">
                          <div className="space-y-2">
                            <p className="truncate">{feedback.feedback_text}</p>
                            
                            {/* Image Analysis */}
                            {feedback.image_url && (
                              <div className="space-y-1 text-xs p-2 bg-muted rounded">
                                <a 
                                  href={feedback.image_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1"
                                >
                                  <ImageIcon className="h-3 w-3" />
                                  View Image
                                </a>
                                {feedback.image_analysis && (
                                  <div className="text-muted-foreground">
                                    <strong>AI Analysis:</strong> {feedback.image_analysis.description || "Analysis available"}
                                    {feedback.image_analysis.issues && (
                                      <div className="mt-1">
                                        <strong>Issues:</strong> {Array.isArray(feedback.image_analysis.issues) 
                                          ? feedback.image_analysis.issues.join(", ") 
                                          : feedback.image_analysis.issues}
                                      </div>
                                    )}
                                    {feedback.image_analysis.severity && (
                                      <Badge className="mt-1" variant={
                                        feedback.image_analysis.severity === 'high' ? 'destructive' : 
                                        feedback.image_analysis.severity === 'medium' ? 'default' : 'secondary'
                                      }>
                                        {feedback.image_analysis.severity}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Audio Analysis */}
                            {feedback.audio_url && (
                              <div className="space-y-1 text-xs p-2 bg-muted rounded">
                                <div className="flex items-center gap-1">
                                  <Music className="h-3 w-3" />
                                  <audio controls src={feedback.audio_url} className="w-full max-w-xs h-8" />
                                </div>
                                {feedback.audio_analysis && (
                                  <div className="text-muted-foreground">
                                    <strong>Transcript:</strong> {feedback.audio_analysis.transcript || ""}
                                    <div className="mt-1 space-x-2">
                                      {feedback.audio_analysis.emotion && (
                                        <Badge variant="outline">
                                          Emotion: {feedback.audio_analysis.emotion}
                                        </Badge>
                                      )}
                                      {feedback.audio_analysis.urgency && (
                                        <Badge variant={
                                          feedback.audio_analysis.urgency === 'high' ? 'destructive' : 
                                          feedback.audio_analysis.urgency === 'medium' ? 'default' : 'secondary'
                                        }>
                                          Urgency: {feedback.audio_analysis.urgency}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {feedback.image_url && (
                              <Badge variant="secondary" className="text-xs">
                                <ImageIcon className="h-3 w-3 mr-1" />
                                Image
                              </Badge>
                            )}
                            {feedback.audio_url && (
                              <Badge variant="secondary" className="text-xs">
                                <Music className="h-3 w-3 mr-1" />
                                Audio
                              </Badge>
                            )}
                            {!feedback.image_url && !feedback.audio_url && (
                              <span className="text-muted-foreground text-xs">None</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{feedback.rating ? `${feedback.rating}/5` : "N/A"}</TableCell>
                        <TableCell>
                          <Badge className={getSentimentColor(feedback.sentiment)}>
                            {feedback.sentiment || "Neutral"}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(feedback.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Sentiment Trend Analysis */}
        <SentimentTrendChart feedbacks={filteredFeedbacks} />

        {/* Advanced Analytics Modules */}
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          <KeywordTrendWidget feedbacks={filteredFeedbacks} />
          <UrgentIssueWidget feedbacks={filteredFeedbacks} />
        </div>
      </div>
    </AdminLayout>
  );
}