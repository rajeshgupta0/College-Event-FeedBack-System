import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, TrendingUp, Calendar, MapPin } from "lucide-react";

interface Event {
  id: string;
  name: string;
  description: string | null;
  event_type: string;
  event_date: string | null;
  venue: string | null;
  poster_url: string | null;
  interest_count?: number;
  is_interested?: boolean;
  is_bookmarked?: boolean;
}

interface EventCardProps {
  event: Event;
  onInterest?: (eventId: string, isInterested: boolean) => void;
  onBookmark?: (eventId: string, isBookmarked: boolean) => void;
  onView?: (eventId: string) => void;
  showActions?: boolean;
}

const eventTypeColors: Record<string, string> = {
  club: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  workshop: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  seminar: "bg-green-500/10 text-green-700 border-green-500/20",
  sports: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  cultural: "bg-pink-500/10 text-pink-700 border-pink-500/20",
  technical: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  hackathon: "bg-red-500/10 text-red-700 border-red-500/20",
  webinar: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20",
};

export default function EventCard({ 
  event, 
  onInterest, 
  onBookmark, 
  onView,
  showActions = true 
}: EventCardProps) {
  const typeColorClass = eventTypeColors[event.event_type] || "bg-muted text-muted-foreground";

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in group">
      <div className="relative h-40 bg-gradient-to-br from-primary/20 to-secondary/20 overflow-hidden">
        {event.poster_url ? (
          <img 
            src={event.poster_url} 
            alt={event.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
          />
        ) : (
          <div className="flex items-center justify-center h-full text-4xl bg-gradient-to-br from-primary/10 to-secondary/10">
            🎉
          </div>
        )}
        {showActions && onBookmark && (
          <Button
            size="icon"
            variant="secondary"
            className="absolute top-2 right-2 opacity-80 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onBookmark(event.id, event.is_bookmarked || false);
            }}
          >
            <Bookmark className={`h-4 w-4 ${event.is_bookmarked ? 'fill-current' : ''}`} />
          </Button>
        )}
      </div>
      <CardContent className="p-4">
        <Badge 
          variant="outline" 
          className={`mb-2 capitalize ${typeColorClass}`}
        >
          {event.event_type}
        </Badge>
        <h3 className="font-semibold text-lg mb-2 line-clamp-1">{event.name}</h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {event.description || "No description available"}
        </p>
        
        <div className="space-y-1 mb-3">
          {event.venue && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {event.venue}
            </p>
          )}
          {event.event_date && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(event.event_date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {event.interest_count || 0} interested
          </span>
          {showActions && (
            <div className="flex gap-2">
              {onInterest && (
                <Button
                  size="sm"
                  variant={event.is_interested ? "secondary" : "default"}
                  onClick={() => onInterest(event.id, event.is_interested || false)}
                >
                  {event.is_interested ? "Interested ✓" : "I'm Interested"}
                </Button>
              )}
              {onView && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onView(event.id)}
                >
                  View
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
