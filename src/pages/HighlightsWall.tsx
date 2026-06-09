import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Heart, MessageCircle, Pin, Image as ImageIcon, Video, Send } from "lucide-react";

interface MediaItem {
  id: string;
  event_id: string;
  file_url: string;
  file_type: string;
  caption: string | null;
  is_anonymous: boolean;
  is_pinned: boolean;
  created_at: string;
  events: { name: string };
  profiles?: { full_name: string };
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
}

interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  profiles: { full_name: string };
}

const HighlightsWall = () => {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchMedia();
  }, [eventId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
    setCurrentUserId(user?.id || null);
  };

  const fetchMedia = async () => {
    try {
      let query = supabase
        .from('media_from_feedback')
        .select(`
          *,
          events (name),
          profiles:user_id (full_name)
        `)
        .eq('status', 'approved')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      const { data: mediaData, error } = await query;
      if (error) throw error;

      // Fetch likes and comments count for each media
      const mediaWithCounts = await Promise.all(
        (mediaData || []).map(async (item: any) => {
          const { count: likesCount } = await supabase
            .from('media_likes')
            .select('*', { count: 'exact', head: true })
            .eq('media_id', item.id);

          const { count: commentsCount } = await supabase
            .from('media_comments')
            .select('*', { count: 'exact', head: true })
            .eq('media_id', item.id);

          const { data: userLike } = await supabase
            .from('media_likes')
            .select('id')
            .eq('media_id', item.id)
            .eq('user_id', currentUserId || '')
            .maybeSingle();

          return {
            ...item,
            likes_count: likesCount || 0,
            comments_count: commentsCount || 0,
            user_liked: !!userLike,
          };
        })
      );

      setMedia(mediaWithCounts);
    } catch (error: any) {
      console.error('Error fetching media:', error);
      toast.error('Failed to load highlights');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (mediaId: string) => {
    try {
      const { data, error } = await supabase
        .from('media_comments')
        .select(`
          *,
          profiles:user_id (full_name)
        `)
        .eq('media_id', mediaId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data as any || []);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleLike = async (mediaId: string) => {
    if (!isAuthenticated) {
      toast.error('Please login to like posts');
      return;
    }

    try {
      const mediaItem = media.find(m => m.id === mediaId);
      if (!mediaItem) return;

      if (mediaItem.user_liked) {
        // Unlike
        await supabase
          .from('media_likes')
          .delete()
          .eq('media_id', mediaId)
          .eq('user_id', currentUserId!);
      } else {
        // Like
        await supabase
          .from('media_likes')
          .insert({ media_id: mediaId, user_id: currentUserId! });
      }

      fetchMedia(); // Refresh to update like counts
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const handleComment = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to comment');
      return;
    }

    if (!selectedMedia || !newComment.trim()) return;

    try {
      await supabase
        .from('media_comments')
        .insert({
          media_id: selectedMedia.id,
          user_id: currentUserId!,
          comment_text: newComment.trim(),
        });

      setNewComment("");
      fetchComments(selectedMedia.id);
      fetchMedia(); // Refresh to update comment counts
      toast.success('Comment added!');
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const openMedia = (item: MediaItem) => {
    setSelectedMedia(item);
    fetchComments(item.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading highlights...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Event Highlights Wall</h1>
          <p className="text-muted-foreground">
            Moments captured by our community {eventId && '• Filtered by event'}
          </p>
        </div>

        {media.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            No highlights yet. Be the first to share!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {media.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => openMedia(item)}
              >
                <div className="relative aspect-square bg-muted">
                  {item.is_pinned && (
                    <Badge className="absolute top-2 left-2 z-10 bg-primary">
                      <Pin className="h-3 w-3 mr-1" /> Featured
                    </Badge>
                  )}
                  {item.file_type === 'photo' ? (
                    <img src={item.file_url} alt="Event highlight" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-2">{item.events.name}</p>
                  {item.caption && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.caption}</p>
                  )}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {item.is_anonymous ? 'Anonymous Participant' : (item.profiles?.full_name || 'Unknown')}
                    </span>
                    <div className="flex gap-3">
                      <span className="flex items-center gap-1">
                        <Heart className={`h-4 w-4 ${item.user_liked ? 'fill-red-500 text-red-500' : ''}`} />
                        {item.likes_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        {item.comments_count}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Media Viewer Dialog */}
        <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedMedia && (
              <div className="space-y-4">
                {/* Media */}
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  {selectedMedia.file_type === 'photo' ? (
                    <img src={selectedMedia.file_url} alt="Full view" className="w-full h-full object-contain" />
                  ) : (
                    <video src={selectedMedia.file_url} controls className="w-full h-full" />
                  )}
                </div>

                {/* Details */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">{selectedMedia.events.name}</h3>
                    {selectedMedia.is_pinned && (
                      <Badge className="bg-primary">
                        <Pin className="h-3 w-3 mr-1" /> Featured
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    By {selectedMedia.is_anonymous ? 'Anonymous Participant' : (selectedMedia.profiles?.full_name || 'Unknown')}
                  </p>
                  {selectedMedia.caption && (
                    <p className="text-sm mb-4">{selectedMedia.caption}</p>
                  )}

                  {/* Like Button */}
                  <Button
                    variant={selectedMedia.user_liked ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleLike(selectedMedia.id)}
                    disabled={!isAuthenticated}
                  >
                    <Heart className={`h-4 w-4 mr-2 ${selectedMedia.user_liked ? 'fill-current' : ''}`} />
                    {selectedMedia.likes_count} {selectedMedia.likes_count === 1 ? 'Like' : 'Likes'}
                  </Button>
                </div>

                {/* Comments */}
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Comments ({comments.length})
                  </h4>

                  {isAuthenticated ? (
                    <div className="flex gap-2 mb-4">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        rows={2}
                      />
                      <Button onClick={handleComment} size="icon">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-4">Login to comment</p>
                  )}

                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {comments.map((comment) => (
                      <div key={comment.id} className="bg-muted p-3 rounded-lg">
                        <p className="text-sm font-medium mb-1">{comment.profiles.full_name}</p>
                        <p className="text-sm text-muted-foreground">{comment.comment_text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(comment.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default HighlightsWall;