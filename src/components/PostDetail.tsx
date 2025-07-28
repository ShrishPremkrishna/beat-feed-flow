import { useState, useEffect } from 'react';
import { ArrowLeft, Heart, MessageCircle, Share, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PostComposer } from './PostComposer';
import { BeatPlayer } from './BeatPlayer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PostDetailProps {
  postId: string;
  onBack: () => void;
}

export const PostDetail = ({ postId, onBack }: PostDetailProps) => {
  const [post, setPost] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPostDetail();
    getCurrentUser();
  }, [postId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadPostDetail = async () => {
    try {
      setLoading(true);

      // Load the main post
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          likes_count,
          comments_count,
          user_id
        `)
        .eq('id', postId)
        .single();

      if (postError) throw postError;

      // Load post author profile
      const { data: authorProfile } = await supabase
        .from('profiles')
        .select('display_name, username, avatar_url')
        .eq('user_id', postData.user_id)
        .single();

      // Transform post data
      const transformedPost = {
        ...postData,
        author: {
          name: authorProfile?.display_name || authorProfile?.username || 'Anonymous User',
          avatar: authorProfile?.avatar_url || ''
        },
        timestamp: new Date(postData.created_at).toLocaleString(),
        likes: postData.likes_count || 0,
        comments: postData.comments_count || 0,
        isLiked: false // TODO: Check if current user liked this post
      };

      setPost(transformedPost);

      // Load replies/comments
      const { data: repliesData, error: repliesError } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          beat_id,
          beats (
            id,
            title,
            artist,
            cover_art_url,
            file_url,
            bpm,
            key,
            mood,
            price,
            duration
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (repliesError) throw repliesError;

      // Load profiles for reply authors
      const replyUserIds = repliesData?.map(reply => reply.user_id) || [];
      const { data: replyProfiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url')
        .in('user_id', replyUserIds);

      // Create profile map
      const profileMap = new Map();
      replyProfiles?.forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });

      // Transform replies data
      const transformedReplies = repliesData?.map(reply => {
        const profile = profileMap.get(reply.user_id);
        return {
          ...reply,
          author: {
            name: profile?.display_name || profile?.username || 'Anonymous User',
            avatar: profile?.avatar_url || ''
          },
          timestamp: new Date(reply.created_at).toLocaleString()
        };
      }) || [];

      setReplies(transformedReplies);
    } catch (error) {
      console.error('Error loading post detail:', error);
      toast({
        title: 'Error',
        description: 'Failed to load post details',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReply = (replyData: any) => {
    // Add the new reply to the list
    setReplies(prev => [...prev, {
      ...replyData,
      id: Date.now().toString(), // Temporary ID
      timestamp: 'just now'
    }]);
    setShowReplyComposer(false);
    
    // Refresh the post to get updated comment count
    loadPostDetail();
  };

  const handleDeleteReply = async (replyId: string, replyUserId: string) => {
    if (!currentUser || currentUser.id !== replyUserId) return;
    
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', replyId)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Reply deleted successfully'
      });

      // Reload post details to refresh replies
      loadPostDetail();
    } catch (error) {
      console.error('Error deleting reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete reply',
        variant: 'destructive'
      });
    }
  };

  const handleLike = async () => {
    // TODO: Implement like functionality
    toast({
      title: 'Feature coming soon',
      description: 'Like functionality will be implemented soon!'
    });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="mb-4 hover:bg-muted"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Feed
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          Loading post...
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="mb-4 hover:bg-muted"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Feed
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          Post not found
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={onBack}
        className="mb-4 hover:bg-muted"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Feed
      </Button>

      {/* Main Post */}
      <div className="beat-card space-y-4">
        <div className="flex items-start gap-3">
          <div className="relative">
            {post.author.avatar ? (
              <img 
                src={post.author.avatar}
                alt={post.author.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-primary/30 shadow-glow"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted border-2 border-primary/30 shadow-glow flex items-center justify-center">
                <span className="text-lg font-bold text-muted-foreground">
                  {post.author.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-primary rounded-full border-2 border-background"></div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{post.author.name}</span>
                <span className="text-muted-foreground text-sm">{post.timestamp}</span>
              </div>
              {currentUser && currentUser.id === post.user_id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => {
                        // Handle post deletion - navigate back to feed
                        onBack();
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Post
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <p className="text-foreground leading-relaxed mb-4">{post.content}</p>
            
            {/* Post Actions */}
            <div className="flex items-center gap-6 pt-3 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className="flex items-center gap-2 text-muted-foreground hover:text-primary"
              >
                <Heart className="w-4 h-4" />
                <span>{post.likes}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReplyComposer(!showReplyComposer)}
                className="flex items-center gap-2 text-muted-foreground hover:text-primary"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{post.comments}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary"
              >
                <Share className="w-4 h-4" />
                <span>Share</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Reply Composer */}
      {showReplyComposer && (
        <div className="beat-card">
          <PostComposer 
            isReply={true}
            onPost={handleReply}
          />
        </div>
      )}

      {/* Replies Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          Replies ({replies.length})
        </h3>
        
        {replies.length === 0 ? (
          <div className="beat-card text-center py-8 text-muted-foreground">
            No replies yet. Be the first to reply!
          </div>
        ) : (
          replies.map((reply) => (
            <div key={reply.id} className="beat-card space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {reply.author.avatar ? (
                    <img 
                      src={reply.author.avatar}
                      alt={reply.author.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-sm font-bold text-muted-foreground">
                        {reply.author.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{reply.author.name}</span>
                      <span className="text-muted-foreground text-xs">{reply.timestamp}</span>
                    </div>
                    {currentUser && currentUser.id === reply.user_id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleDeleteReply(reply.id, reply.user_id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Delete Reply
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  {reply.content && (
                    <p className="text-foreground text-sm mb-3">{reply.content}</p>
                  )}
                  {reply.beats && (
                    <div className="bg-muted/30 rounded-lg border border-border overflow-hidden">
                      <BeatPlayer
                        audioUrl={reply.beats.file_url || ''}
                        title={reply.beats.title || 'Untitled Beat'}
                        artist={reply.beats.artist || reply.author.name}
                        bpm={reply.beats.bpm || undefined}
                        key={reply.beats.key || undefined}
                        mood={reply.beats.mood || undefined}
                        className="p-3"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};