import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share, MoreHorizontal, Trash2, Clock, TrendingUp, X, Music, ArrowUp, ArrowDown, Download } from 'lucide-react';
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
import { InitialsAvatar } from '@/components/ui/initials-avatar';
import { formatNumber } from '@/lib/utils';
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
  onSignIn?: () => void;
  currentProfile?: any; // Add currentProfile prop for consistency
}

export const UserPost = ({ post, onLike, onComment, onShare, onPostClick, onDelete, onUserProfileClick, onSignIn, currentProfile }: UserPostProps) => {
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sortBy, setSortBy] = useState<'likes' | 'recent' | 'my_likes'>('likes');
  const [downloadStatus, setDownloadStatus] = useState<{[key: string]: boolean}>({});
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
      // For basic sorting (likes, recent), use database ordering
      let orderBy = 'likes_count';
      let ascending = false;
      let useClientSideSort = false;
      
      switch (sortBy) {
        case 'likes':
          orderBy = 'likes_count';
          ascending = false;
          break;
        case 'recent':
          orderBy = 'created_at';
          ascending = false;
          break;
        default:
          orderBy = 'likes_count';
          ascending = false;
      }
      
      const { data: commentsData, error: commentsError } = await (supabase as any)
        .from('comments')
        .select(`
          *,
          beats!beat_id (
            id,
            title,
            artist,
            file_url,
            bpm,
            key,
            purchase_link
          )
        `)
        .eq('post_id', post.id)
        .order(orderBy, { ascending });

      if (commentsError) throw commentsError;

      console.log('Loaded comments data:', commentsData);
      console.log('Post ID:', post.id, 'Post user_id:', post.user_id);

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
        .in('user_id', userIds as string[]);

      if (profilesError) throw profilesError;

      // Create a map of user_id to profile for quick lookup
      const profileMap = new Map();
      profilesData?.forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });

      // Check which replies the current user has liked
      let userLikes: string[] = [];
      
      // Always get fresh user data to avoid state issues
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      
      if (freshUser && commentsData?.length) {
        const { data: likesData } = await supabase
          .from('likes')
          .select('comment_id')
          .eq('user_id', freshUser.id)
          .in('comment_id', commentsData.map(c => c.id));
        
        userLikes = likesData?.map(l => l.comment_id) || [];

        // Load beat reactions for the current user (for sorting purposes)
        console.log('Checking beat reactions - freshUser.id:', freshUser.id, 'post.user_id:', post.user_id);
        if (freshUser.id === post.user_id) {
          const beatIds = commentsData
            .filter(c => c.beats?.id)
            .map(c => c.beats.id);
          
          if (beatIds.length > 0) {
            const { data: reactionsData } = await supabase
              .from('beat_reactions')
              .select('beat_id, reaction')
              .eq('user_id', freshUser.id)
              .in('beat_id', beatIds);
            
            // Store reactions for display
            const reactionMap: { [beatId: string]: string } = {};
            reactionsData?.forEach(reaction => {
              reactionMap[reaction.beat_id] = reaction.reaction;
            });
            
            // Update the transformed comments with reaction data
            commentsData.forEach((comment, index) => {
              if (comment.beats?.id && reactionMap[comment.beats.id]) {
                comment.beatReaction = reactionMap[comment.beats.id];
              }
            });
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
            purchase_link: comment.beats.purchase_link,
            producer_name: profile?.display_name || profile?.username || 'Anonymous'
          } : null,
          author: {
            name: profile?.display_name || profile?.username || 'Anonymous User',
            avatar: profile?.avatar_url || ''
          },
                      timestamp: new Date(comment.created_at).toLocaleString(undefined, { 
              year: 'numeric', 
              month: 'numeric', 
              day: 'numeric', 
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true
            }),
          likes: comment.likes_count || 0,
          isLiked: userLikes.includes(comment.id),
          beatReaction: comment.beatReaction || null
        };
      });

      // Apply custom sorting for "Most Liked" - show liked beats first, then disliked, then unreviewed
      if (sortBy === 'likes' && currentUser?.id === post.user_id) {
        transformedComments.sort((a, b) => {
          // First, sort by reaction status: liked > disliked > unreviewed
          const getReactionPriority = (reaction: string | null) => {
            if (reaction === 'like') return 3;
            if (reaction === 'dislike') return 2;
            return 1; // unreviewed
          };
          
          const priorityA = getReactionPriority(a.beatReaction);
          const priorityB = getReactionPriority(b.beatReaction);
          
          if (priorityA !== priorityB) {
            return priorityB - priorityA; // Higher priority first
          }
          
          // If same reaction status, sort by likes count (descending)
          return (b.likes || 0) - (a.likes || 0);
        });
      } else if (sortBy === 'likes') {
        // For non-post owners, sort by likes count (descending)
        transformedComments.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      }
      
      // Apply "My Likes" sorting - show all beats with liked ones at top, then disliked, then unreviewed
      if (sortBy === 'my_likes' && currentUser?.id === post.user_id) {
        transformedComments.sort((a, b) => {
          // First, sort by reaction status: liked > disliked > unreviewed
          const getReactionPriority = (reaction: string | null) => {
            if (reaction === 'like') return 3;
            if (reaction === 'dislike') return 2;
            return 1; // unreviewed
          };
          
          const priorityA = getReactionPriority(a.beatReaction);
          const priorityB = getReactionPriority(b.beatReaction);
          
          if (priorityA !== priorityB) {
            return priorityB - priorityA; // Higher priority first
          }
          
          // If same reaction status, sort by likes count (descending)
          return (b.likes || 0) - (a.likes || 0);
        });
      }

      setReplies(transformedComments);

      // Load download status for beats
      if (transformedComments.some(reply => reply.beat)) {
        const beatIds = transformedComments
          .filter(reply => reply.beat)
          .map(reply => reply.beat.id);
        
        const { data: downloadsData } = await (supabase as any)
          .from('downloads')
          .select('beat_id')
          .in('beat_id', beatIds);
        
        const downloadMap: {[key: string]: boolean} = {};
        downloadsData?.forEach((download: any) => {
          downloadMap[download.beat_id] = true;
        });
        
        setDownloadStatus(downloadMap);
      }
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

      // Dispatch custom event to notify PostComposer about post deletion
      window.dispatchEvent(new CustomEvent('postDeleted'));

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
      onSignIn?.();
      return;
    }

    try {
      if (isCurrentlyLiked) {
        // Unlike the reply
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('comment_id', replyId);
        
        if (deleteError) throw deleteError;
      } else {
        // Like the reply
        const { error: insertError } = await supabase
          .from('likes')
          .insert({
            user_id: currentUser.id,
            comment_id: replyId
          });
        
        if (insertError) throw insertError;
      }
      
      // Reload comments to get accurate like counts from database
      await loadComments();
    } catch (error) {
      
      console.error('Error toggling reply like:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle like',
        variant: 'destructive'
      });
    }
  };

  const handleDownloadBeat = async (fileUrl: string, beatData: any, beatId: string) => {
    try {
      // Fetch the file as a blob
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }
      
      const blob = await response.blob();
      
      // Create filename with format: producersname-title_bpm_key
      const producerName = beatData.producer_name || beatData.artist || 'unknown';
      const title = beatData.title || 'untitled';
      const bpm = beatData.bpm || '';
      const key = beatData.key || '';
      const fileName = `${producerName}-${title}_${bpm}_${key}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      
      // Create a blob URL
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);

      // Record the download in the database
      if (currentUser && beatId) {
        try {
          await (supabase as any)
            .from('downloads')
            .upsert({
              beat_id: beatId,
              downloaded_by: currentUser.id
            });
          
          // Update local state
          setDownloadStatus(prev => ({
            ...prev,
            [beatId]: true
          }));
        } catch (downloadError) {
          console.error('Error recording download:', downloadError);
        }
      }

      toast({
        title: 'Download Started',
        description: 'Your beat is being downloaded.',
      });
    } catch (error) {
      console.error('Error downloading beat:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download the beat. Please try again.',
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
              if (post.user_id && onUserProfileClick) {
                onUserProfileClick(post.user_id);
              }
            }}
          >
            <InitialsAvatar
              name={post.author?.name || 'User'}
              avatarUrl={post.author?.avatar}
              size="md"
              className="shadow-card hover:border-primary/50 transition-colors"
            />
          </div>
          <div>
            <h3 
              className="font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (post.user_id && onUserProfileClick) {
                  onUserProfileClick(post.user_id);
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
                                    <span className="font-medium">{formatNumber(post.likes)}</span>
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
            onSignIn={onSignIn}
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
                <SelectTrigger className="w-[160px] h-8">
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
          {replies.slice(0, 1).map((reply, index) => {
            const isReplyOwner = currentUser && currentUser.id === reply.user_id;
            
            return (
              <div key={reply.id || index} className="flex gap-3">
                <div 
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (reply.user_id && onUserProfileClick) {
                      onUserProfileClick(reply.user_id);
                    }
                  }}
                >
                  <InitialsAvatar
                    name={reply.author?.name || 'User'}
                    avatarUrl={reply.author?.avatar}
                    size="sm"
                    className="hover:border-primary/40 transition-colors"
                  />
                </div>
                <div className="flex-1 bg-muted rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span 
                        className="font-medium text-sm cursor-pointer hover:text-primary transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (reply.user_id && onUserProfileClick) {
                            onUserProfileClick(reply.user_id);
                          }
                        }}
                      >
                        {reply.author?.name || 'Anonymous User'}
                      </span>
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
                       
                       {/* Downloaded indicator - only show to beat creator */}
                       {currentUser && currentUser.id === reply.user_id && downloadStatus[reply.beat.id] && (
                         <div className="absolute top-2 left-2 z-10">
                           <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1">
                             <Download className="w-3 h-3" />
                             Downloaded by Artist
                           </div>
                         </div>
                       )}

                       <div onClick={(e) => e.stopPropagation()}>
                         <BeatPlayer
                           audioUrl={reply.beat.file_url}
                           title={reply.beat.title}
                           artist={reply.beat.artist}
                           bpm={reply.beat.bpm || undefined}
                           beatKey={reply.beat.key || undefined}
                           purchaseLink={reply.beat.purchase_link || undefined}
                           className="max-w-md"
                         />
                       </div>
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
                       <span className="text-xs font-medium">{formatNumber(reply.likes)}</span>
                     </Button>
                     
                                           {/* Download button - only show for post creator (artist) */}
                      {isPostOwner && reply.beat && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadBeat(reply.beat.file_url, reply.beat, reply.beat.id);
                          }}
                          className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-all duration-300"
                        >
                          <Download className="w-3 h-3" />
                          <span className="text-xs font-medium">Download</span>
                        </Button>
                      )}
                   </div>
                </div>
              </div>
            );
          })}
          
          {/* See More Button */}
          {replies.length > 1 && (
            <div className="text-center pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onPostClick?.();
                }}
                className="text-primary hover:text-primary/80"
              >
                See More Replies ({replies.length - 1} more)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
