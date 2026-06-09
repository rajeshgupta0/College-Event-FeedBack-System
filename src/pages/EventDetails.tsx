import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MapPin, Users, Award, CheckCircle, MessageSquare, Bookmark, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

interface Event {
  id: string;
  name: string;
  description: string;
  event_type: string;
  event_date: string;
  venue: string;
  poster_url: string;
  speakers: string[];
  benefits: string[];
  rewards: string[];
  department: string;
  max_participants: number;
}

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [interestCount, setInterestCount] = useState(0);
  const [isInterested, setIsInterested] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [registration, setRegistration] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (event?.event_date) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const eventTime = new Date(event.event_date).getTime();
        const distance = eventTime - now;

        if (distance < 0) {
          setTimeLeft("Event has started!");
          clearInterval(interval);
        } else {
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          setTimeLeft(`${days}d ${hours}h ${minutes}m`);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [event]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }
    setUser(session.user);
    await fetchEventDetails(session.user.id);
    setLoading(false);
  };

  const fetchEventDetails = async (userId: string) => {
    if (!id) return;

    const [eventData, interestData, userInterest, userBookmark, registrationData] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).single(),
      supabase.from('event_interests').select('id').eq('event_id', id),
      supabase.from('event_interests').select('id').eq('event_id', id).eq('student_id', userId).single(),
      supabase.from('event_bookmarks').select('id').eq('event_id', id).eq('student_id', userId).single(),
      supabase.from('event_registrations').select('*').eq('event_id', id).eq('student_id', userId).single()
    ]);

    if (eventData.data) {
      setEvent(eventData.data as Event);
    }
    setInterestCount(interestData.data?.length || 0);
    setIsInterested(!!userInterest.data);
    setIsBookmarked(!!userBookmark.data);
    
    if (registrationData.data) {
      setRegistration(registrationData.data);
      const qr = await QRCode.toDataURL(registrationData.data.qr_code);
      setQrCodeUrl(qr);
    }
  };

  const handleRegister = async () => {
    if (!user || !event) return;

    const qrCodeData = `EVENT:${event.id}|STUDENT:${user.id}|TIME:${Date.now()}`;
    
    const { error } = await supabase.from('event_registrations').insert({
      student_id: user.id,
      event_id: event.id,
      qr_code: qrCodeData
    });

    if (error) {
      toast.error("Failed to register");
      return;
    }

    // Award points
    const { data: existingPoints } = await supabase
      .from('student_points')
      .select('total_points')
      .eq('student_id', user.id)
      .single();

    if (existingPoints) {
      await supabase
        .from('student_points')
        .update({ total_points: existingPoints.total_points + 10 })
        .eq('student_id', user.id);
    } else {
      await supabase.from('student_points').insert({ 
        student_id: user.id, 
        total_points: 10 
      });
    }

    toast.success("Registered successfully! +10 points");
    fetchEventDetails(user.id);
  };

  const handleInterest = async () => {
    if (!user || !event) return;

    if (isInterested) {
      await supabase.from('event_interests').delete().eq('event_id', event.id).eq('student_id', user.id);
      toast.success("Removed from interests");
    } else {
      await supabase.from('event_interests').insert({ event_id: event.id, student_id: user.id });
      toast.success("Added to interests!");
    }
    fetchEventDetails(user.id);
  };

  const handleBookmark = async () => {
    if (!user || !event) return;

    if (isBookmarked) {
      await supabase.from('event_bookmarks').delete().eq('event_id', event.id).eq('student_id', user.id);
      toast.success("Bookmark removed");
    } else {
      await supabase.from('event_bookmarks').insert({ event_id: event.id, student_id: user.id });
      toast.success("Event bookmarked!");
    }
    fetchEventDetails(user.id);
  };

  if (loading || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading event details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <nav className="bg-card border-b sticky top-0 z-50 backdrop-blur-sm bg-card/80">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Event Details</h1>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Hero Section */}
        <div className="mb-8 animate-fade-in">
          <div className="relative h-80 rounded-xl overflow-hidden bg-gradient-to-br from-primary/30 to-secondary/30 mb-6">
            {event.poster_url ? (
              <img src={event.poster_url} alt={event.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-8xl">🎉</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="secondary" className="bg-white/20 backdrop-blur-sm">{event.event_type}</Badge>
                {event.department && <Badge variant="secondary" className="bg-white/20 backdrop-blur-sm">{event.department}</Badge>}
              </div>
              <h1 className="text-4xl font-bold mb-2">{event.name}</h1>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  {interestCount} interested
                </span>
                {event.max_participants && (
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Max {event.max_participants} participants
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Countdown Timer */}
          {event.event_date && new Date(event.event_date) > new Date() && (
            <Card className="mb-6 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
              <CardContent className="py-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Event starts in</p>
                <p className="text-3xl font-bold">{timeLeft}</p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            {registration ? (
              <Button size="lg" disabled className="flex-1">
                <CheckCircle className="mr-2 h-5 w-5" />
                Already Registered
              </Button>
            ) : (
              <Button size="lg" onClick={handleRegister} className="flex-1">
                Register Now
              </Button>
            )}
            <Button size="lg" variant={isInterested ? "secondary" : "outline"} onClick={handleInterest}>
              {isInterested ? "Interested ✓" : "I'm Interested"}
            </Button>
            <Button size="lg" variant="outline" onClick={handleBookmark}>
              <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
            </Button>
            {registration && (
              <Button size="lg" variant="outline" onClick={() => navigate(`/student/feedback/${event.id}`)}>
                <MessageSquare className="mr-2 h-5 w-5" />
                Give Feedback
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About This Event</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{event.description}</p>

                {event.speakers && event.speakers.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Speakers</h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {event.speakers.map((speaker, idx) => (
                        <li key={idx}>{speaker}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {event.benefits && event.benefits.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">What You'll Learn</h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {event.benefits.map((benefit, idx) => (
                        <li key={idx}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {event.rewards && event.rewards.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      Rewards & Perks
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {event.rewards.map((reward, idx) => (
                        <li key={idx}>{reward}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {event.event_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Date & Time</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.event_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {event.venue && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Venue</p>
                      <p className="text-sm text-muted-foreground">{event.venue}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {registration && qrCodeUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your QR Code</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <img src={qrCodeUrl} alt="QR Code" className="w-full max-w-[200px] mx-auto mb-4" />
                  <p className="text-xs text-muted-foreground">Show this at the event entrance</p>
                  {registration.attended && (
                    <Badge className="mt-3" variant="secondary">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Attended
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}