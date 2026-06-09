import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trophy, Star, Calendar, MessageSquare, Award, TrendingUp } from "lucide-react";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  points_required: number;
  earned_at?: string;
}

interface EventHistory {
  id: string;
  event_name: string;
  event_type: string;
  attended: boolean;
  registered_at: string;
  attended_at?: string;
}

export default function StudentProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({
    total_points: 0,
    level: 'Beginner',
    events_attended: 0,
    events_registered: 0,
    feedback_count: 0,
    next_level_points: 100
  });
  const [badges, setBadges] = useState<Badge[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [eventHistory, setEventHistory] = useState<EventHistory[]>([]);
  const [loading, setLoading] = useState(true);

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
    setLoading(false);
  };

  const fetchProfile = async (userId: string) => {
    const [profileData, pointsData, badgesData, earnedBadgesData, registrationsData, feedbackData] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('student_points').select('*').eq('student_id', userId).single(),
      supabase.from('student_badges').select('*').order('points_required'),
      supabase.from('student_earned_badges').select('*, student_badges(*)').eq('student_id', userId),
      supabase.from('event_registrations').select('*, events(name, event_type)').eq('student_id', userId).order('registered_at', { ascending: false }),
      supabase.from('feedback').select('id').eq('user_id', userId)
    ]);

    setProfile(profileData.data);

    const points = pointsData.data?.total_points || 0;
    const level = points < 100 ? 'Beginner' : points < 300 ? 'Explorer' : 'Pro';
    const nextLevelPoints = points < 100 ? 100 : points < 300 ? 300 : 500;

    setStats({
      total_points: points,
      level,
      events_attended: registrationsData.data?.filter(r => r.attended).length || 0,
      events_registered: registrationsData.data?.length || 0,
      feedback_count: feedbackData.data?.length || 0,
      next_level_points: nextLevelPoints
    });

    setBadges(badgesData.data || []);
    
    const earned = earnedBadgesData.data?.map(eb => ({
      ...(eb.student_badges as any),
      earned_at: eb.earned_at
    })) || [];
    setEarnedBadges(earned);

    const history = registrationsData.data?.map(reg => ({
      id: reg.id,
      event_name: (reg.events as any)?.name || 'Unknown Event',
      event_type: (reg.events as any)?.event_type || 'event',
      attended: reg.attended,
      registered_at: reg.registered_at,
      attended_at: reg.attended_at
    })) || [];
    setEventHistory(history);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  const levelProgress = ((stats.total_points % 100) / 100) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      <nav className="bg-card border-b sticky top-0 z-50 backdrop-blur-sm bg-card/80">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/student')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">My Journey</h1>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Profile Header */}
        <Card className="mb-8 animate-fade-in">
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-4xl text-white font-bold">
                {profile?.full_name?.charAt(0) || 'S'}
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-1">{profile?.full_name || 'Student'}</h2>
                <p className="text-muted-foreground mb-4">{profile?.email}</p>
                <div className="flex items-center gap-4">
                  <Badge className="text-lg px-4 py-1">{stats.level}</Badge>
                  <div className="flex items-center gap-2 text-sm">
                    <Trophy className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{stats.total_points}</span>
                    <span className="text-muted-foreground">points</span>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress to next level</span>
                    <span className="font-medium">{stats.total_points} / {stats.next_level_points}</span>
                  </div>
                  <Progress value={levelProgress} className="h-2" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hover-scale">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Events Attended
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.events_attended}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.events_registered} total registrations
              </p>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Feedback Given
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.feedback_count}</div>
              <p className="text-xs text-muted-foreground mt-1">Your voice matters!</p>
            </CardContent>
          </Card>

          <Card className="hover-scale">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                Badges Earned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{earnedBadges.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {badges.length - earnedBadges.length} more to unlock
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="badges" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="badges">🏆 Badges</TabsTrigger>
            <TabsTrigger value="history">📅 Event History</TabsTrigger>
          </TabsList>

          <TabsContent value="badges" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Earned Badges</CardTitle>
              </CardHeader>
              <CardContent>
                {earnedBadges.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No badges earned yet. Keep participating!
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {earnedBadges.map(badge => (
                      <Card key={badge.id} className="text-center hover-scale">
                        <CardContent className="pt-6">
                          <div className="text-5xl mb-3">{badge.icon}</div>
                          <h4 className="font-semibold mb-1">{badge.name}</h4>
                          <p className="text-xs text-muted-foreground mb-2">{badge.description}</p>
                          <Badge variant="secondary" className="text-xs">
                            Earned {new Date(badge.earned_at!).toLocaleDateString()}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Available Badges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {badges
                    .filter(b => !earnedBadges.find(eb => eb.id === b.id))
                    .map(badge => (
                      <Card key={badge.id} className="text-center opacity-50 hover-scale">
                        <CardContent className="pt-6">
                          <div className="text-5xl mb-3 grayscale">{badge.icon}</div>
                          <h4 className="font-semibold mb-1">{badge.name}</h4>
                          <p className="text-xs text-muted-foreground mb-2">{badge.description}</p>
                          <Badge variant="outline" className="text-xs">
                            Requires {badge.points_required} pts
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Event Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {eventHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No events yet. Start exploring!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {eventHistory.map(event => (
                      <div key={event.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors">
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center text-2xl ${
                          event.attended ? 'bg-primary/20' : 'bg-muted'
                        }`}>
                          {event.attended ? '✓' : '📅'}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{event.event_name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{event.event_type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {event.attended 
                                ? `Attended ${new Date(event.attended_at!).toLocaleDateString()}`
                                : `Registered ${new Date(event.registered_at).toLocaleDateString()}`
                              }
                            </span>
                          </div>
                        </div>
                        {event.attended && (
                          <Badge variant="secondary">
                            Attended
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}