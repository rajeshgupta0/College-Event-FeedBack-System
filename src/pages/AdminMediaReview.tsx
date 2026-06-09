import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Check, X, Image as ImageIcon, Video, Pin } from "lucide-react";

interface MediaItem {
  id: string;
  event_id: string;
  feedback_id: string;
  user_id: string;
  file_url: string;
  file_type: string;
  consent_given: boolean;
  status: string;
  caption: string | null;
  is_anonymous: boolean;
  is_pinned: boolean;
  created_at: string;
  events: { name: string };
  feedback: { feedback_text: string };
  profiles: { full_name: string; email: string };
}

const AdminMediaReview = () => {
  const [pendingMedia, setPendingMedia] = useState<MediaItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [caption, setCaption] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingMedia();
  }, []);

  const fetchPendingMedia = async () => {
    try {
      const { data, error } = await supabase
        .from('media_from_feedback')
        .select(`
          *,
          events (name),
          feedback (feedback_text),
          profiles:user_id (full_name, email)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingMedia(data as any || []);
    } catch (error: any) {
      console.error('Error fetching pending media:', error);
      toast.error('Failed to load pending media');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedMedia) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('media_from_feedback')
        .update({
          status: 'approved',
          caption: caption || null,
          is_anonymous: isAnonymous,
          is_pinned: isPinned,
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', selectedMedia.id);

      if (error) throw error;

      toast.success('Media approved successfully!');
      setSelectedMedia(null);
      setCaption("");
      setIsAnonymous(false);
      setIsPinned(false);
      fetchPendingMedia();
    } catch (error: any) {
      console.error('Error approving media:', error);
      toast.error('Failed to approve media');
    }
  };

  const handleReject = async (mediaId: string) => {
    try {
      const { error } = await supabase
        .from('media_from_feedback')
        .update({ status: 'rejected' })
        .eq('id', mediaId);

      if (error) throw error;

      toast.success('Media rejected');
      fetchPendingMedia();
    } catch (error: any) {
      console.error('Error rejecting media:', error);
      toast.error('Failed to reject media');
    }
  };

  const selectMedia = (media: MediaItem) => {
    setSelectedMedia(media);
    setCaption(media.caption || "");
    setIsAnonymous(media.is_anonymous);
    setIsPinned(media.is_pinned);
  };

  return (
    <AdminLayout title="Media Review Queue" description="Review and approve student-submitted media for the Event Highlights Wall">
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : pendingMedia.length === 0 ? (
            <p className="text-muted-foreground">No pending media to review</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Media List */}
              <div className="space-y-4">
                {pendingMedia.map((media) => (
                  <Card
                    key={media.id}
                    className={`cursor-pointer transition-all ${
                      selectedMedia?.id === media.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => selectMedia(media)}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                            {media.file_type === 'photo' ? (
                              <img src={media.file_url} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                              <Video className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold">{media.events.name}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {media.feedback.feedback_text}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {media.file_type}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {(media as any).profiles?.full_name || 'Unknown'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Review Panel */}
                {selectedMedia && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Review Media</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Preview */}
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                        {selectedMedia.file_type === 'photo' ? (
                          <img src={selectedMedia.file_url} alt="Full preview" className="max-w-full max-h-full object-contain" />
                        ) : (
                          <video src={selectedMedia.file_url} controls className="max-w-full max-h-full" />
                        )}
                      </div>

                      {/* Event & Feedback Info */}
                      <div>
                        <p className="text-sm font-medium">Event: {selectedMedia.events.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Feedback: {selectedMedia.feedback.feedback_text}
                        </p>
                      </div>

                      {/* Caption */}
                      <div>
                        <Label htmlFor="caption">Caption (optional)</Label>
                        <Textarea
                          id="caption"
                          value={caption}
                          onChange={(e) => setCaption(e.target.value)}
                          placeholder="Add a caption for this media..."
                          rows={3}
                        />
                      </div>

                      {/* Options */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="anonymous">Anonymous Upload</Label>
                          <Switch
                            id="anonymous"
                            checked={isAnonymous}
                            onCheckedChange={setIsAnonymous}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {isAnonymous ? "Show as 'Anonymous Participant'" : `Show as '${(selectedMedia as any).profiles?.full_name}'`}
                        </p>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="pinned" className="flex items-center gap-2">
                            <Pin className="h-4 w-4" />
                            Pin as Featured
                          </Label>
                          <Switch
                            id="pinned"
                            checked={isPinned}
                            onCheckedChange={setIsPinned}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button onClick={handleApprove} className="flex-1">
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleReject(selectedMedia.id)}
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
    </AdminLayout>
  );
};

export default AdminMediaReview;