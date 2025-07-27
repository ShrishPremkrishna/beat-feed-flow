import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PostComposer } from './PostComposer';
import { BeatPlayer } from './BeatPlayer';
import { supabase } from '@/integrations/supabase/client';

interface UserPostProps {
  post: {
    id: string;
    content: string;
    author: {
      name: string;
      avatar: string;
    };
    timestamp: string;
    likes: number;
    comments: number;
    isLiked?: boolean;
  };
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
}

export const UserPost = ({ post, onLike, onComment, onShare }: UserPostProps) => {
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadComments();
  }, [post.id]);

  const loadComments = async () => {
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          *,
          beats (
            id,
            title,
            artist,
            file_url,
            bpm,
            key,
            mood
          )
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      if (!commentsData || commentsData.length === 0) {
        setReplies([]);
        return;
      }

      // Get unique user IDs from comments
      const userIds = [...new Set(commentsData.map(comment => comment.user_id))];

      // Load profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Create a map of user_id to profile for quick lookup
      const profileMap = new Map();
      profilesData?.forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });

      // Transform comments with author info and beat data
      const transformedComments = commentsData.map((comment: any) => {
        const profile = profileMap.get(comment.user_id);
        return {
          ...comment,
          beat: comment.beats ? {
            id: comment.beats.id,
            title: comment.beats.title,
            artist: comment.beats.artist,
            file_url: comment.beats.file_url,
            bpm: comment.beats.bpm,
            key: comment.beats.key,
            mood: comment.beats.mood
          } : null,
          author: {
            name: profile?.display_name || profile?.username || 'Anonymous User',
            avatar: profile?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'
          },
          timestamp: new Date(comment.created_at).toLocaleString()
        };
      });

      setReplies(transformedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleReply = async (reply: any) => {
    // The PostComposer will handle creating the comment in the database
    // Just reload comments to show the new one
    await loadComments();
    setShowReplyComposer(false);
  };

  return (
    <div className="beat-card space-y-4">
      {/* Post Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={post.author?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'} 
            alt={post.author?.name || 'User'}
            className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
          />
          <div>
            <h3 className="font-semibold text-foreground">{post.author?.name || 'Anonymous User'}</h3>
            <p className="text-sm text-muted-foreground">{post.timestamp}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {/* Post Content */}
      <div className="text-foreground leading-relaxed">
        {post.content}
      </div>

      {/* Post Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLike}
            className={`flex items-center gap-2 ${post.isLiked ? 'text-red-500' : 'text-muted-foreground'}`}
          >
            <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
            {post.likes}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplyComposer(!showReplyComposer)}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <MessageCircle className="w-4 h-4" />
            {post.comments + replies.length}
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onShare}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <Share className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Reply Composer */}
      {showReplyComposer && (
        <div className="border-t border-border pt-4">
          <PostComposer 
            onPost={handleReply}
            placeholder="Reply with a beat..."
            isReply={true}
            parentPostId={post.id}
          />
        </div>
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <div className="space-y-4 border-t border-border pt-4">
          {replies.map((reply, index) => (
            <div key={index} className="flex gap-3">
              <img 
                src={reply.author?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'} 
                alt={reply.author?.name || 'User'}
                className="w-8 h-8 rounded-full object-cover border border-primary/20"
              />
              <div className="flex-1 bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{reply.author?.name || 'Anonymous User'}</span>
                  <span className="text-xs text-muted-foreground">just now</span>
                </div>
                {/* Display beat if it's a beat reply */}
                {reply.beat ? (
                  <div className="mt-2">
                    <BeatPlayer
                      audioUrl={reply.beat.file_url}
                      title={reply.beat.title}
                      artist={reply.beat.artist}
                      bpm={reply.beat.bpm || undefined}
                      key={reply.beat.key || undefined}
                      mood={reply.beat.mood || undefined}
                      className="max-w-md"
                    />
                  </div>
                ) : (
                  /* Display text content for old text replies */
                  <p className="text-sm">{reply.content}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};