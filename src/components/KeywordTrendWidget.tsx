import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Minus, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Keyword {
  text: string;
  count: number;
  sentiment: "positive" | "negative" | "neutral";
  trend: "rising" | "stable" | "falling";
}

interface KeywordTrendWidgetProps {
  feedbacks: any[];
}

export default function KeywordTrendWidget({ feedbacks }: KeywordTrendWidgetProps) {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeFrame, setTimeFrame] = useState<"week" | "month" | "all">("week");

  useEffect(() => {
    if (feedbacks.length > 0) {
      extractKeywords();
    }
  }, [feedbacks, timeFrame]);

  const getFilteredFeedbacks = () => {
    const now = new Date();
    const filtered = feedbacks.filter(fb => {
      const date = new Date(fb.created_at);
      if (timeFrame === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return date >= weekAgo;
      } else if (timeFrame === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return date >= monthAgo;
      }
      return true;
    });
    return filtered;
  };

  const extractKeywords = async () => {
    setLoading(true);
    try {
      const filtered = getFilteredFeedbacks();
      const feedbackTexts = filtered.map(fb => fb.feedback_text);
      
      if (feedbackTexts.length === 0) {
        setKeywords([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('extract-keywords', {
        body: { feedbackTexts, timeFrame }
      });

      if (error) throw error;

      if (data?.keywords) {
        setKeywords(data.keywords);
      }
    } catch (error: any) {
      console.error('Error extracting keywords:', error);
      toast.error('Failed to extract keywords');
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "rising") return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === "falling") return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getSentimentColor = (sentiment: string) => {
    if (sentiment === "positive") return "bg-green-500/10 text-green-500 border-green-500/20";
    if (sentiment === "negative") return "bg-red-500/10 text-red-500 border-red-500/20";
    return "bg-muted text-muted-foreground border-border";
  };

  const getBarColor = (sentiment: string) => {
    if (sentiment === "positive") return "hsl(var(--chart-1))";
    if (sentiment === "negative") return "hsl(var(--chart-2))";
    return "hsl(var(--chart-3))";
  };

  const chartData = keywords.slice(0, 10).map(k => ({
    keyword: k.text.length > 15 ? k.text.substring(0, 15) + '...' : k.text,
    count: k.count,
    sentiment: k.sentiment,
  }));

  const positiveKeywords = keywords.filter(k => k.sentiment === "positive");
  const negativeKeywords = keywords.filter(k => k.sentiment === "negative");
  const neutralKeywords = keywords.filter(k => k.sentiment === "neutral");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <CardTitle>Keyword Trend Detection</CardTitle>
          </div>
          <Tabs value={timeFrame} onValueChange={(v) => setTimeFrame(v as any)} className="w-auto">
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="all">All Time</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <CardDescription>
          Trending keywords and phrases extracted from feedback using NLP
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Analyzing feedback...</div>
        ) : keywords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No keywords detected yet</div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-500/5 rounded-lg border border-green-500/20">
                <div className="text-2xl font-bold text-green-500">{positiveKeywords.length}</div>
                <div className="text-sm text-muted-foreground">Positive</div>
              </div>
              <div className="text-center p-4 bg-red-500/5 rounded-lg border border-red-500/20">
                <div className="text-2xl font-bold text-red-500">{negativeKeywords.length}</div>
                <div className="text-sm text-muted-foreground">Negative</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg border">
                <div className="text-2xl font-bold">{neutralKeywords.length}</div>
                <div className="text-sm text-muted-foreground">Neutral</div>
              </div>
            </div>

            {/* Bar Chart */}
            <div>
              <h4 className="text-sm font-semibold mb-4">Top 10 Keywords by Frequency</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="keyword" stroke="hsl(var(--foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.sentiment)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Keyword Cloud - New Version without react-wordcloud */}
            <div>
              <h4 className="text-sm font-semibold mb-4">Keyword Cloud</h4>
              <div className="border rounded-xl p-6 bg-muted/20 min-h-[250px] flex items-center justify-center">
                <div className="flex flex-wrap gap-3 justify-center">
                  {keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className={`
                        rounded-full px-3 py-2 font-semibold transition-all duration-300
                        hover:scale-110 cursor-default
                        ${
                          keyword.sentiment === "positive"
                            ? "bg-green-500/10 text-green-500 border border-green-500/20"
                            : keyword.sentiment === "negative"
                            ? "bg-red-500/10 text-red-500 border border-red-500/20"
                            : "bg-primary/10 text-primary border border-primary/20"
                        }
                      `}
                      style={{
                        fontSize: `${Math.min(14 + keyword.count * 2, 32)}px`,
                      }}
                    >
                      {keyword.text}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Keyword List with Trends */}
            <div>
              <h4 className="text-sm font-semibold mb-4">All Keywords with Trend Indicators</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {keywords.map((keyword, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {getTrendIcon(keyword.trend)}
                      <span className="font-medium">{keyword.text}</span>
                      <Badge className={getSentimentColor(keyword.sentiment)} variant="outline">
                        {keyword.sentiment}
                      </Badge>
                    </div>
                    <Badge variant="secondary">{keyword.count}x</Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}