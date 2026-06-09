import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Calendar, Image, Music, MessageSquare } from "lucide-react";
import { useState, useMemo } from "react";
import { format, startOfWeek, startOfMonth, startOfDay, subDays, subWeeks, subMonths } from "date-fns";

interface Feedback {
  id: string;
  feedback_text: string;
  sentiment: string | null;
  polarity: number | null;
  created_at: string;
  event_id: string;
  event_name: string;
  image_url: string | null;
  audio_url: string | null;
}

interface SentimentTrendChartProps {
  feedbacks: Feedback[];
}

const SentimentTrendChart = ({ feedbacks }: SentimentTrendChartProps) => {
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("month");
  const [selectedEvent, setSelectedEvent] = useState<string>("all");

  // Get unique events
  const events = useMemo(() => {
    const uniqueEvents = new Map<string, string>();
    feedbacks.forEach(fb => {
      if (fb.event_id && fb.event_name) {
        uniqueEvents.set(fb.event_id, fb.event_name);
      }
    });
    return Array.from(uniqueEvents.entries()).map(([id, name]) => ({ id, name }));
  }, [feedbacks]);

  // Filter feedbacks by time range
  const filteredByTime = useMemo(() => {
    const now = new Date();
    let cutoffDate: Date;

    switch (timeRange) {
      case "week":
        cutoffDate = subWeeks(now, 1);
        break;
      case "month":
        cutoffDate = subMonths(now, 1);
        break;
      default:
        cutoffDate = subMonths(now, 12); // Last year for "all"
    }

    return feedbacks.filter(fb => new Date(fb.created_at) >= cutoffDate);
  }, [feedbacks, timeRange]);

  // Filter by event
  const filteredFeedbacks = useMemo(() => {
    if (selectedEvent === "all") return filteredByTime;
    return filteredByTime.filter(fb => fb.event_id === selectedEvent);
  }, [filteredByTime, selectedEvent]);

  // Calculate sentiment trends over time
  const sentimentOverTime = useMemo(() => {
    const groupedByDate = new Map<string, { positive: number; neutral: number; negative: number; total: number }>();

    filteredFeedbacks.forEach(fb => {
      const date = timeRange === "week" 
        ? format(startOfDay(new Date(fb.created_at)), "MMM dd")
        : format(startOfWeek(new Date(fb.created_at)), "MMM dd");

      if (!groupedByDate.has(date)) {
        groupedByDate.set(date, { positive: 0, neutral: 0, negative: 0, total: 0 });
      }

      const group = groupedByDate.get(date)!;
      group.total++;

      const sentiment = fb.sentiment?.toLowerCase() || "neutral";
      if (sentiment.includes("positive")) group.positive++;
      else if (sentiment.includes("negative")) group.negative++;
      else group.neutral++;
    });

    return Array.from(groupedByDate.entries())
      .map(([date, counts]) => ({
        date,
        Positive: Math.round((counts.positive / counts.total) * 100),
        Neutral: Math.round((counts.neutral / counts.total) * 100),
        Negative: Math.round((counts.negative / counts.total) * 100),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredFeedbacks, timeRange]);

  // Calculate sentiment by event
  const sentimentByEvent = useMemo(() => {
    const groupedByEvent = new Map<string, { positive: number; neutral: number; negative: number; total: number }>();

    filteredFeedbacks.forEach(fb => {
      const eventName = fb.event_name || "Unknown Event";

      if (!groupedByEvent.has(eventName)) {
        groupedByEvent.set(eventName, { positive: 0, neutral: 0, negative: 0, total: 0 });
      }

      const group = groupedByEvent.get(eventName)!;
      group.total++;

      const sentiment = fb.sentiment?.toLowerCase() || "neutral";
      if (sentiment.includes("positive")) group.positive++;
      else if (sentiment.includes("negative")) group.negative++;
      else group.neutral++;
    });

    return Array.from(groupedByEvent.entries())
      .map(([event, counts]) => ({
        event: event.length > 20 ? event.substring(0, 20) + "..." : event,
        Positive: counts.positive,
        Neutral: counts.neutral,
        Negative: counts.negative,
      }))
      .slice(0, 10); // Top 10 events
  }, [filteredFeedbacks]);

  // Calculate sentiment by feedback type
  const sentimentByType = useMemo(() => {
    const types = {
      textOnly: { positive: 0, neutral: 0, negative: 0, total: 0 },
      withImage: { positive: 0, neutral: 0, negative: 0, total: 0 },
      withAudio: { positive: 0, neutral: 0, negative: 0, total: 0 },
    };

    filteredFeedbacks.forEach(fb => {
      const sentiment = fb.sentiment?.toLowerCase() || "neutral";
      
      let type: "textOnly" | "withImage" | "withAudio";
      if (fb.image_url) type = "withImage";
      else if (fb.audio_url) type = "withAudio";
      else type = "textOnly";

      types[type].total++;
      if (sentiment.includes("positive")) types[type].positive++;
      else if (sentiment.includes("negative")) types[type].negative++;
      else types[type].neutral++;
    });

    return [
      {
        type: "Text Only",
        icon: "text",
        Positive: types.textOnly.total ? Math.round((types.textOnly.positive / types.textOnly.total) * 100) : 0,
        Neutral: types.textOnly.total ? Math.round((types.textOnly.neutral / types.textOnly.total) * 100) : 0,
        Negative: types.textOnly.total ? Math.round((types.textOnly.negative / types.textOnly.total) * 100) : 0,
        count: types.textOnly.total,
      },
      {
        type: "With Image",
        icon: "image",
        Positive: types.withImage.total ? Math.round((types.withImage.positive / types.withImage.total) * 100) : 0,
        Neutral: types.withImage.total ? Math.round((types.withImage.neutral / types.withImage.total) * 100) : 0,
        Negative: types.withImage.total ? Math.round((types.withImage.negative / types.withImage.total) * 100) : 0,
        count: types.withImage.total,
      },
      {
        type: "With Audio",
        icon: "audio",
        Positive: types.withAudio.total ? Math.round((types.withAudio.positive / types.withAudio.total) * 100) : 0,
        Neutral: types.withAudio.total ? Math.round((types.withAudio.neutral / types.withAudio.total) * 100) : 0,
        Negative: types.withAudio.total ? Math.round((types.withAudio.negative / types.withAudio.total) * 100) : 0,
        count: types.withAudio.total,
      },
    ].filter(type => type.count > 0);
  }, [filteredFeedbacks]);

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Sentiment Trend Analysis
            </CardTitle>
            <CardDescription>
              Track sentiment changes over time and across different channels
            </CardDescription>
          </div>
          <div className="flex gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Time Range</Label>
              <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Event</Label>
              <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="timeline" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline">
              <Calendar className="h-4 w-4 mr-2" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="events">
              <TrendingUp className="h-4 w-4 mr-2" />
              By Event
            </TabsTrigger>
            <TabsTrigger value="types">
              <MessageSquare className="h-4 w-4 mr-2" />
              By Type
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-4">
            {sentimentOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={sentimentOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Positive" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="Neutral" stroke="#6b7280" strokeWidth={2} />
                  <Line type="monotone" dataKey="Negative" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                No data available for the selected filters
              </div>
            )}
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            {sentimentByEvent.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={sentimentByEvent}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="event" />
                  <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Positive" fill="#10b981" />
                  <Bar dataKey="Neutral" fill="#6b7280" />
                  <Bar dataKey="Negative" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                No data available for the selected filters
              </div>
            )}
          </TabsContent>

          <TabsContent value="types" className="space-y-4">
            {sentimentByType.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {sentimentByType.map(type => (
                    <Card key={type.type}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          {type.icon === "text" && <MessageSquare className="h-4 w-4" />}
                          {type.icon === "image" && <Image className="h-4 w-4" />}
                          {type.icon === "audio" && <Music className="h-4 w-4" />}
                          {type.type}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold mb-2">{type.count}</div>
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-green-600">Positive:</span>
                            <span className="font-semibold">{type.Positive}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Neutral:</span>
                            <span className="font-semibold">{type.Neutral}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-red-600">Negative:</span>
                            <span className="font-semibold">{type.Negative}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sentimentByType} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" label={{ value: 'Percentage (%)', position: 'insideBottom', offset: -5 }} />
                    <YAxis type="category" dataKey="type" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Positive" fill="#10b981" />
                    <Bar dataKey="Neutral" fill="#6b7280" />
                    <Bar dataKey="Negative" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                No data available for the selected filters
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SentimentTrendChart;