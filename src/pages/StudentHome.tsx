import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Calendar, Star, TrendingUp, Bookmark, LogOut, User } from "lucide-react";
import { toast } from "sonner";

interface Event {
  id: string;
  name: string;
  description: string;
  event_type: string;
  event_date: string;
  venue: string;
  poster_url: string;
  interest_count?: number;
  is_interested?: boolean;
  is_bookmarked?: boolean;
}

interface StudentStats {
  total_points: number;
  level: string;
  badges_count: number;
  events_attended: number;
  feedback_count: number;
}

export default function StudentHome() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<StudentStats>({
    total_points: 0,
    level: 'Beginner',
    badges_count: 0,
    events_attended: 0,
    feedback_count: 0
  });
  const [trendingEvents, setTrendingEvents] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }
    setUser(session.user);
    await fetchProfile(session.user.id);
    await fetchStats(session.user.id);
    await fetchEvents(session.user.id);
    await fetchAIRecommendations(session.user.id);
    setLoading(false);
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data);
  };

  const fetchStats = async (userId: string) => {
    const [pointsData, badgesData, attendedData, feedbackData] = await Promise.all([
      supabase.from('student_points').select('*').eq('student_id', userId).single(),
      supabase.from('student_earned_badges').select('id').eq('student_id', userId),
      supabase.from('event_registrations').select('id').eq('student_id', userId).eq('attended', true),
      supabase.from('feedback').select('id').eq('user_id', userId)
    ]);

    setStats({
      total_points: pointsData.data?.total_points || 0,
      level: pointsData.data?.level || 'Beginner',
      badges_count: badgesData.data?.length || 0,
      events_attended: attendedData.data?.length || 0,
      feedback_count: feedbackData.data?.length || 0
    });
  };

  const fetchEvents = async (userId: string) => {
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('archived', false)
      .order('created_at', { ascending: false });

    if (!events) return;

    // Get interest counts and user interactions
    const eventsWithData = await Promise.all(
      events.map(async (event) => {
        const [interestData, userInterest, userBookmark] = await Promise.all([
          supabase.from('event_interests').select('id').eq('event_id', event.id),
          supabase.from('event_interests').select('id').eq('event_id', event.id).eq('student_id', userId).single(),
          supabase.from('event_bookmarks').select('id').eq('event_id', event.id).eq('student_id', userId).single()
        ]);

        return {
          ...event,
          interest_count: interestData.data?.length || 0,
          is_interested: !!userInterest.data,
          is_bookmarked: !!userBookmark.data
        };
      })
    );

    // Sort by interest count for trending
    const trending = [...eventsWithData].sort((a, b) => (b.interest_count || 0) - (a.interest_count || 0)).slice(0, 6);
    setTrendingEvents(trending);

    // Upcoming events (with dates in future)
    const upcoming = eventsWithData
      .filter(e => e.event_date && new Date(e.event_date) > new Date())
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
      .slice(0, 6);
    setUpcomingEvents(upcoming);

    // Recommended (high interest + not registered)
    const recommended = eventsWithData
      .filter(e => !e.is_interested && (e.interest_count || 0) > 5)
      .slice(0, 6);
    setRecommendedEvents(recommended);
  };

  const handleInterest = async (eventId: string, isInterested: boolean) => {
    if (!user) return;

    if (isInterested) {
      await supabase.from('event_interests').delete().eq('event_id', eventId).eq('student_id', user.id);
      toast.success("Removed from interests");
    } else {
      await supabase.from('event_interests').insert({ event_id: eventId, student_id: user.id });
      toast.success("Added to interests!");
    }
    fetchEvents(user.id);
  };

  const handleBookmark = async (eventId: string, isBookmarked: boolean) => {
    if (!user) return;

    if (isBookmarked) {
      await supabase.from('event_bookmarks').delete().eq('event_id', eventId).eq('student_id', user.id);
      toast.success("Bookmark removed");
    } else {
      await supabase.from('event_bookmarks').insert({ event_id: eventId, student_id: user.id });
      toast.success("Event bookmarked!");
    }
    fetchEvents(user.id);
  };

  const fetchAIRecommendations = async (userId: string) => {
    setLoadingRecommendations(true);
    try {
      // Gather student data
      const [profileData, interestsData, attendanceData, feedbackData, registrationsData] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('event_interests').select('*, events(name, event_type)').eq('student_id', userId),
        supabase.from('event_registrations').select('*, events(name, event_type)').eq('student_id', userId).eq('attended', true),
        supabase.from('feedback').select('*, events(name)').eq('user_id', userId),
        supabase.from('event_registrations').select('event_id').eq('student_id', userId)
      ]);

      const [pointsData] = await Promise.all([
        supabase.from('student_points').select('*').eq('student_id', userId).single()
      ]);

      // Get all available events
      const { data: allEvents } = await supabase
        .from('events')
        .select('*')
        .eq('archived', false);

      if (!allEvents || allEvents.length === 0) {
        setLoadingRecommendations(false);
        return;
      }

      // Add interest counts to events
      const eventsWithCounts = await Promise.all(
        allEvents.map(async (event) => {
          const { data: interests } = await supabase
            .from('event_interests')
            .select('id')
            .eq('event_id', event.id);
          return {
            ...event,
            interest_count: interests?.length || 0
          };
        })
      );

      const studentData = {
        department: 'General', // Can be enhanced later with user preferences
        total_points: pointsData.data?.total_points || 0,
        level: pointsData.data?.level || 'Beginner',
        events_attended: attendanceData.data?.length || 0,
        interests: interestsData.data?.map((i: any) => ({
          event_name: i.events?.name,
          event_type: i.events?.event_type
        })) || [],
        attendance: attendanceData.data?.map((a: any) => ({
          event_name: a.events?.name,
          event_type: a.events?.event_type,
          attended_at: a.attended_at
        })) || [],
        feedback: feedbackData.data?.map((f: any) => ({
          event_name: f.events?.name,
          sentiment: f.sentiment,
          tags: f.tags
        })) || [],
        registered_events: registrationsData.data?.map((r: any) => r.event_id) || []
      };

      // Call AI recommendation function
      const { data, error } = await supabase.functions.invoke('recommend-events', {
        body: {
          studentData,
          availableEvents: eventsWithCounts
        }
      });

      if (error) {
        console.error('Recommendation error:', error);
        toast.error('Could not load AI recommendations');
        setLoadingRecommendations(false);
        return;
      }

      if (data?.recommendations) {
        setAiRecommendations(data.recommendations);
        toast.success('🎯 AI recommendations loaded!');
      }
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const EventCard = ({ event }: { event: Event }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in">
      <div className="relative h-40 bg-gradient-to-br from-primary/20 to-secondary/20 overflow-hidden">
        {event.poster_url ? (
          <img src={event.poster_url} alt={event.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-4xl">🎉</div>
        )}
        <Button
          size="icon"
          variant="secondary"
          className="absolute top-2 right-2"
          onClick={(e) => {
            e.stopPropagation();
            handleBookmark(event.id, event.is_bookmarked || false);
          }}
        >
          <Bookmark className={`h-4 w-4 ${event.is_bookmarked ? 'fill-current' : ''}`} />
        </Button>
      </div>
      <CardContent className="p-4">
        <Badge variant="outline" className="mb-2">{event.event_type}</Badge>
        <h3 className="font-semibold text-lg mb-2 line-clamp-1">{event.name}</h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{event.description}</p>
        {event.venue && (
          <p className="text-xs text-muted-foreground mb-2">📍 {event.venue}</p>
        )}
        {event.event_date && (
          <p className="text-xs text-muted-foreground mb-3">📅 {new Date(event.event_date).toLocaleDateString()}</p>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {event.interest_count || 0} interested
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={event.is_interested ? "secondary" : "default"}
              onClick={() => handleInterest(event.id, event.is_interested || false)}
            >
              {event.is_interested ? "Interested ✓" : "I'm Interested"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/student/event/${event.id}`)}
            >
              View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Top Navigation */}
      <nav className="bg-card border-b sticky top-0 z-50 backdrop-blur-sm bg-card/80">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Student Portal
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/student/profile')}>
              <User className="h-4 w-4 mr-2" />
              Profile
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/student/explore')}>
              <Calendar className="h-4 w-4 mr-2" />
              Explore
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Greeting Section */}
        <div className="mb-8 animate-fade-in">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {profile?.full_name || 'Student'}! 👋
          </h2>
          <p className="text-muted-foreground">
            Discover exciting events and share your experience
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="hover-scale">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                Total Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_points}</div>
              <p className="text-xs text-muted-foreground mt-1">Level: {stats.level}</p>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                Badges Earned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.badges_count}</div>
              <p className="text-xs text-muted-foreground mt-1">Keep collecting!</p>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Events Attended
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.events_attended}</div>
              <p className="text-xs text-muted-foreground mt-1">Great participation!</p>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Feedback Given
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.feedback_count}</div>
              <p className="text-xs text-muted-foreground mt-1">Your voice matters!</p>
            </CardContent>
          </Card>
        </div>

        {/* Events Tabs */}
        <Tabs defaultValue="ai-recommended" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ai-recommended">🤖 AI Picks</TabsTrigger>
            <TabsTrigger value="trending">🔥 Trending</TabsTrigger>
            <TabsTrigger value="upcoming">📅 Upcoming</TabsTrigger>
            <TabsTrigger value="recommended">⭐ Popular</TabsTrigger>
          </TabsList>

          <TabsContent value="ai-recommended" className="space-y-4">
            {loadingRecommendations ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Analyzing your preferences with AI...</p>
                </CardContent>
              </Card>
            ) : aiRecommendations.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">No AI recommendations yet</p>
                  <Button onClick={() => user && fetchAIRecommendations(user.id)} variant="outline">
                    Generate Recommendations
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                        🤖
                      </div>
                      <div>
                        <h3 className="font-semibold">AI-Powered Recommendations</h3>
                        <p className="text-sm text-muted-foreground">
                          Based on your interests, attendance history, and preferences
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {aiRecommendations.map((rec, idx) => {
                    const event = trendingEvents.find(e => e.id === rec.event_id) || 
                                 upcomingEvents.find(e => e.id === rec.event_id) ||
                                 recommendedEvents.find(e => e.id === rec.event_id);
                    if (!event) return null;
                    
                    return (
                      <Card key={rec.event_id} className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in border-2 border-primary/20">
                        <div className="relative">
                          <div className="absolute top-2 left-2 z-10">
                            <Badge className="bg-primary/90 backdrop-blur-sm">
                              #{idx + 1} AI Pick
                            </Badge>
                          </div>
                          <div className="relative h-40 bg-gradient-to-br from-primary/20 to-secondary/20 overflow-hidden">
                            {event.poster_url ? (
                              <img src={event.poster_url} alt={event.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex items-center justify-center h-full text-4xl">🎉</div>
                            )}
                            <Button
                              size="icon"
                              variant="secondary"
                              className="absolute top-2 right-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBookmark(event.id, event.is_bookmarked || false);
                              }}
                            >
                              <Bookmark className={`h-4 w-4 ${event.is_bookmarked ? 'fill-current' : ''}`} />
                            </Button>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <Badge variant="outline" className="mb-2">{event.event_type}</Badge>
                          <h3 className="font-semibold text-lg mb-2 line-clamp-1">{event.name}</h3>
                          <div className="mb-3 p-2 bg-accent/50 rounded-md">
                            <p className="text-xs text-muted-foreground flex items-start gap-1">
                              <span className="font-medium">🎯 Why:</span>
                              <span>{rec.reason}</span>
                            </p>
                            {rec.match_factors && rec.match_factors.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {rec.match_factors.map((factor: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {factor}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{event.description}</p>
                          {event.venue && (
                            <p className="text-xs text-muted-foreground mb-2">📍 {event.venue}</p>
                          )}
                          {event.event_date && (
                            <p className="text-xs text-muted-foreground mb-3">📅 {new Date(event.event_date).toLocaleDateString()}</p>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {event.interest_count || 0} interested
                            </span>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={event.is_interested ? "secondary" : "default"}
                                onClick={() => handleInterest(event.id, event.is_interested || false)}
                              >
                                {event.is_interested ? "Interested ✓" : "I'm Interested"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/student/event/${event.id}`)}
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <div className="flex justify-center">
                  <Button 
                    onClick={() => user && fetchAIRecommendations(user.id)}
                    variant="outline"
                    disabled={loadingRecommendations}
                  >
                    🔄 Refresh AI Recommendations
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="trending" className="space-y-4">
            {trendingEvents.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No trending events right now</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trendingEvents.map(event => <EventCard key={event.id} event={event} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingEvents.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No upcoming events scheduled</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingEvents.map(event => <EventCard key={event.id} event={event} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recommended" className="space-y-4">
            {recommendedEvents.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Show interest in events to get personalized recommendations!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendedEvents.map(event => <EventCard key={event.id} event={event} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="mt-8 flex justify-center gap-4">
          <Button size="lg" onClick={() => navigate('/student/explore')} className="animate-fade-in">
            Explore All Events
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/student/profile')} className="animate-fade-in">
            View My Journey
          </Button>
        </div>
      </div>
    </div>
  );
}