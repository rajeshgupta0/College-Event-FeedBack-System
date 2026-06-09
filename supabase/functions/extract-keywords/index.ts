import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { feedbackTexts, timeFrame } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const combinedText = feedbackTexts.join("\n");

    const systemPrompt = `
You are a keyword extraction expert.

Analyze the feedback texts and extract the top trending keywords/phrases (maximum 20).

For each keyword determine:
1. The keyword/phrase itself
2. Frequency (how many times it appears or is implied)
3. Sentiment category (positive, negative, or neutral)
4. Trend indicator (rising, stable, or falling)

Return ONLY valid JSON.

Example:

{
  "keywords": [
    {
      "text": "workshop",
      "count": 15,
      "sentiment": "positive",
      "trend": "rising"
    }
  ]
}
`;

    console.log("Calling Gemini AI for keyword extraction...");

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
                  text: `${systemPrompt}

Analyze these feedback texts and extract trending keywords:

${combinedText}

Return ONLY valid JSON.
Do not return markdown.
Do not return explanations.
`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "Gemini AI error:",
        response.status,
        errorText
      );

      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again later.",
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();

    console.log("Gemini response:", JSON.stringify(data, null, 2));

    const content =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No content in Gemini response");
    }

    let keywords = [];

    try {
      const jsonMatch =
        content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
        content.match(/(\{[\s\S]*\})/);

      const jsonStr = jsonMatch ? jsonMatch[1] : content;

      const parsed = JSON.parse(jsonStr);

      keywords = parsed.keywords || [];
    } catch (parseError) {
      console.error(
        "Failed to parse Gemini response:",
        content
      );

      keywords = [];
    }

    return new Response(
      JSON.stringify({ keywords }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in extract-keywords:", error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});