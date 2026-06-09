import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioBase64 } = await req.json();

    if (!audioBase64) {
      return new Response(
        JSON.stringify({ error: 'Audio data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Transcribing audio...');

    // Convert base64 to binary
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // First, transcribe the audio using Lovable AI
    const formData = new FormData();
    const blob = new Blob([bytes], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');

    const transcriptionResponse = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: formData,
    });

    if (transcriptionResponse.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (transcriptionResponse.status === 402) {
      return new Response(
        JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!transcriptionResponse.ok) {
      throw new Error('Failed to transcribe audio');
    }

    const transcriptionData = await transcriptionResponse.json();
    const transcribedText = transcriptionData.text;

    console.log('Transcribed text:', transcribedText);

    // Analyze the transcribed text for emotion and sentiment
    const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: `Analyze this audio feedback transcript for: 1) Emotion tone (angry/frustrated/calm/satisfied), 2) Sentiment (positive/negative/neutral), 3) Urgency level (low/medium/high), 4) Key concerns mentioned. Return JSON with: emotion, sentiment, urgency, concerns (array), transcript. Transcript: "${transcribedText}"`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!analysisResponse.ok) {
      throw new Error('Failed to analyze transcribed text');
    }

    const analysisData = await analysisResponse.json();
    const content = analysisData.choices?.[0]?.message?.content;

    console.log('Analysis response:', content);

    // Parse the analysis
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
        analysis.transcript = transcribedText; // Ensure transcript is included
      } else {
        analysis = {
          transcript: transcribedText,
          emotion: 'neutral',
          sentiment: 'neutral',
          urgency: 'medium',
          concerns: ['Unable to parse specific concerns']
        };
      }
    } catch (parseError) {
      console.error('Failed to parse analysis:', parseError);
      analysis = {
        transcript: transcribedText,
        emotion: 'neutral',
        sentiment: 'neutral',
        urgency: 'medium',
        concerns: ['Manual review required']
      };
    }

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-audio function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});