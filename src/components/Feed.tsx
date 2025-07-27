import { useState, useEffect } from 'react';
import { BeatCard } from './BeatCard';
import { PostComposer } from './PostComposer';
import { UserPost } from './UserPost';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import beatCover1 from '@/assets/beat-cover-1.jpg';
import beatCover2 from '@/assets/beat-cover-2.jpg';
import beatCover3 from '@/assets/beat-cover-3.jpg';

// Mock data
const mockBeats = [
  {
    id: '1',
    title: 'Dark Trap Vibes',
    artist: 'BeatMaker Pro',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop&crop=face',
    coverArt: beatCover1,
    bpm: 140,
    key: 'E Minor',
    mood: ['Dark', 'Trap', 'Energetic'],
    description: 'Perfect for rap vocals, dark atmosphere with heavy 808s',
    price: 75,
    likes: 234,
    comments: 45,
    duration: '3:24',
    isLiked: false
  },
  {
    id: '2',
    title: 'Chill Lo-Fi Study',
    artist: 'LoFi Queen',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612c944?w=400&h=400&fit=crop&crop=face',
    coverArt: beatCover2,
    bpm: 85,
    key: 'F Major',
    mood: ['Chill', 'Lo-Fi', 'Relaxed'],
    description: 'Smooth jazz chords with vinyl crackle, perfect for studying',
    likes: 156,
    comments: 28,
    duration: '2:45',
    isLiked: true
  },
  {
    id: '3',
    title: 'Future Bass Drop',
    artist: 'EDM Master',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    coverArt: beatCover3,
    bpm: 128,
    key: 'A Minor',
    mood: ['Future Bass', 'Energetic', 'Drop'],
    description: 'Massive future bass drop with evolving synths',
    price: 120,
    likes: 445,
    comments: 89,
    duration: '4:12',
    isLiked: false
  }
];

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
  const [beats, setBeats] = useState(mockBeats);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      // Load posts and beats in parallel
      const [postsResult, beatsResult] = await Promise.all([
        supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('beats')
          .select('*')
          .not('post_id', 'is', null) // Only get beats that are attached to posts (not replies)
          .order('created_at', { ascending: false })
      ]);

      const { data: postsData, error: postsError } = postsResult;
      const { data: beatsData, error: beatsError } = beatsResult;

      if (postsError) throw postsError;
      if (beatsError) throw beatsError;

      // Get unique user IDs from both posts and beats
      const postUserIds = postsData?.map(post => post.user_id) || [];
      const beatUserIds = beatsData?.map(beat => beat.user_id) || [];
      const userIds = [...new Set([...postUserIds, ...beatUserIds])];

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

      // Transform beats data to match BeatCard expectations
      const transformedBeats = beatsData?.map((beat: any) => {
        const profile = profileMap.get(beat.user_id);
        return {
          id: beat.id,
          title: beat.title || 'Untitled Beat',
          artist: profile?.display_name || profile?.username || 'Anonymous Artist',
          avatar: profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop&crop=face',
          coverArt: beat.cover_art_url || beatCover1, // Fallback to default cover
          bpm: beat.bpm || 120,
          key: beat.key || 'Unknown',
          mood: beat.mood || ['Unknown'],
          description: beat.artist || 'No description available',
          price: beat.price,
          likes: beat.likes_count || 0,
          comments: beat.comments_count || 0,
          duration: beat.duration ? `${Math.floor(beat.duration / 60)}:${(beat.duration % 60).toString().padStart(2, '0')}` : '0:00',
          isLiked: false, // TODO: Check if current user liked this beat
          file_url: beat.file_url
        };
      }) || [];

      // Use real data if available, otherwise fallback to mock data
      setPosts(transformedPosts.length > 0 ? transformedPosts : mockPosts);
      setBeats(transformedBeats.length > 0 ? transformedBeats : mockBeats);

    } catch (error) {
      console.error('Error loading data:', error);
      // Fallback to mock data if database query fails
      setPosts(mockPosts);
      setBeats(mockBeats);
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

  const handleBeatSwipe = (beatId: string, direction: 'left' | 'right') => {
    console.log(`Swiped ${direction} on beat ${beatId}`);
    // Here you would handle the swipe logic (shortlist, pass, etc.)
  };

  const handleLike = (id: string, type: 'beat' | 'post') => {
    if (type === 'beat') {
      setBeats(prev => prev.map(beat => 
        beat.id === id 
          ? { ...beat, isLiked: !beat.isLiked, likes: beat.isLiked ? beat.likes - 1 : beat.likes + 1 }
          : beat
      ));
    } else {
      setPosts(prev => prev.map(post => 
        post.id === id 
          ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
          : post
      ));
    }
  };

  // Simulate AI recommendations
  const aiRecommendedBeats = beats.slice(0, 1);
  const regularBeats = beats.slice(1);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Post Composer */}
      <PostComposer onPost={handleNewPost} />

      {/* AI Recommendations Header */}
      <div className="flex items-center gap-2 px-2">
        <Sparkles className="w-5 h-5 text-ai" />
        <h2 className="text-lg font-semibold text-ai">AI Recommendations</h2>
      </div>

      {/* AI Recommended Beats */}
      {aiRecommendedBeats.map((beat) => (
        <BeatCard
          key={beat.id}
          beat={beat}
          isAiRecommended={true}
          onSwipe={(direction) => handleBeatSwipe(beat.id, direction)}
          onLike={() => handleLike(beat.id, 'beat')}
          onComment={() => console.log('Comment on beat', beat.id)}
        />
      ))}

      {/* Feed Content */}
      <div className="space-y-6">
        {/* Mix of posts and beats */}
        {posts.map((post, index) => (
          <div key={post.id}>
            <UserPost 
              post={post}
              onLike={() => handleLike(post.id, 'post')}
              onComment={() => console.log('Comment on post', post.id)}
            />
            
            {/* Intersperse beats between posts */}
            {index < regularBeats.length && (
              <div className="mt-6">
                <BeatCard
                  beat={regularBeats[index]}
                  onSwipe={(direction) => handleBeatSwipe(regularBeats[index].id, direction)}
                  onLike={() => handleLike(regularBeats[index].id, 'beat')}
                  onComment={() => console.log('Comment on beat', regularBeats[index].id)}
                />
              </div>
            )}
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