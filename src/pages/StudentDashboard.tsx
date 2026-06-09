import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LogOut, Send, Star, Image as ImageIcon, Mic, X, Upload } from "lucide-react";

interface Event {
  id: string;
  name: string;
  event_type: string;
  description: string | null;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    checkAuth();
    fetchEvents();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    }
  };

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load events");
    } else {
      setEvents(data || []);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
        setAudioFile(file);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      toast.error("Failed to access microphone");
      console.error(error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success("Recording stopped");
    }
  };

  const removeAudio = () => {
    setAudioFile(null);
    setAudioUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEvent || !feedbackText.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let imageUrl = "";
      let imageAnalysis = null;
      let audioUrlStored = "";
      let audioAnalysis = null;

      // Upload and analyze image if provided
      if (imageFile) {
        toast.info("Uploading and analyzing image...");
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('feedback-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('feedback-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;

        // Analyze the image
        const { data: imageAnalysisData, error: imageAnalysisError } = await supabase.functions.invoke(
          'analyze-image',
          { body: { imageUrl } }
        );

        if (imageAnalysisError) {
          console.error("Image analysis error:", imageAnalysisError);
          toast.error("Image uploaded but analysis failed");
        } else {
          imageAnalysis = imageAnalysisData.analysis;
          toast.success("Image analyzed successfully");
        }
      }

      // Upload and analyze audio if provided
      if (audioFile) {
        toast.info("Uploading and analyzing audio...");
        const fileName = `${user.id}/${Date.now()}.webm`;
        
        const { error: uploadError } = await supabase.storage
          .from('feedback-audio')
          .upload(fileName, audioFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('feedback-audio')
          .getPublicUrl(fileName);

        audioUrlStored = publicUrl;

        // Convert audio to base64 for analysis
        const reader = new FileReader();
        const audioBase64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(audioFile);
        });

        // Analyze the audio
        const { data: audioAnalysisData, error: audioAnalysisError } = await supabase.functions.invoke(
          'analyze-audio',
          { body: { audioBase64 } }
        );

        if (audioAnalysisError) {
          console.error("Audio analysis error:", audioAnalysisError);
          toast.error("Audio uploaded but analysis failed");
        } else {
          audioAnalysis = audioAnalysisData.analysis;
          toast.success("Audio analyzed successfully");
        }
      }

      // Analyze sentiment from text
      toast.info("Analyzing feedback sentiment...");
      const { data: sentimentData, error: sentimentError } = await supabase.functions.invoke(
        "analyze-sentiment",
        {
          body: { feedback_text: feedbackText },
        }
      );

      if (sentimentError) throw sentimentError;

      // Insert feedback with all data
      const { error: insertError } = await supabase.from("feedback").insert({
        user_id: user.id,
        event_id: selectedEvent,
        feedback_text: feedbackText,
        rating: rating || null,
        sentiment: sentimentData.sentiment,
        polarity: sentimentData.polarity,
        image_url: imageUrl || null,
        image_analysis: imageAnalysis,
        audio_url: audioUrlStored || null,
        audio_analysis: audioAnalysis,
      });

      if (insertError) throw insertError;

      toast.success("Feedback submitted successfully!");
      setFeedbackText("");
      setRating(0);
      setSelectedEvent("");
      removeImage();
      removeAudio();
    } catch (error: any) {
      console.error("Submit error:", error);
      toast.error(error.message || "Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Student Feedback Portal</h1>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Submit Feedback</CardTitle>
              <CardDescription>
                Share your experience about college events and club activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="event">Select Event</Label>
                  <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an event..." />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Rating (Optional)</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-8 w-8 ${
                            star <= (hoveredRating || rating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback">Your Feedback</Label>
                  <Textarea
                    id="feedback"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Share your thoughts about the event..."
                    rows={6}
                    required
                  />
                </div>

                <div className="space-y-4">
                  <Label>Attachments (Optional)</Label>
                  
                  {/* Image Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="image" className="text-sm text-muted-foreground">
                      <ImageIcon className="inline h-4 w-4 mr-1" />
                      Upload Image (max 5MB)
                    </Label>
                    {!imagePreview ? (
                      <div className="flex gap-2">
                        <Input
                          id="image"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImageChange}
                          className="cursor-pointer"
                        />
                      </div>
                    ) : (
                      <div className="relative inline-block">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="max-w-xs rounded-lg border-2 border-primary/20"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={removeImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Audio Recording */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      <Mic className="inline h-4 w-4 mr-1" />
                      Record Audio Feedback (max 10MB)
                    </Label>
                    {!audioUrl ? (
                      <Button
                        type="button"
                        variant={isRecording ? "destructive" : "outline"}
                        onClick={isRecording ? stopRecording : startRecording}
                        className="w-full"
                      >
                        <Mic className="mr-2 h-4 w-4" />
                        {isRecording ? "Stop Recording" : "Start Recording"}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <audio controls src={audioUrl} className="flex-1" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={removeAudio}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {(imageFile || audioFile) && (
                    <div className="text-sm text-muted-foreground p-3 bg-primary/5 rounded-lg">
                      <Upload className="inline h-4 w-4 mr-1" />
                      AI will analyze your {imageFile && "image"}
                      {imageFile && audioFile && " and "}
                      {audioFile && "audio"} for insights
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  <Send className="mr-2 h-4 w-4" />
                  {loading ? "Submitting..." : "Submit Feedback"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
