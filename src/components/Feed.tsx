import { useState, useEffect } from 'react';
import { PostComposer } from './PostComposer';
import { UserPost } from './UserPost';
import { ShareModal } from './ShareModal';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FeedProps {
  highlightedPostId?: string | null;
  onPostDetailView?: (postId: string) => void;
  onUserProfileClick?: (userId: string) => void;
  activeTab?: 'home' | 'following';
  onTabChange?: (tab: 'home' | 'following') => void;
  onSignIn?: () => void;
}

export const Feed = ({ highlightedPostId, onPostDetailView, onUserProfileClick, activeTab = 'home', onTabChange, onSignIn }: FeedProps) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();
  
  const POSTS_PER_PAGE = 10;

  useEffect(() => {
    console.log('Tab changed to:', activeTab);
    checkAuthStatus();
    // Reset pagination when tab changes
    setCurrentPage(0);
    setPosts([]);
    setHasMore(true);
    loadPosts(true);
  }, [activeTab]); // Reload posts when tab changes

  const checkAuthStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const authenticated = !!user;
    console.log('Auth status check:', authenticated);
    setIsAuthenticated(authenticated);
  };

  const loadPosts = async (isInitialLoad = false) => {
    console.log('loadPosts called with activeTab:', activeTab, 'isInitialLoad:', isInitialLoad);
    
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    const pageToLoad = isInitialLoad ? 0 : currentPage;
    const offset = pageToLoad * POSTS_PER_PAGE;
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      let postsData;
      
      if (activeTab === 'following') {
        if (!currentUser) {
          // If not authenticated and on following tab, show empty state
          postsData = [];
        } else {
          // Load posts from ONLY followed users
          
          // First, get users that current user follows
          const { data: followsData } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', currentUser.id);
          
          const followingIds = followsData?.map(follow => follow.following_id) || [];
          
          if (followingIds.length > 0) {
            // Load posts from ONLY followed users
            const { data: followedPosts, error: followedError } = await supabase
              .from('posts')
              .select('*')
              .in('user_id', followingIds)
              .order('created_at', { ascending: false })
              .range(offset, offset + POSTS_PER_PAGE - 1);
            
            if (followedError) throw followedError;
            postsData = followedPosts || [];
          } else {
            // If user doesn't follow anyone, show empty feed
            postsData = [];
          }
        }
      } else {
        // Load all posts for Discover tab
        const { data: allPosts, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + POSTS_PER_PAGE - 1);

        if (postsError) throw postsError;
        postsData = allPosts;
      }
      
      // Check if we have more posts to load
      setHasMore(postsData && postsData.length === POSTS_PER_PAGE);

      // Get unique user IDs from posts
      const postUserIds = postsData?.map(post => post.user_id) || [];

      // Load profiles for these users (only if there are posts)
      let profilesData = null;
      if (postUserIds.length > 0) {
        const { data, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, display_name, username, avatar_url')
          .in('user_id', postUserIds);

        if (profilesError) throw profilesError;
        profilesData = data;
      }

      // Check which posts the current user has liked
      let userLikes: string[] = [];
      
      // Always get fresh user data to avoid state issues
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      
      if (freshUser && postsData?.length) {
        const { data: likesData } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', freshUser.id)
          .in('post_id', postsData.map(p => p.id));
        
        userLikes = likesData?.map(l => l.post_id) || [];
      }

      // Create a map of user_id to profile for quick lookup
      const profileMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profileMap.set(profile.user_id, profile);
        });
      }

      // Transform posts data - ensure proper ordering (newest first)
      const transformedPosts = postsData
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        ?.map((post: any) => {
        const profile = profileMap.get(post.user_id);
        return {
          ...post,
          author: {
            name: profile?.display_name || profile?.username || 'Anonymous User',
            avatar: profile?.avatar_url || ''
          },
          timestamp: new Date(post.created_at).toLocaleString(undefined, { 
            year: 'numeric', 
            month: 'numeric', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true
          }),
          likes: post.likes_count || 0,
          comments: post.comments_count || 0,
          isLiked: userLikes.includes(post.id)
        };
      }) || [];

      // Set the transformed posts
      console.log('Setting posts:', transformedPosts.length, 'activeTab:', activeTab, 'isAuthenticated:', isAuthenticated);
      
      if (isInitialLoad) {
        setPosts(transformedPosts);
        setCurrentPage(1);
      } else {
        setPosts(prev => [...prev, ...transformedPosts]);
        setCurrentPage(prev => prev + 1);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      // Show empty feed if database query fails
      setPosts([]);
      toast({
        title: "Error loading posts",
        description: "Failed to load posts from database.",
        variant: "destructive"
      });
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  const handleNewPost = (post: any) => {
    // Ensure the post has all required properties to match the expected format
    const normalizedPost = {
      ...post,
      likes: post.likes || 0,
      comments: post.comments || 0,
      isLiked: post.isLiked || false,
      author: {
        name: post.author?.name || 'Anonymous User',
        avatar: post.author?.avatar || ''
      },
      timestamp: post.timestamp || 'just now'
    };
    setPosts(prev => [normalizedPost, ...prev]);
  };
  
  const handleLoadMore = () => {
    loadPosts(false);
  };

  const handleLike = async (postId: string) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      onSignIn?.();
      return;
    }

    const post = posts.find(p => p.id === postId);
    const isCurrentlyLiked = post?.isLiked;

    try {
      if (isCurrentlyLiked) {
        // Unlike the post
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('post_id', postId);
        
        if (deleteError) throw deleteError;
      } else {
        // Like the post
        const { error: insertError } = await supabase
          .from('likes')
          .insert({
            user_id: currentUser.id,
            post_id: postId
          });
        
        if (insertError) throw insertError;
      }
      
      // Reload posts to get accurate like counts from database
      setCurrentPage(0);
      setPosts([]);
      setHasMore(true);
      await loadPosts(true);
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle like',
        variant: 'destructive'
      });
    }
  };

  const handleShare = (postId: string) => {
    // Generate the direct link to the post detail view
    const postUrl = `${window.location.origin}/post/${postId}`;
    setShareUrl(postUrl);
    setShowShareModal(true);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Post Composer */}
      <PostComposer onPost={handleNewPost} onSignIn={onSignIn} />

      {/* Feed Content */}
      <div className="space-y-6">
        {/* {console.log('Rendering feed - posts:', posts.length, 'loading:', loading, 'activeTab:', activeTab, 'isAuthenticated:', isAuthenticated)} */}
        {loading ? (
          <div className="beat-card text-center py-12">
            <div className="text-muted-foreground text-lg mb-2">Loading...</div>
          </div>
        ) : posts.length === 0 ? (
          <div className="beat-card text-center py-12">
            {activeTab === 'following' ? (
              <>
                {isAuthenticated ? (
                  <>
                    <div className="text-muted-foreground text-lg mb-2">No posts from followed users</div>
                    <div className="text-muted-foreground text-sm">
                      Start following some artists to see their posts here, or switch to Home to discover new content!
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-muted-foreground text-lg mb-2">Sign in to follow users</div>
                    <div className="text-muted-foreground text-sm">
                      Create an account to follow your favorite artists and see their posts here!
                    </div>
                    <Button 
                      onClick={onSignIn}
                      className="mt-4 btn-gradient"
                    >
                      Sign In
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="text-muted-foreground text-lg mb-2">No posts yet</div>
                <div className="text-muted-foreground text-sm">Be the first to share something!</div>
              </>
            )}
          </div>
        ) : (
          posts.map((post) => (
            <div 
              key={post.id}
              className={`transition-all duration-300 ${
                highlightedPostId === post.id ? 'ring-2 ring-primary shadow-lg scale-102' : ''
              }`}
            >
              <UserPost 
                post={post}
                onLike={() => handleLike(post.id)}
                onComment={() => console.log('Comment on post', post.id)}
                onShare={() => handleShare(post.id)}
                onPostClick={() => onPostDetailView?.(post.id)}
                onDelete={() => {
                  // Reload posts when one is deleted
                  setCurrentPage(0);
                  setPosts([]);
                  setHasMore(true);
                  loadPosts(true);
                }} // Reload posts when one is deleted
                onUserProfileClick={onUserProfileClick}
                onSignIn={onSignIn}
              />
            </div>
          ))
        )}
      </div>
      
      {/* Load More Button */}
      {!loading && posts.length > 0 && hasMore && (
        <div className="text-center py-6">
          <Button 
            onClick={handleLoadMore}
            disabled={loadingMore}
            variant="outline"
            className="min-w-[140px]"
          >
            {loadingMore ? 'Loading...' : 'Load More Posts'}
          </Button>
        </div>
      )}

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
