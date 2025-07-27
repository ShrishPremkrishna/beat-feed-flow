import { useState, useEffect } from 'react';
import { PostComposer } from './PostComposer';
import { UserPost } from './UserPost';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const mockPosts = [
  {
    id: 'p1',
    content: 'Looking for a hard trap beat for my new track! Something dark with heavy 808s. Budget around $100. Drop your beats below! 🔥',
    author: {
      name: 'MC Flow',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'
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
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face'
    },
    timestamp: '3 hours ago',
    likes: 67,
    comments: 8,
    isLiked: true
  }
];

export const Feed = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
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
            avatar: profile?.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'
          },
          timestamp: new Date(post.created_at).toLocaleString(),
          likes: post.likes_count || 0,
          comments: post.comments_count || 0
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

  const handleLike = (id: string, type: 'post') => {
    setPosts(prev => prev.map(post => 
      post.id === id 
        ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
        : post
    ));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Post Composer */}
      <PostComposer onPost={handleNewPost} />

      {/* Feed Content */}
      <div className="space-y-6">
        {posts.map((post) => (
          <UserPost 
            key={post.id}
            post={post}
            onLike={() => handleLike(post.id, 'post')}
            onComment={() => console.log('Comment on post', post.id)}
          />
        ))}
      </div>

      {/* Load More */}
      <div className="flex justify-center py-8">
        <div className="text-muted-foreground animate-pulse">Loading more content...</div>
      </div>
    </div>
  );
};