import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface SentimentData {
  Positive?: number;
  Neutral?: number;
  Negative?: number;
}

interface RatingData {
  rating: number;
  count: number;
}

interface FeedbackChartProps {
  type: "sentiment" | "rating";
  data: SentimentData | RatingData[];
  title?: string;
  description?: string;
}

const SENTIMENT_COLORS = {
  Positive: "hsl(142 76% 36%)",
  Neutral: "hsl(47 84% 63%)",
  Negative: "hsl(0 84% 60%)",
};

export default function FeedbackChart({ type, data, title, description }: FeedbackChartProps) {
  if (type === "sentiment") {
    const sentimentData = data as SentimentData;
    const chartData = [
      { name: "Positive", value: sentimentData.Positive || 0, color: SENTIMENT_COLORS.Positive },
      { name: "Neutral", value: sentimentData.Neutral || 0, color: SENTIMENT_COLORS.Neutral },
      { name: "Negative", value: sentimentData.Negative || 0, color: SENTIMENT_COLORS.Negative },
    ].filter(d => d.value > 0);

    const total = chartData.reduce((sum, d) => sum + d.value, 0);

    if (total === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{title || "Sentiment Distribution"}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No sentiment data available
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title || "Sentiment Distribution"}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  // Rating chart
  const ratingData = data as RatingData[];
  
  if (ratingData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title || "Rating Distribution"}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No rating data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || "Rating Distribution"}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={ratingData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="rating" label={{ value: 'Rating', position: 'bottom' }} />
            <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
