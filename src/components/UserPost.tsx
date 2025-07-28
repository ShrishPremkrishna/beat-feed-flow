import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share, MoreHorizontal, Trash2, Clock, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PostComposer } from './PostComposer';
import { BeatPlayer } from './BeatPlayer';
import { supabase } from '@/integrations/supabase/client';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface UserPostProps {
  post: {
    id: string;
    content: string;
    user_id?: string;
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
  onPostClick?: () => void;
  onDelete?: () => void;
  onUserProfileClick?: (userId: string) => void;
}

export const UserPost = ({ post, onLike, onComment, onShare, onPostClick, onDelete, onUserProfileClick }: UserPostProps) => {
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sortBy, setSortBy] = useState<'likes' | 'recent' | 'my_likes'>('likes');
  const { toast } = useToast();

  useEffect(() => {
    loadComments();
    getCurrentUser();
  }, [post.id, sortBy]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadComments = async () => {
    try {
      const orderBy = sortBy === 'likes' ? 'likes_count' : 'created_at';
      const ascending = sortBy === 'likes' ? false : true;
      
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
        .order(orderBy, { ascending });

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

      // Check which replies the current user has liked
      let userLikes: string[] = [];
      let userBeatReactions: { [beatId: string]: string } = {};
      
      if (currentUser && commentsData?.length) {
        const { data: likesData } = await supabase
          .from('likes')
          .select('comment_id')
          .eq('user_id', currentUser.id)
          .in('comment_id', commentsData.map(c => c.id));
        
        userLikes = likesData?.map(l => l.comment_id) || [];

        // Also load beat reactions if this is the post owner
        if (currentUser.id === post.user_id) {
          const beatIds = commentsData
            .filter(c => c.beats?.id)
            .map(c => c.beats.id);
          
          if (beatIds.length > 0) {
            const { data: reactionsData } = await supabase
              .from('beat_reactions')
              .select('beat_id, reaction')
              .eq('user_id', currentUser.id)
              .in('beat_id', beatIds);
            
            userBeatReactions = reactionsData?.reduce((acc, r) => {
              acc[r.beat_id] = r.reaction;
              return acc;
            }, {} as { [beatId: string]: string }) || {};
          }
        }
      }

      // Transform comments with author info and beat data
      let transformedComments = commentsData.map((comment: any) => {
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
            avatar: profile?.avatar_url || ''
          },
          timestamp: new Date(comment.created_at).toLocaleString(),
          likes: comment.likes_count || 0,
          isLiked: userLikes.includes(comment.id),
          beatReaction: comment.beats?.id ? userBeatReactions[comment.beats.id] : null
        };
      });

      // Apply "My Likes" filtering if selected
      if (sortBy === 'my_likes' && currentUser?.id === post.user_id) {
        transformedComments = transformedComments.filter(comment => 
          comment.beatReaction === 'like'
        );
      }

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

  const handleDeletePost = async () => {
    if (!currentUser) return;
    
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id)
        .eq('user_id', currentUser.id); // Ensure user can only delete their own posts

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Post deleted successfully'
      });

      onDelete?.();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete post',
        variant: 'destructive'
      });
    }
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

      // Reload comments
      await loadComments();
    } catch (error) {
      console.error('Error deleting reply:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete reply',
        variant: 'destructive'
      });
    }
  };

  const handleReplyLike = async (replyId: string, isCurrentlyLiked: boolean) => {
    if (!currentUser) {
      toast({
        title: 'Please log in',
        description: 'You need to be logged in to like replies',
        variant: 'destructive'
      });
      return;
    }

    // Optimistic update
    setReplies(prev => prev.map(reply => 
      reply.id === replyId 
        ? { 
            ...reply, 
            isLiked: !isCurrentlyLiked, 
            likes: isCurrentlyLiked ? reply.likes - 1 : reply.likes + 1 
          }
        : reply
    ));

    try {
      if (isCurrentlyLiked) {
        // Unlike the reply
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('comment_id', replyId);
      } else {
        // Like the reply
        await supabase
          .from('likes')
          .insert({
            user_id: currentUser.id,
            comment_id: replyId
          });
      }
      
      // Reload comments to get updated like counts from database
      await loadComments();
    } catch (error) {
      // Revert optimistic update on error
      setReplies(prev => prev.map(reply => 
        reply.id === replyId 
          ? { 
              ...reply, 
              isLiked: isCurrentlyLiked, 
              likes: isCurrentlyLiked ? reply.likes + 1 : reply.likes - 1 
            }
          : reply
      ));
      
      console.error('Error toggling reply like:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle like',
        variant: 'destructive'
      });
    }
  };

  const isPostOwner = currentUser && (currentUser.id === post.user_id);

  return (
    <div 
      className="post-card space-y-4 animate-fade-in cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onPostClick}
    >
      {/* Post Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="relative cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (post.user_id) {
                onUserProfileClick?.(post.user_id);
              }
            }}
          >
            {post.author?.avatar ? (
              <img 
                src={post.author.avatar} 
                alt={post.author?.name || 'User'}
                className="w-12 h-12 rounded-full object-cover border-2 border-primary/30 shadow-card hover:border-primary/50 transition-colors"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted border-2 border-primary/30 shadow-card hover:border-primary/50 transition-colors flex items-center justify-center">
                <span className="text-lg font-bold text-muted-foreground">
                  {(post.author?.name || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div>
            <h3 
              className="font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (post.user_id) {
                  onUserProfileClick?.(post.user_id);
                }
              }}
            >
              {post.author?.name || 'Anonymous User'}
            </h3>
            <p className="text-sm text-muted-foreground">{post.timestamp}</p>
          </div>
        </div>
        {isPostOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => e.stopPropagation()}
                className="h-8 w-8 p-0 hover:bg-secondary/50"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePost();
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

      {/* Post Content */}
      <div className="text-foreground leading-relaxed text-base">
        {post.content}
      </div>

      {/* Post Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onLike?.();
            }}
            className={`flex items-center gap-2 transition-all duration-300 ${
              post.isLiked 
                ? 'text-red-500 hover:text-red-400' 
                : 'text-muted-foreground hover:text-red-500'
            }`}
          >
            <Heart className={`w-4 h-4 transition-all duration-300 ${
              post.isLiked ? 'fill-current scale-110' : ''
            }`} />
            <span className="font-medium">{post.likes}</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowReplyComposer(!showReplyComposer);
            }}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <MessageCircle className="w-4 h-4" />
            {replies.length}
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              onShare?.();
            }}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <Share className="w-4 h-4" />
          </Button>
          
          {/* Review Beats Button (only for post owner) */}
          {isPostOwner && replies.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                // This will be handled by the parent component
                window.dispatchEvent(new CustomEvent('openBeatSwiper', { detail: { postId: post.id } }));
              }}
              className="flex items-center gap-2 text-primary hover:text-primary/80"
            >
              Review Beats
            </Button>
          )}
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
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">
              Replies ({replies.length})
            </span>
            <Select value={sortBy} onValueChange={(value: 'likes' | 'recent' | 'my_likes') => setSortBy(value)}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="likes">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" />
                    Most Liked
                  </div>
                </SelectItem>
                <SelectItem value="recent">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    Most Recent
                  </div>
                </SelectItem>
                {isPostOwner && (
                  <SelectItem value="my_likes">
                    <div className="flex items-center gap-2">
                      <Heart className="w-3 h-3" />
                      My Likes
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          {replies.map((reply, index) => {
            const isReplyOwner = currentUser && currentUser.id === reply.user_id;
            
            return (
              <div key={reply.id || index} className="flex gap-3">
                {reply.author?.avatar ? (
                  <img 
                    src={reply.author.avatar} 
                    alt={reply.author?.name || 'User'}
                    className="w-8 h-8 rounded-full object-cover border border-primary/20"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted border border-primary/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-muted-foreground">
                      {(reply.author?.name || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 bg-muted rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{reply.author?.name || 'Anonymous User'}</span>
                      <span className="text-xs text-muted-foreground">{reply.timestamp}</span>
                    </div>
                    {isReplyOwner && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => e.stopPropagation()}
                            className="h-6 w-6 p-0"
                          >
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteReply(reply.id, reply.user_id);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Delete Reply
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                   {/* Display beat if it's a beat reply */}
                   {reply.beat ? (
                     <div className="mt-2 mb-3 relative">
                       {/* Beat reaction indicator for post owner */}
                       {isPostOwner && reply.beatReaction && (
                         <div className="absolute top-2 right-2 z-10">
                           {reply.beatReaction === 'like' ? (
                             <div className="bg-green-500 text-white rounded-full p-1">
                               <Heart className="w-3 h-3 fill-current" />
                             </div>
                           ) : (
                             <div className="bg-red-500 text-white rounded-full p-1">
                               <X className="w-3 h-3" />
                             </div>
                           )}
                         </div>
                       )}
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
                     reply.content && <p className="text-sm mb-3">{reply.content}</p>
                   )}
                   
                   {/* Reply Actions */}
                   <div className="flex items-center gap-4 pt-2 border-t border-border/30">
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={(e) => {
                         e.stopPropagation();
                         handleReplyLike(reply.id, reply.isLiked);
                       }}
                       className={`flex items-center gap-1 transition-all duration-300 ${
                         reply.isLiked 
                           ? 'text-red-500 hover:text-red-400' 
                           : 'text-muted-foreground hover:text-red-500'
                       }`}
                     >
                       <Heart className={`w-3 h-3 transition-all duration-300 ${
                         reply.isLiked ? 'fill-current scale-110' : ''
                       }`} />
                       <span className="text-xs font-medium">{reply.likes}</span>
                     </Button>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};