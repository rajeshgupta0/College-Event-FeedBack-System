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
    const { studentData, availableEvents } = await req.json();

    if (!studentData || !availableEvents) {
      throw new Error("Missing required data");
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const context = `
Student Profile:
- Department: ${studentData.department || "Not specified"}
- Total Points: ${studentData.total_points || 0}
- Level: ${studentData.level || "Beginner"}
- Events Attended: ${studentData.events_attended || 0}

Interest History:
${
  studentData.interests?.length > 0
    ? studentData.interests
        .map((e: any) => `- ${e.event_name} (${e.event_type})`)
        .join("\n")
    : "- No interests yet"
}

Attendance History:
${
  studentData.attendance?.length > 0
    ? studentData.attendance
        .map(
          (e: any) =>
            `- ${e.event_name} (${e.event_type}) - Attended on ${e.attended_at}`
        )
        .join("\n")
    : "- No attended events yet"
}

Feedback History:
${
  studentData.feedback?.length > 0
    ? studentData.feedback
        .map(
          (f: any) =>
            `- ${f.event_name}: ${f.sentiment} (${
              f.tags?.join(", ") || "no tags"
            })`
        )
        .join("\n")
    : "- No feedback given yet"
}

Available Events:
${availableEvents
  .map(
    (e: any, idx: number) => `
${idx + 1}. ${e.name} (${e.event_type}, ${e.department || "General"})
Description: ${e.description}
Speakers: ${e.speakers?.join(", ") || "TBA"}
Benefits: ${e.benefits?.join(", ") || "N/A"}
Interest Count: ${e.interest_count || 0}
`
  )
  .join("\n")}

Task:
Recommend the TOP 5 events.

Consider:
1. Interest history
2. Attendance history
3. Department match
4. Feedback sentiment
5. Event popularity

Return ONLY valid JSON:

{
  "recommendations": [
    {
      "event_id": "uuid",
      "event_name": "name",
      "reason": "short reason",
      "confidence_score": 0.95,
      "match_factors": ["factor1","factor2"]
    }
  ]
}
`;

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
                  text: context,
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
        "Gemini API Error:",
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

    console.log(
      "Gemini response:",
      JSON.stringify(data, null, 2)
    );

    const aiResponse =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponse) {
      throw new Error("No response from Gemini");
    }

    let recommendations;

    try {
      const jsonMatch =
        aiResponse.match(/```json\s*([\s\S]*?)\s*```/) ||
        aiResponse.match(/```\s*([\s\S]*?)\s*```/);

      const jsonStr = jsonMatch
        ? jsonMatch[1]
        : aiResponse;

      recommendations = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error(
        "Failed to parse Gemini response:",
        aiResponse
      );

      recommendations = {
        recommendations: availableEvents
          .filter(
            (e: any) =>
              !studentData.registered_events?.includes(e.id)
          )
          .sort(
            (a: any, b: any) =>
              (b.interest_count || 0) -
              (a.interest_count || 0)
          )
          .slice(0, 5)
          .map((e: any) => ({
            event_id: e.id,
            event_name: e.name,
            reason: "Popular event that may interest you",
            confidence_score: 0.5,
            match_factors: ["popularity"],
          })),
      };
    }

    return new Response(
      JSON.stringify(recommendations),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in recommend-events:", error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unknown error occurred",
        recommendations: [],
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