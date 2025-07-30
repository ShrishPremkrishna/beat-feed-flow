import { useState, useEffect } from 'react';
import { ArrowLeft, Heart, MessageCircle, Share, MoreHorizontal, Trash2, Clock, TrendingUp, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PostComposer } from './PostComposer';
import { BeatPlayer } from './BeatPlayer';
import { ShareModal } from './ShareModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatNumber } from '@/lib/utils';
import { InitialsAvatar } from '@/components/ui/initials-avatar';
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
  onSignIn?: () => void;
  currentProfile?: any; // Add currentProfile prop for consistency
}

export const PostDetail = ({ postId, onBack, onUserProfileClick, onSignIn, currentProfile }: PostDetailProps) => {
  const [post, setPost] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sortBy, setSortBy] = useState<'likes' | 'recent' | 'my_likes'>('likes');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [downloadStatus, setDownloadStatus] = useState<{[key: string]: boolean}>({});
  const { toast } = useToast();

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    loadPostDetail();
  }, [postId, currentUser]);

  useEffect(() => {
    if (post) {
      loadReplies();
    }
  }, [postId, sortBy, post]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadPostDetail = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

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

      // Always load post author profile from database for consistency
      const { data: authorProfile } = await supabase
        .from('profiles')
        .select('display_name, username, avatar_url')
        .eq('user_id', postData.user_id)
        .single();

      // Check if current user liked this post
      let isLiked = false;
      if (currentUser) {
        try {
          const { data: likeData } = await supabase
            .from('likes')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('post_id', postData.id)
            .single();
          
          isLiked = !!likeData;
        } catch (error) {
          // If no like found, isLiked remains false
          console.log('No like found for current user');
        }
      }

      // Transform post data
      const transformedPost = {
        ...postData,
        author: {
          name: authorProfile?.display_name || authorProfile?.username || 'Anonymous User',
          avatar: authorProfile?.avatar_url || ''
        },
        timestamp: new Date(postData.created_at).toLocaleString(undefined, { 
          year: 'numeric', 
          month: 'numeric', 
          day: 'numeric', 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true
        }),
        likes: postData.likes_count || 0,
        comments: postData.comments_count || 0,
        isLiked: isLiked
      };

      setPost(transformedPost);
    } catch (error) {
      console.error('Error loading post detail:', error);
      toast({
        title: 'Error',
        description: 'Failed to load post details',
        variant: 'destructive'
      });
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const loadReplies = async () => {
    if (!post) return;
    
    try {
      // Load replies/comments
      let orderBy = 'likes_count';
      let ascending = false;
      
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
            key
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
      let userBeatReactions: { [beatId: string]: string } = {};
      
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

        // Also load beat reactions if this is the post owner
        if (freshUser.id === post.user_id) {
          const beatIds = repliesData
            .filter(r => r.beats?.id)
            .map(r => r.beats!.id);
          
          if (beatIds.length > 0) {
            const { data: reactionsData } = await supabase
              .from('beat_reactions')
              .select('beat_id, reaction')
              .eq('user_id', freshUser.id)
              .in('beat_id', beatIds);
            
            userBeatReactions = reactionsData?.reduce((acc, r) => {
              acc[r.beat_id] = r.reaction;
              return acc;
            }, {} as { [beatId: string]: string }) || {};
          }
        }
      }

      // Transform replies data
      const transformedReplies = repliesData?.map(reply => {
        const profile = profileMap.get(reply.user_id);
        return {
          ...reply,
          beats: reply.beats ? {
            ...(reply.beats as any),
            producer_name: profile?.display_name || profile?.username || 'Anonymous'
          } : null,
          author: {
            name: profile?.display_name || profile?.username || 'Anonymous User',
            avatar: profile?.avatar_url || ''
          },
          timestamp: new Date(reply.created_at).toLocaleString(undefined, { 
            year: 'numeric', 
            month: 'numeric', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true
          }),
          likes: reply.likes_count || 0,
          isLiked: userLikes.includes(reply.id),
          beatReaction: reply.beats?.id ? userBeatReactions[reply.beats.id] : null
        };
      }) || [];

      // Apply custom sorting for "Most Liked" - show liked beats first, then disliked, then unreviewed
      let finalReplies = transformedReplies;
      if (sortBy === 'likes' && freshUser?.id === post.user_id) {
        finalReplies.sort((a, b) => {
          // First, sort by reaction status: liked > disliked > unreviewed
          const getReactionPriority = (isLiked: boolean | null) => {
            if (isLiked === true) return 3;
            if (isLiked === false) return 2;
            return 1; // unreviewed (null)
          };
          
          const priorityA = getReactionPriority(a.isLiked);
          const priorityB = getReactionPriority(b.isLiked);
          
          if (priorityA !== priorityB) {
            return priorityB - priorityA; // Higher priority first
          }
          
          // If same reaction status, sort by likes count (descending)
          return (b.likes || 0) - (a.likes || 0);
        });
      } else if (sortBy === 'likes') {
        // For non-post owners, sort by likes count (descending)
        finalReplies.sort((a, b) => (b.likes || 0) - (a.likes || 0));
      }
      
      // Apply "My Likes" sorting - show all beats with liked ones at top, then disliked, then unreviewed
      if (sortBy === 'my_likes' && freshUser?.id === post.user_id) {
        finalReplies.sort((a, b) => {
          // First, sort by reaction status: liked > disliked > unreviewed
          const getReactionPriority = (isLiked: boolean | null) => {
            if (isLiked === true) return 3;
            if (isLiked === false) return 2;
            return 1; // unreviewed (null)
          };
          
          const priorityA = getReactionPriority(a.isLiked);
          const priorityB = getReactionPriority(b.isLiked);
          
          if (priorityA !== priorityB) {
            return priorityB - priorityA; // Higher priority first
          }
          
          // If same reaction status, sort by likes count (descending)
          return (b.likes || 0) - (a.likes || 0);
        });
      }

      setReplies(finalReplies);

      // TODO: Load download status when types are updated
    } catch (error) {
      console.error('Error loading replies:', error);
      toast({
        title: 'Error',
        description: 'Failed to load replies',
        variant: 'destructive'
      });
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
      
      // Reload replies to get accurate like counts from database
      await loadReplies();

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

      // TODO: Record download when types are updated

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

  const handlePostLike = async () => {
    console.log('handlePostLike called, currentUser:', currentUser, 'post:', post);
    
    if (!currentUser) {
      onSignIn?.();
      return;
    }

    const isCurrentlyLiked = post?.isLiked;
    console.log('isCurrentlyLiked:', isCurrentlyLiked);

    try {
      if (isCurrentlyLiked) {
        // Unlike the post
        console.log('Deleting like for post:', postId);
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('post_id', postId);
        
        if (deleteError) throw deleteError;
        console.log('Like deleted successfully');
      } else {
        // Like the post
        console.log('Inserting like for post:', postId);
        const { error: insertError } = await supabase
          .from('likes')
          .insert({
            user_id: currentUser.id,
            post_id: postId
          });
        
        if (insertError) throw insertError;
        console.log('Like inserted successfully');
      }
      
      // Reload post detail to get accurate like counts from database (without showing loading)
      await loadPostDetail(false);
    } catch (error) {
      console.error('Error toggling post like:', error);
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
            <InitialsAvatar
              name={post.author?.name || 'User'}
              avatarUrl={post.author?.avatar}
              size="lg"
              className="shadow-glow hover:border-primary/50 transition-colors"
            />
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
                onClick={handlePostLike}
                className="flex items-center gap-2 text-muted-foreground hover:text-primary"
              >
                <Heart className={`w-4 h-4 transition-all duration-300 ${post.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                <span>{formatNumber(post.likes)}</span>
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
              
              {/* Review Beats Button (only for post owner) */}
              {currentUser && currentUser.id === post.user_id && replies.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
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
        </div>
      </div>

      {/* Reply Composer */}
      {showReplyComposer && (
        <div className="beat-card">
          <PostComposer 
            isReply={true}
            parentPostId={postId}
            onPost={handleReply}
            onSignIn={onSignIn}
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
            <Select value={sortBy} onValueChange={(value: 'likes' | 'recent' | 'my_likes') => setSortBy(value)}>
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
                {currentUser && currentUser.id === post.user_id && (
                  <SelectItem value="my_likes">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      My Likes
                    </div>
                  </SelectItem>
                )}
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
                  <InitialsAvatar
                    name={reply.author?.name || 'User'}
                    avatarUrl={reply.author?.avatar}
                    size="md"
                    className="hover:border-primary/30 transition-colors"
                  />
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
                     <div className="bg-muted/30 rounded-lg border border-border overflow-hidden mb-3 relative">
                       {/* Beat reaction indicator for post owner */}
                       {currentUser && currentUser.id === post.user_id && reply.beatReaction && (
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
                       {currentUser && currentUser.id === reply.user_id && downloadStatus[reply.beats.id] && (
                         <div className="absolute top-2 left-2 z-10">
                           <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1">
                             <Download className="w-3 h-3" />
                             Downloaded by Artist
                           </div>
                         </div>
                       )}

                       {/* Liked indicator - only show to beat creator */}
                       {currentUser && currentUser.id === post.user_id && reply.beatReaction === 'like' && (
                         <div className="absolute top-2 right-2 z-10">
                           <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1">
                             <Heart className="w-3 h-3 fill-current" />
                             Liked by Artist
                           </div>
                         </div>
                       )}

                       <BeatPlayer
                         audioUrl={reply.beats.file_url || ''}
                         title={reply.beats.title || 'Untitled Beat'}
                         artist={reply.beats.artist || reply.author.name}
                         bpm={reply.beats.bpm || undefined}
                         beatKey={reply.beats.key || undefined}
                         purchaseLink={undefined}
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
                       <span className="text-xs font-medium">{formatNumber(reply.likes)}</span>
                     </Button>
                     
                     {/* Download button - only show for post creator (artist) */}
                     {currentUser && currentUser.id === post.user_id && reply.beats && (
                       <Button
                         variant="ghost"
                         size="sm"
                                                       onClick={() => handleDownloadBeat(reply.beats.file_url, reply.beats, reply.beats.id)}
                         className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-all duration-300"
                       >
                         <Download className="w-3 h-3" />
                         <span className="text-xs font-medium">Download</span>
                       </Button>
                     )}
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
