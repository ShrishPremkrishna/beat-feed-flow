import { useState, useEffect } from 'react';
import { PostComposer } from './PostComposer';
import { UserPost } from './UserPost';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FeedProps {
  highlightedPostId?: string | null;
  onPostDetailView?: (postId: string) => void;
}

const mockPosts = [
  {
    id: 'p1',
    content: 'Looking for a hard trap beat for my new track! Something dark with heavy 808s. Budget around $100. Drop your beats below! 🔥',
    author: {
      name: 'MC Flow',
      avatar: ''
    },
    timestamp: '1 hour ago',
    likes: 23,
    comments: 12,
    isLiked: false
  },
  {
    id: 'p2',
    content: 'Just dropped this new lo-fi beat! Perfect for late night vibes ✨ What do you think?',
    author: {
      name: 'Chill Beats',
      avatar: ''
    },
    timestamp: '3 hours ago',
    likes: 67,
    comments: 8,
    isLiked: true
  }
];

export const Feed = ({ highlightedPostId, onPostDetailView }: FeedProps) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Load posts only
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Get unique user IDs from posts
      const postUserIds = postsData?.map(post => post.user_id) || [];

      // Load profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url')
        .in('user_id', postUserIds);

      if (profilesError) throw profilesError;

      // Check which posts the current user has liked
      let userLikes: string[] = [];
      if (currentUser && postsData?.length) {
        const { data: likesData } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', currentUser.id)
          .in('post_id', postsData.map(p => p.id));
        
        userLikes = likesData?.map(l => l.post_id) || [];
      }

      // Create a map of user_id to profile for quick lookup
      const profileMap = new Map();
      profilesData?.forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });

      // Transform posts data
      const transformedPosts = postsData?.map((post: any) => {
        const profile = profileMap.get(post.user_id);
        return {
          ...post,
          author: {
            name: profile?.display_name || profile?.username || 'Anonymous User',
            avatar: profile?.avatar_url || ''
          },
          timestamp: new Date(post.created_at).toLocaleString(),
          likes: post.likes_count || 0,
          comments: post.comments_count || 0,
          isLiked: userLikes.includes(post.id)
        };
      }) || [];

      // Use real data if available, otherwise fallback to mock data
      setPosts(transformedPosts.length > 0 ? transformedPosts : mockPosts);

    } catch (error) {
      console.error('Error loading data:', error);
      // Fallback to mock data if database query fails
      setPosts(mockPosts);
      toast({
        title: "Using sample data",
        description: "Loading data from database failed, showing sample content.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewPost = (post: any) => {
    setPosts(prev => [post, ...prev]);
  };

  const handleLike = async (postId: string) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      toast({
        title: 'Please log in',
        description: 'You need to be logged in to like posts',
        variant: 'destructive'
      });
      return;
    }

    const post = posts.find(p => p.id === postId);
    const isCurrentlyLiked = post?.isLiked;

    // Optimistic update
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, isLiked: !isCurrentlyLiked, likes: isCurrentlyLiked ? p.likes - 1 : p.likes + 1 }
        : p
    ));

    try {
      if (isCurrentlyLiked) {
        // Unlike the post
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('post_id', postId);
      } else {
        // Like the post
        await supabase
          .from('likes')
          .insert({
            user_id: currentUser.id,
            post_id: postId
          });
      }
    } catch (error) {
      // Revert optimistic update on error
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, isLiked: isCurrentlyLiked, likes: isCurrentlyLiked ? p.likes + 1 : p.likes - 1 }
          : p
      ));
      
      console.error('Error toggling like:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle like',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Post Composer */}
      <PostComposer onPost={handleNewPost} />

      {/* Feed Content */}
      <div className="space-y-6">
        {posts.map((post) => (
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
              onPostClick={() => onPostDetailView?.(post.id)}
              onDelete={() => loadPosts()} // Reload posts when one is deleted
            />
          </div>
        ))}
      </div>

      {/* Load More */}
      <div className="flex justify-center py-8">
        <div className="text-muted-foreground animate-pulse">Loading more content...</div>
      </div>
    </div>
  );
};