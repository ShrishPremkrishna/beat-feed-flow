import { useState } from 'react';
import { BeatCard } from './BeatCard';
import { PostComposer } from './PostComposer';
import { UserPost } from './UserPost';
import { Sparkles } from 'lucide-react';
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
  const [posts, setPosts] = useState(mockPosts);
  const [beats, setBeats] = useState(mockBeats);

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