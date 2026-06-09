import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Filter, Bookmark, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface Event {
  id: string;
  name: string;
  description: string;
  event_type: string;
  event_date: string;
  venue: string;
  poster_url: string;
  department: string;
  interest_count?: number;
  is_interested?: boolean;
  is_bookmarked?: boolean;
}

export default function EventExplore() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [loading, setLoading] = useState(true);

  const categories = ["all", "club", "cultural", "technical", "sports", "seminar", "workshop", "hackathon", "webinar"];

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [events, searchQuery, categoryFilter, departmentFilter, sortBy]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }
    setUser(session.user);
    await fetchEvents(session.user.id);
    setLoading(false);
  };

  const fetchEvents = async (userId: string) => {
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('archived', false)
      .order('created_at', { ascending: false });

    if (!events) return;

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

    setEvents(eventsWithData);
  };

  const applyFilters = () => {
    let filtered = [...events];

    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(event => event.event_type === categoryFilter);
    }

    if (departmentFilter !== "all") {
      filtered = filtered.filter(event => event.department === departmentFilter);
    }

    if (sortBy === "date") {
      filtered.sort((a, b) => {
        if (!a.event_date) return 1;
        if (!b.event_date) return -1;
        return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
      });
    } else if (sortBy === "popularity") {
      filtered.sort((a, b) => (b.interest_count || 0) - (a.interest_count || 0));
    }

    setFilteredEvents(filtered);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      <nav className="bg-card border-b sticky top-0 z-50 backdrop-blur-sm bg-card/80">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/student')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Explore Events</h1>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="CSE">Computer Science</SelectItem>
                <SelectItem value="ECE">Electronics</SelectItem>
                <SelectItem value="ME">Mechanical</SelectItem>
                <SelectItem value="CE">Civil</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="popularity">Popularity</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Events Grid */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
          </p>
        </div>

        {filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No events found matching your filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in">
                <div className="relative h-48 bg-gradient-to-br from-primary/20 to-secondary/20 overflow-hidden">
                  {event.poster_url ? (
                    <img src={event.poster_url} alt={event.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-5xl">🎉</div>
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
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline">{event.event_type}</Badge>
                    {event.department && (
                      <Badge variant="secondary">{event.department}</Badge>
                    )}
                  </div>
                  <h3 className="font-bold text-lg mb-2 line-clamp-1">{event.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{event.description}</p>
                  {event.venue && (
                    <p className="text-xs text-muted-foreground mb-2">📍 {event.venue}</p>
                  )}
                  {event.event_date && (
                    <p className="text-xs text-muted-foreground mb-4">📅 {new Date(event.event_date).toLocaleDateString()}</p>
                  )}
                  <div className="flex items-center justify-between">
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
                        {event.is_interested ? "✓" : "Interested"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/student/event/${event.id}`)}
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}