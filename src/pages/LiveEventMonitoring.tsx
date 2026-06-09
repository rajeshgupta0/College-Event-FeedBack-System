import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AdminLayout from "@/components/AdminLayout";
import KeywordTrendWidget from "@/components/KeywordTrendWidget";
import UrgentIssueWidget from "@/components/UrgentIssueWidget";
import SentimentTrendChart from "@/components/SentimentTrendChart";
import { Users, MessageSquare, TrendingUp, RefreshCw, Activity, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface LiveStats {
  totalRegistrations: number;
  totalAttendance: number;
  liveFeedbackCount: number;
  averageRating: number;
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
}

interface RecentCheckIn {
  id: string;
  studentName: string;
  checkedInAt: string;
}

const LiveEventMonitoring = () => {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');
  const [event, setEvent] = useState<any>(null);
  const [stats, setStats] = useState<LiveStats>({
    totalRegistrations: 0,
    totalAttendance: 0,
    liveFeedbackCount: 0,
    averageRating: 0,
    sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
  });
  const [recentFeedback, setRecentFeedback] = useState<any[]>([]);
  const [allFeedback, setAllFeedback] = useState<any[]>([]);
  const [recentCheckIns, setRecentCheckIns] = useState<RecentCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [liveCounterPulse, setLiveCounterPulse] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEventData();
      fetchLiveStats();
      fetchRecentCheckIns();

      // Set up realtime subscriptions
      const feedbackChannel = supabase
        .channel(`feedback-${eventId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'feedback',
            filter: `event_id=eq.${eventId}`,
          },
          () => {
            fetchLiveStats();
          }
        )
        .subscribe();

      const registrationChannel = supabase
        .channel(`registrations-${eventId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'event_registrations',
            filter: `event_id=eq.${eventId}`,
          },
          async (payload) => {
            const newRecord = payload.new as any;
            const oldRecord = payload.old as any;
            
            // Check if attendance was just marked
            if (newRecord.attended && !oldRecord.attended) {
              // Fetch student name
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, email')
                .eq('id', newRecord.student_id)
                .single();
              
              const studentName = profile?.full_name || profile?.email || 'Student';
              
              // Trigger pulse animation
              setLiveCounterPulse(true);
              setTimeout(() => setLiveCounterPulse(false), 1000);
              
              // Show toast notification
              toast.success(`${studentName} just checked in!`, {
                icon: <UserCheck className="h-4 w-4" />,
              });
              
              // Add to recent check-ins
              setRecentCheckIns(prev => [{
                id: newRecord.id,
                studentName,
                checkedInAt: newRecord.attended_at || new Date().toISOString(),
              }, ...prev.slice(0, 9)]);
              
              fetchLiveStats();
            }
          }
        )
        .subscribe();

      // Auto-refresh every 30 seconds
      const interval = setInterval(() => {
        if (autoRefresh) {
          fetchLiveStats();
        }
      }, 30000);

      return () => {
        supabase.removeChannel(feedbackChannel);
        supabase.removeChannel(registrationChannel);
        clearInterval(interval);
      };
    }
  }, [eventId, autoRefresh]);

  const fetchEventData = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();
    setEvent(data);
  };

  const fetchRecentCheckIns = async () => {
    const { data: registrations } = await supabase
      .from('event_registrations')
      .select('id, student_id, attended_at')
      .eq('event_id', eventId)
      .eq('attended', true)
      .order('attended_at', { ascending: false })
      .limit(10);

    if (registrations && registrations.length > 0) {
      const checkIns: RecentCheckIn[] = [];
      for (const reg of registrations) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', reg.student_id)
          .single();
        
        checkIns.push({
          id: reg.id,
          studentName: profile?.full_name || profile?.email || 'Student',
          checkedInAt: reg.attended_at || '',
        });
      }
      setRecentCheckIns(checkIns);
    }
  };

  const fetchLiveStats = async () => {
    try {
      // Fetch registrations
      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId);

      const totalRegistrations = registrations?.length || 0;
      const totalAttendance = registrations?.filter(r => r.attended).length || 0;

      // Fetch feedback with event names
      const { data: feedback } = await supabase
        .from('feedback')
        .select(`
          *,
          events (name)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      const feedbackWithEventNames = feedback?.map(fb => ({
        ...fb,
        event_name: fb.events?.name || 'Unknown Event'
      })) || [];

      const liveFeedbackCount = feedbackWithEventNames.length;
      
      // Calculate average rating
      const ratings = feedbackWithEventNames.map(f => f.rating).filter(r => r !== null);
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
        : 0;

      // Calculate sentiment breakdown
      const sentimentBreakdown = {
        positive: feedbackWithEventNames.filter(f => f.sentiment === 'positive').length,
        neutral: feedbackWithEventNames.filter(f => f.sentiment === 'neutral').length,
        negative: feedbackWithEventNames.filter(f => f.sentiment === 'negative').length,
      };

      setStats({
        totalRegistrations,
        totalAttendance,
        liveFeedbackCount,
        averageRating,
        sentimentBreakdown,
      });

      setRecentFeedback(feedbackWithEventNames.slice(0, 10));
      setAllFeedback(feedbackWithEventNames);
    } catch (error) {
      console.error('Error fetching live stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const attendanceRate = stats.totalRegistrations > 0 
    ? ((stats.totalAttendance / stats.totalRegistrations) * 100).toFixed(1)
    : 0;

  if (!eventId) {
    return <div>No event selected</div>;
  }

  return (
    <AdminLayout title="Live Event Monitoring" description={event?.name || "Select an event to monitor"}>
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={() => { fetchLiveStats(); fetchRecentCheckIns(); }} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Live Attendance Counter - Prominent Display */}
        <Card className={`border-2 border-primary bg-gradient-to-r from-primary/10 to-primary/5 transition-all duration-300 ${liveCounterPulse ? 'scale-[1.02] shadow-lg shadow-primary/20' : ''}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-full bg-primary/20 ${liveCounterPulse ? 'animate-ping' : ''}`}>
                  <UserCheck className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Live Attendance</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-primary">{stats.totalAttendance}</span>
                    <span className="text-2xl text-muted-foreground">/ {stats.totalRegistrations}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {attendanceRate}% attendance rate
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-green-600">Live</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Check-ins */}
        {recentCheckIns.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Recent Check-ins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {recentCheckIns.slice(0, 5).map((checkIn, index) => (
                  <Badge 
                    key={checkIn.id} 
                    variant="secondary"
                    className={`transition-all duration-300 ${index === 0 && liveCounterPulse ? 'bg-primary text-primary-foreground' : ''}`}
                  >
                    {checkIn.studentName} • {new Date(checkIn.checkedInAt).toLocaleTimeString()}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Live Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRegistrations}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalAttendance} attended ({attendanceRate}%)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Live Feedback</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.liveFeedbackCount}</div>
              <p className="text-xs text-muted-foreground">Responses received</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}/5</div>
              <div className="flex gap-1 mt-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 w-2 rounded-full ${
                      i < Math.round(stats.averageRating) ? 'bg-yellow-400' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sentiment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Badge className="bg-green-500">+{stats.sentimentBreakdown.positive}</Badge>
                <Badge className="bg-gray-500">{stats.sentimentBreakdown.neutral}</Badge>
                <Badge className="bg-red-500">-{stats.sentimentBreakdown.negative}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <SentimentTrendChart feedbacks={allFeedback} />
          <UrgentIssueWidget feedbacks={allFeedback} />
        </div>

        <div className="mb-6">
          <KeywordTrendWidget feedbacks={allFeedback} />
        </div>

        {/* Recent Feedback Stream */}
        <Card>
          <CardHeader>
            <CardTitle>Live Feedback Stream</CardTitle>
            <CardDescription>Most recent feedback submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentFeedback.map((fb) => (
                <div key={fb.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex gap-2">
                      <Badge variant={
                        fb.sentiment === 'positive' ? 'default' : 
                        fb.sentiment === 'negative' ? 'destructive' : 
                        'secondary'
                      }>
                        {fb.sentiment}
                      </Badge>
                      {fb.rating && (
                        <Badge variant="outline">{fb.rating}/5 ⭐</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(fb.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm">{fb.feedback_text}</p>
                  {fb.tags && fb.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {fb.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default LiveEventMonitoring;