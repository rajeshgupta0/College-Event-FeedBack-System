import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ImageIcon, Mic, Upload, Smile, Meh, Frown, Angry, Heart } from "lucide-react";
import { toast } from "sonner";

const moodOptions = [
  { value: 'very-happy', icon: Smile, label: '😃 Very Happy', color: 'text-green-500' },
  { value: 'happy', icon: Smile, label: '😊 Happy', color: 'text-green-400' },
  { value: 'neutral', icon: Meh, label: '😐 Neutral', color: 'text-yellow-500' },
  { value: 'unhappy', icon: Frown, label: '😕 Unhappy', color: 'text-orange-500' },
  { value: 'very-unhappy', icon: Angry, label: '😡 Very Unhappy', color: 'text-red-500' }
];

const feedbackTags = [
  '#Speaker', '#Venue', '#Timing', '#Content', '#Decoration', '#Food', '#Management', '#Organization'
];

export default function FeedbackSubmit() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [mood, setMood] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [ratings, setRatings] = useState({
    content: 3,
    speaker: 3,
    management: 3,
    venue: 3,
    timing: 3,
    audiovisual: 3
  });
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [sentimentPreview, setSentimentPreview] = useState("");
  const [mediaConsent, setMediaConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (feedbackText.length > 20) {
      analyzeSentiment();
    } else {
      setSentimentPreview("");
    }
  }, [feedbackText]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }
    setUser(session.user);
    if (eventId) {
      const { data } = await supabase.from('events').select('*').eq('id', eventId).single();
      setEvent(data);
    }
  };

  const analyzeSentiment = async () => {
    try {
      const { data } = await supabase.functions.invoke('analyze-sentiment', {
        body: { feedback_text: feedbackText }
      });
      if (data?.sentiment) {
        const emoji = data.sentiment === 'Positive' ? '😊' : data.sentiment === 'Negative' ? '😟' : '😐';
        setSentimentPreview(`Your feedback seems ${data.sentiment.toLowerCase()} ${emoji}`);
      }
    } catch (error) {
      console.error('Sentiment analysis error:', error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      toast.info("Recording started");
    } catch (error) {
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      toast.success("Recording stopped");
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!user || !eventId || !feedbackText.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);

    try {
      let imageUrl = null;
      let audioUrl = null;
      let imageAnalysis = null;
      let audioAnalysis = null;

      // Upload image
      if (image) {
        const imageExt = image.name.split('.').pop();
        const imagePath = `${user.id}/${Date.now()}.${imageExt}`;
        const { error: uploadError } = await supabase.storage
          .from('feedback-images')
          .upload(imagePath, image);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('feedback-images')
            .getPublicUrl(imagePath);
          imageUrl = publicUrl;

          const { data: analysisData } = await supabase.functions.invoke('analyze-image', {
            body: { imageUrl }
          });
          imageAnalysis = analysisData;
        }
      }

      // Upload audio
      if (audioBlob) {
        const audioPath = `${user.id}/${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage
          .from('feedback-audio')
          .upload(audioPath, audioBlob);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('feedback-audio')
            .getPublicUrl(audioPath);
          audioUrl = publicUrl;

          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            const { data: analysisData } = await supabase.functions.invoke('analyze-audio', {
              body: { audioBase64: base64Audio }
            });
            audioAnalysis = analysisData;
          };
        }
      }

      // Analyze sentiment
      const { data: sentimentData } = await supabase.functions.invoke('analyze-sentiment', {
        body: { feedback_text: feedbackText }
      });

      // Insert feedback
      const { data: feedbackData, error: feedbackError } = await supabase.from('feedback').insert({
        user_id: user.id,
        event_id: eventId,
        feedback_text: feedbackText,
        sentiment: sentimentData?.sentiment,
        polarity: sentimentData?.polarity,
        image_url: imageUrl,
        audio_url: audioUrl,
        image_analysis: imageAnalysis,
        audio_analysis: audioAnalysis,
        is_anonymous: isAnonymous,
        tags: selectedTags,
        mood_rating: mood
      }).select().single();

      if (feedbackError) throw feedbackError;

      // Add media to highlights wall if consent given
      if ((imageUrl || audioUrl) && mediaConsent && feedbackData) {
        await supabase.from('media_from_feedback').insert({
          event_id: eventId,
          feedback_id: feedbackData.id,
          user_id: user.id,
          file_url: imageUrl || audioUrl!,
          file_type: imageUrl ? 'photo' : 'video',
          consent_given: true
        });
      }

      // Insert ratings
      if (feedbackData) {
        await supabase.from('feedback_ratings').insert({
          feedback_id: feedbackData.id,
          content_rating: ratings.content,
          speaker_rating: ratings.speaker,
          management_rating: ratings.management,
          venue_rating: ratings.venue,
          timing_rating: ratings.timing,
          audiovisual_rating: ratings.audiovisual
        });
      }

      // Award points
      const { data: existingPoints } = await supabase
        .from('student_points')
        .select('total_points')
        .eq('student_id', user.id)
        .single();

      if (existingPoints) {
        await supabase
          .from('student_points')
          .update({ total_points: existingPoints.total_points + 20 })
          .eq('student_id', user.id);
      } else {
        await supabase.from('student_points').insert({ 
          student_id: user.id, 
          total_points: 20 
        });
      }

      toast.success("Feedback submitted! +20 points 🎉");
      navigate('/student');
    } catch (error: any) {
      toast.error(error.message || "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <nav className="bg-card border-b sticky top-0 z-50 backdrop-blur-sm bg-card/80">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Submit Feedback</h1>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {event && (
          <Card className="mb-6 animate-fade-in">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold mb-2">{event.name}</h2>
              <p className="text-muted-foreground">{event.description}</p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {/* Mood Selection */}
          <Card>
            <CardHeader>
              <CardTitle>How did you feel about this event?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-3">
                {moodOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setMood(option.value)}
                    className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                      mood === option.value
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className={`text-4xl mb-2 ${option.color}`}>{option.label.split(' ')[0]}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ratings */}
          <Card>
            <CardHeader>
              <CardTitle>Rate Different Aspects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(ratings).map(([key, value]) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="capitalize">{key}</Label>
                    <span className="text-sm font-medium">{value}/5</span>
                  </div>
                  <Slider
                    value={[value]}
                    onValueChange={(v) => setRatings(prev => ({ ...prev, [key]: v[0] }))}
                    min={1}
                    max={5}
                    step={1}
                    className="w-full"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Feedback Text */}
          <Card>
            <CardHeader>
              <CardTitle>Share Your Experience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Tell us about your experience..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows={6}
                className="resize-none"
              />
              {sentimentPreview && (
                <p className="text-sm text-muted-foreground animate-fade-in">{sentimentPreview}</p>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Add Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {feedbackTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer hover-scale"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Media Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Add Photos or Audio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="image-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed rounded-lg p-6 hover:border-primary transition-colors text-center">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded" />
                    ) : (
                      <>
                        <ImageIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Click to upload image</p>
                      </>
                    )}
                  </div>
                </Label>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant={isRecording ? "destructive" : "outline"}
                  onClick={isRecording ? stopRecording : startRecording}
                  className="flex-1"
                >
                  <Mic className="mr-2 h-4 w-4" />
                  {isRecording ? "Stop Recording" : "Record Audio"}
                </Button>
                {audioBlob && (
                  <Button variant="ghost" onClick={() => setAudioBlob(null)}>
                    Remove
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Anonymous */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="anonymous" className="text-base font-medium">Submit Anonymously</Label>
                  <p className="text-sm text-muted-foreground">Your identity will be hidden</p>
                </div>
                <Switch
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !feedbackText.trim() || !mood}
            size="lg"
            className="w-full"
          >
            {submitting ? "Submitting..." : "Submit Feedback (+20 Points)"}
          </Button>
        </div>
      </div>
    </div>
  );
}