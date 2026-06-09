import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Bell, Shield, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface UrgentIssue {
  id: string;
  feedback_text: string;
  event_name: string;
  user_email: string;
  created_at: string;
  sentiment: string;
  polarity: number;
  rating: number | null;
  severity: "critical" | "high" | "medium";
  category: string;
  matched_keywords: string[];
  requires_immediate_action: boolean;
}

interface UrgentIssueStats {
  total_urgent: number;
  critical: number;
  high: number;
  medium: number;
  by_category: {
    emergency: number;
    safety: number;
    health: number;
    facility: number;
    mental_health: number;
    general: number;
  };
}

interface UrgentIssueWidgetProps {
  feedbacks: any[];
}

export default function UrgentIssueWidget({ feedbacks }: UrgentIssueWidgetProps) {
  const [urgentIssues, setUrgentIssues] = useState<UrgentIssue[]>([]);
  const [stats, setStats] = useState<UrgentIssueStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (feedbacks.length > 0) {
      detectUrgentIssues();
    }
  }, [feedbacks]);

  const detectUrgentIssues = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-urgent-issues', {
        body: { feedbacks }
      });

      if (error) throw error;

      if (data?.urgent_issues) {
        setUrgentIssues(data.urgent_issues);
        setStats(data.stats);
        
        // Show toast notification for critical issues
        const criticalCount = data.urgent_issues.filter((i: UrgentIssue) => i.severity === 'critical').length;
        if (criticalCount > 0) {
          toast.error(`${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} detected! Immediate action required.`, {
            duration: 10000,
          });
        }
      }
    } catch (error: any) {
      console.error('Error detecting urgent issues:', error);
      toast.error('Failed to detect urgent issues');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    if (severity === "critical") return "bg-red-500 text-white";
    if (severity === "high") return "bg-orange-500 text-white";
    return "bg-yellow-500 text-white";
  };

  const getCategoryIcon = (category: string) => {
    if (category === "emergency") return "🚨";
    if (category === "safety") return "🛡️";
    if (category === "health") return "🏥";
    if (category === "facility") return "🔧";
    if (category === "mental_health") return "💭";
    return "📋";
  };

  const getCategoryLabel = (category: string) => {
    return category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <Card className="border-red-500/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <CardTitle>Urgent Issue Detection System</CardTitle>
        </div>
        <CardDescription>
          Auto-flagged emergency feedback requiring immediate attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Scanning for urgent issues...</div>
        ) : urgentIssues.length === 0 ? (
          <Alert className="bg-green-500/10 border-green-500/20">
            <Shield className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-500">All Clear</AlertTitle>
            <AlertDescription>No urgent issues detected at this time</AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Stats Overview */}
            {stats && (
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg border">
                  <div className="text-2xl font-bold">{stats.total_urgent}</div>
                  <div className="text-sm text-muted-foreground">Total Urgent</div>
                </div>
                <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                  <div className="text-2xl font-bold text-red-500">{stats.critical}</div>
                  <div className="text-sm text-muted-foreground">Critical</div>
                </div>
                <div className="text-center p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <div className="text-2xl font-bold text-orange-500">{stats.high}</div>
                  <div className="text-sm text-muted-foreground">High</div>
                </div>
                <div className="text-center p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <div className="text-2xl font-bold text-yellow-500">{stats.medium}</div>
                  <div className="text-sm text-muted-foreground">Medium</div>
                </div>
              </div>
            )}

            {/* Category Breakdown */}
            {stats && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Issues by Category
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(stats.by_category).map(([category, count]) => (
                    count > 0 && (
                      <div key={category} className="flex items-center justify-between p-2 bg-muted/30 rounded border text-sm">
                        <span className="flex items-center gap-2">
                          <span>{getCategoryIcon(category)}</span>
                          <span>{getCategoryLabel(category)}</span>
                        </span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Critical Alerts */}
            {urgentIssues.filter(i => i.severity === 'critical').length > 0 && (
              <Alert variant="destructive" className="animate-pulse">
                <Bell className="h-4 w-4" />
                <AlertTitle>Critical Issues Require Immediate Action!</AlertTitle>
                <AlertDescription>
                  {urgentIssues.filter(i => i.severity === 'critical').length} critical issue(s) detected. 
                  Please review and respond immediately.
                </AlertDescription>
              </Alert>
            )}

            {/* Urgent Issues List */}
            <div>
              <h4 className="text-sm font-semibold mb-3">Flagged Issues (Most Urgent First)</h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {urgentIssues.map((issue) => (
                  <div 
                    key={issue.id} 
                    className={`p-4 rounded-lg border-2 ${
                      issue.severity === 'critical' 
                        ? 'border-red-500 bg-red-500/5' 
                        : issue.severity === 'high'
                        ? 'border-orange-500 bg-orange-500/5'
                        : 'border-yellow-500 bg-yellow-500/5'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(issue.severity)}>
                          {issue.severity.toUpperCase()}
                        </Badge>
                        <span className="text-lg">{getCategoryIcon(issue.category)}</span>
                        <span className="text-sm font-medium">{getCategoryLabel(issue.category)}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(issue.created_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium">"{issue.feedback_text}"</p>
                      
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="text-muted-foreground">Event: {issue.event_name}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">User: {issue.user_email}</span>
                        {issue.rating && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">Rating: {issue.rating}/5</span>
                          </>
                        )}
                      </div>

                      {issue.matched_keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {issue.matched_keywords.map((keyword, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
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
