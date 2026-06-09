const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY not configured");
}

const aiResponse = await fetch(
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

${userPrompt}

Generate:
1. Overall Event Performance (score out of 10)
2. Key Strengths
3. Areas for Improvement
4. Sentiment Analysis
5. Actionable Recommendations
6. Comparison Insights

Return a detailed, professional report.`
            }
          ]
        }
      ]
    }),
  }
);

if (!aiResponse.ok) {
  const errorText = await aiResponse.text();
  console.error("Gemini API error:", aiResponse.status, errorText);
  throw new Error(`Gemini API error: ${aiResponse.status}`);
}

const aiData = await aiResponse.json();

console.log("Gemini response:", JSON.stringify(aiData, null, 2));

const summary =
  aiData.candidates?.[0]?.content?.parts?.[0]?.text ||
  "No summary generated";