import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Predefined critical keywords for different severity levels
const CRITICAL_KEYWORDS = {
  emergency: ['emergency', 'urgent', 'immediate', 'critical', 'dangerous', 'unsafe', 'threat', 'harm', 'injury', 'accident'],
  safety: ['safety', 'security', 'risk', 'hazard', 'danger', 'concern', 'warning', 'violence', 'harassment', 'abuse'],
  health: ['sick', 'illness', 'health', 'medical', 'hospital', 'disease', 'infection', 'contamination', 'poison'],
  facility: ['broken', 'damaged', 'leak', 'fire', 'flood', 'electrical', 'malfunction', 'collapse', 'crack'],
  mental: ['depression', 'anxiety', 'stress', 'suicide', 'mental health', 'counseling', 'help', 'struggling']
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { feedbacks } = await req.json();
    
    console.log(`Analyzing ${feedbacks.length} feedbacks for urgent issues...`);
    
    const urgentIssues = feedbacks
      .map((feedback: any) => {
        const text = feedback.feedback_text.toLowerCase();
        const sentiment = feedback.sentiment?.toLowerCase();
        const polarity = feedback.polarity || 0;
        
        // Check for critical keywords
        let matchedKeywords: string[] = [];
        let severity: 'critical' | 'high' | 'medium' = 'medium';
        let category = 'general';
        
        // Check emergency keywords first (highest priority)
        for (const keyword of CRITICAL_KEYWORDS.emergency) {
          if (text.includes(keyword)) {
            matchedKeywords.push(keyword);
            severity = 'critical';
            category = 'emergency';
          }
        }
        
        // Check safety keywords
        if (severity !== 'critical') {
          for (const keyword of CRITICAL_KEYWORDS.safety) {
            if (text.includes(keyword)) {
              matchedKeywords.push(keyword);
              severity = 'high';
              category = 'safety';
            }
          }
        }
        
        // Check health keywords
        if (severity === 'medium') {
          for (const keyword of CRITICAL_KEYWORDS.health) {
            if (text.includes(keyword)) {
              matchedKeywords.push(keyword);
              severity = 'high';
              category = 'health';
            }
          }
        }
        
        // Check facility keywords
        if (severity === 'medium') {
          for (const keyword of CRITICAL_KEYWORDS.facility) {
            if (text.includes(keyword)) {
              matchedKeywords.push(keyword);
              severity = 'high';
              category = 'facility';
            }
          }
        }
        
        // Check mental health keywords
        for (const keyword of CRITICAL_KEYWORDS.mental) {
          if (text.includes(keyword)) {
            matchedKeywords.push(keyword);
            if (severity === 'medium') severity = 'high';
            category = 'mental_health';
          }
        }
        
        // Also flag if sentiment is very negative (polarity < -0.6)
        if (polarity < -0.6 && sentiment === 'negative') {
          if (severity === 'medium') severity = 'high';
          matchedKeywords.push('very negative sentiment');
        }
        
        // Only return if there are matched keywords or very negative sentiment
        if (matchedKeywords.length > 0 || (polarity < -0.6 && sentiment === 'negative')) {
          return {
            id: feedback.id,
            feedback_text: feedback.feedback_text,
            event_name: feedback.event_name,
            user_email: feedback.user_email,
            created_at: feedback.created_at,
            sentiment: feedback.sentiment,
            polarity: feedback.polarity,
            rating: feedback.rating,
            severity,
            category,
            matched_keywords: [...new Set(matchedKeywords)], // Remove duplicates
            requires_immediate_action: severity === 'critical'
          };
        }
        
        return null;
      })
      .filter(Boolean) // Remove null entries
      .sort((a: any, b: any) => {
        // Sort by severity (critical > high > medium) then by date
        const severityOrder: Record<string, number> = { critical: 3, high: 2, medium: 1 };
        const aSeverity = severityOrder[a.severity] || 0;
        const bSeverity = severityOrder[b.severity] || 0;
        if (aSeverity !== bSeverity) {
          return bSeverity - aSeverity;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    
    console.log(`Found ${urgentIssues.length} urgent issues`);
    
    // Generate summary statistics
    const stats = {
      total_urgent: urgentIssues.length,
      critical: urgentIssues.filter((i: any) => i.severity === 'critical').length,
      high: urgentIssues.filter((i: any) => i.severity === 'high').length,
      medium: urgentIssues.filter((i: any) => i.severity === 'medium').length,
      by_category: {
        emergency: urgentIssues.filter((i: any) => i.category === 'emergency').length,
        safety: urgentIssues.filter((i: any) => i.category === 'safety').length,
        health: urgentIssues.filter((i: any) => i.category === 'health').length,
        facility: urgentIssues.filter((i: any) => i.category === 'facility').length,
        mental_health: urgentIssues.filter((i: any) => i.category === 'mental_health').length,
        general: urgentIssues.filter((i: any) => i.category === 'general').length,
      }
    };

    return new Response(
      JSON.stringify({ urgent_issues: urgentIssues, stats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in detect-urgent-issues:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
