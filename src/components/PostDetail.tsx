import { useState, useEffect } from 'react';
import { ArrowLeft, Heart, MessageCircle, Share, MoreHorizontal, Trash2, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PostComposer } from './PostComposer';
import { BeatPlayer } from './BeatPlayer';
import { ShareModal } from './ShareModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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

interface PostDetailProps {
  postId: string;
  onBack: () => void;
  onUserProfileClick?: (userId: string) => void;
}

export const PostDetail = ({ postId, onBack, onUserProfileClick }: PostDetailProps) => {
  const [post, setPost] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sortBy, setSortBy] = useState<'likes' | 'recent'>('likes');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadPostDetail();
    getCurrentUser();
  }, [postId, sortBy]);

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
      const orderBy = sortBy === 'likes' ? 'likes_count' : 'created_at';
      const ascending = sortBy === 'likes' ? false : true;
      
      const { data: repliesData, error: repliesError } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          beat_id,
          likes_count,
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
        .order(orderBy, { ascending });

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

      // Check which replies the current user has liked
      let userLikes: string[] = [];
      
      // Always get fresh user data to avoid state issues
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      
      if (freshUser && repliesData?.length) {
        const { data: likesData } = await supabase
          .from('likes')
          .select('comment_id')
          .eq('user_id', freshUser.id)
          .in('comment_id', repliesData.map(r => r.id))
          .not('comment_id', 'is', null);
        
        userLikes = likesData?.map(l => l.comment_id) || [];
      }

      // Transform replies data
      const transformedReplies = repliesData?.map(reply => {
        const profile = profileMap.get(reply.user_id);
        return {
          ...reply,
          author: {
            name: profile?.display_name || profile?.username || 'Anonymous User',
            avatar: profile?.avatar_url || ''
          },
          timestamp: new Date(reply.created_at).toLocaleString(),
          likes: reply.likes_count || 0,
          isLiked: userLikes.includes(reply.id)
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
      
      // Small delay to ensure database consistency, then reload
      setTimeout(async () => {
        await loadPostDetail();
      }, 100);

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

  const handleShare = () => {
    // Generate the direct link to the post detail view
    const postUrl = `${window.location.origin}/post/${postId}`;
    setShareUrl(postUrl);
    setShowShareModal(true);
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
          <div 
            className="relative cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (post.user_id && onUserProfileClick) {
                onUserProfileClick(post.user_id);
              }
            }}
          >
            {post.author.avatar ? (
              <img 
                src={post.author.avatar}
                alt={post.author.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-primary/30 shadow-glow hover:border-primary/50 transition-colors"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-muted border-2 border-primary/30 shadow-glow hover:border-primary/50 transition-colors flex items-center justify-center">
                <span className="text-lg font-bold text-muted-foreground">
                  {post.author.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span 
                  className="font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (post.user_id && onUserProfileClick) {
                      onUserProfileClick(post.user_id);
                    }
                  }}
                >
                  {post.author.name}
                </span>
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
                onClick={() => {
                  toast({
                    title: 'Feature coming soon',
                    description: 'Post liking will be implemented soon!'
                  });
                }}
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
                onClick={handleShare}
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
            parentPostId={postId}
            onPost={handleReply}
          />
        </div>
      )}

      {/* Replies Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            Replies ({replies.length})
          </h3>
          {replies.length > 0 && (
            <Select value={sortBy} onValueChange={(value: 'likes' | 'recent') => setSortBy(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="likes">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Most Liked
                  </div>
                </SelectItem>
                <SelectItem value="recent">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Most Recent
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        
        {replies.length === 0 ? (
          <div className="beat-card text-center py-8 text-muted-foreground">
            No replies yet. Be the first to reply!
          </div>
        ) : (
          replies.map((reply) => (
            <div key={reply.id} className="beat-card space-y-4">
              <div className="flex items-start gap-3">
                <div 
                  className="flex-shrink-0 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (reply.user_id && onUserProfileClick) {
                      onUserProfileClick(reply.user_id);
                    }
                  }}
                >
                  {reply.author.avatar ? (
                    <img 
                      src={reply.author.avatar}
                      alt={reply.author.name}
                      className="w-10 h-10 rounded-full object-cover hover:border-2 hover:border-primary/30 transition-colors"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:border-2 hover:border-primary/30 transition-colors">
                      <span className="text-sm font-bold text-muted-foreground">
                        {reply.author.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span 
                        className="font-semibold text-sm cursor-pointer hover:text-primary transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (reply.user_id && onUserProfileClick) {
                            onUserProfileClick(reply.user_id);
                          }
                        }}
                      >
                        {reply.author.name}
                      </span>
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
                     <div className="bg-muted/30 rounded-lg border border-border overflow-hidden mb-3">
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
                   
                   {/* Reply Actions */}
                   <div className="flex items-center gap-4 pt-2 border-t border-border/30">
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => handleReplyLike(reply.id, reply.isLiked)}
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
            </div>
          ))
        )}
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={shareUrl}
        title="Share Post"
      />
    </div>
  );
};