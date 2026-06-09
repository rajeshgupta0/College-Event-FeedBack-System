import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { feedback_text } = await req.json();
    console.log("Analyzing sentiment for:", feedback_text);

    if (!feedback_text || typeof feedback_text !== "string") {
      throw new Error("Invalid feedback text");
    }
const feedbackText = feedback_text;

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY not configured");
}

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
     body: JSON.stringify({
  contents: [
    {
      parts: [
        {
          text: `
You are a sentiment analysis expert.

Return ONLY JSON:

{
  "sentiment":"Positive",
  "polarity":0.75
}

Analyze this feedback:

"${feedbackText}"
`
        }
      ]
    }
  ]
}),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response:", data);

    const content =
  data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response from AI
    let analysis;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                       content.match(/(\{[\s\S]*?\})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Fallback: basic sentiment detection
      const lowerText = feedbackText.toLowerCase();
      const positiveWords = ["good", "great", "excellent", "amazing", "love", "best", "wonderful", "fantastic"];
      const negativeWords = ["bad", "poor", "terrible", "worst", "hate", "awful", "disappointing"];
      
      const hasPositive = positiveWords.some(word => lowerText.includes(word));
      const hasNegative = negativeWords.some(word => lowerText.includes(word));
      
      if (hasPositive && !hasNegative) {
        analysis = { sentiment: "Positive", polarity: 0.5 };
      } else if (hasNegative && !hasPositive) {
        analysis = { sentiment: "Negative", polarity: -0.5 };
      } else {
        analysis = { sentiment: "Neutral", polarity: 0.0 };
      }
    }

    // Ensure polarity is within bounds
    analysis.polarity = Math.max(-1, Math.min(1, parseFloat(analysis.polarity)));

    console.log("Final analysis:", analysis);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in analyze-sentiment:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
