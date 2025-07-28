import { useState, useEffect } from 'react';
import { MapPin, Link as LinkIcon, Calendar, Star, Edit, Instagram, Twitter, Music, ArrowLeft, MessageCircle, Heart, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPost } from './UserPost';
import { ProfileEditModal } from './ProfileEditModal';
import { BeatPlayer } from './BeatPlayer';
import { supabase } from '@/integrations/supabase/client';

interface UserProfileProps {
  user?: {
    name: string;
    username: string;
    avatar: string;
    bio: string;
    location: string;
    joinDate: string;
    website: string;
    social: {
      instagram?: string;
      twitter?: string;
      beatstars?: string;
    };
    stats: {
      followers: number;
      following: number;
      beats: number;
      likes: number;
    };
    genres: string[];
    placements: string[];
    rating: number;
    isVerified: boolean;
  };
  isOwnProfile?: boolean;
  onBackToFeed?: () => void;
  onPostClick?: (postId: string) => void;
}

export const UserProfile = ({ user, isOwnProfile = false, onBackToFeed, onPostClick }: UserProfileProps) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(user);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userReplies, setUserReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const defaultUser = {
    name: 'BeatMaker Pro',
    username: '@beatmaker_pro',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop&crop=face',
    bio: 'Producer specializing in trap & hip-hop beats. Over 1M streams across platforms. Available for custom work.',
    location: 'Atlanta, GA',
    joinDate: 'January 2022',
    website: 'beatmaker.pro',
    social: {
      instagram: 'beatmaker_pro',
      twitter: 'beatmaker_pro',
      beatstars: 'beatmaker-pro'
    },
    stats: {
      followers: 12500,
      following: 340,
      beats: 156,
      likes: 45200
    },
    genres: ['Trap', 'Hip-Hop', 'R&B', 'Drill'],
    placements: ['Lil Baby', 'Future', 'Travis Scott'],
    rating: 4.8,
    isVerified: true
  };

  const profileUser = currentProfile || user || defaultUser;

  useEffect(() => {
    loadUserActivity();
  }, []);

  const loadUserActivity = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      console.log('Current user ID:', currentUser.id);

      // Load user's posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          likes_count,
          comments_count,
          user_id
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      console.log('Posts query result:', posts, 'Error:', postsError);

      // Load user's replies (comments with beats)
      const { data: replies, error: repliesError } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          post_id,
          beat_id,
          user_id,
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
        .eq('user_id', currentUser.id)
        .not('beat_id', 'is', null)
        .order('created_at', { ascending: false });

      console.log('Replies query result:', replies, 'Error:', repliesError);

      // Check which replies the current user has liked
      let userLikes: string[] = [];
      if (replies?.length) {
        const { data: likesData } = await supabase
          .from('likes')
          .select('comment_id')
          .eq('user_id', currentUser.id)
          .in('comment_id', replies.map(r => r.id));
        
        userLikes = likesData?.map(l => l.comment_id) || [];
      }

      // Load current user profile for display
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('display_name, username, avatar_url')
        .eq('user_id', currentUser.id)
        .single();

      console.log('User profile:', userProfile);

      // Transform replies to include like state
      const transformedReplies = replies?.map(reply => ({
        ...reply,
        isLiked: userLikes.includes(reply.id)
      })) || [];

      setUserPosts(posts || []);
      setUserReplies(transformedReplies);
    } catch (error) {
      console.error('Error loading user activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = (updatedProfile: any) => {
    setCurrentProfile(updatedProfile);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back to Feed Button */}
      {onBackToFeed && (
        <Button 
          variant="ghost" 
          onClick={onBackToFeed}
          className="mb-4 hover:bg-muted"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Feed
        </Button>
      )}

      {/* Profile Header */}
      <div className="beat-card">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar */}
          <div className="relative">
            {profileUser.avatar ? (
              <img 
                src={profileUser.avatar} 
                alt={profileUser.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-muted border-4 border-primary/20 flex items-center justify-center">
                <span className="text-4xl font-bold text-muted-foreground">
                  {profileUser.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {profileUser.isVerified && (
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Star className="w-4 h-4 text-white fill-current" />
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">{profileUser.name}</h1>
                {profileUser.isVerified && (
                  <Badge className="bg-primary/20 text-primary">Verified</Badge>
                )}
              </div>
              <p className="text-muted-foreground text-lg">{profileUser.username}</p>
            </div>

            <p className="text-foreground leading-relaxed">{profileUser.bio}</p>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {profileUser.location}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Joined {profileUser.joinDate}
              </div>
              <div className="flex items-center gap-1">
                <LinkIcon className="w-4 h-4" />
                <a href={`https://${profileUser.website}`} className="text-primary hover:underline">
                  {profileUser.website}
                </a>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-current text-yellow-500" />
                {profileUser.rating} rating
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-3">
              {profileUser.social.instagram && (
                <Button variant="outline" size="sm">
                  <Instagram className="w-4 h-4 mr-2" />
                  Instagram
                </Button>
              )}
              {profileUser.social.twitter && (
                <Button variant="outline" size="sm">
                  <Twitter className="w-4 h-4 mr-2" />
                  Twitter
                </Button>
              )}
              {profileUser.social.beatstars && (
                <Button variant="outline" size="sm">
                  <Music className="w-4 h-4 mr-2" />
                  BeatStars
                </Button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {isOwnProfile ? (
                <Button className="btn-gradient" onClick={() => setShowEditModal(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button 
                    className="btn-gradient"
                    onClick={() => setIsFollowing(!isFollowing)}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                  <Button variant="outline">
                    Message
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{profileUser.stats.followers.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{profileUser.stats.following.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Following</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{profileUser.stats.beats}</div>
            <div className="text-sm text-muted-foreground">Beats</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{profileUser.stats.likes.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Likes</div>
          </div>
        </div>

        {/* Genres */}
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="font-semibold mb-3 text-foreground">Genres</h3>
          <div className="flex flex-wrap gap-2">
            {profileUser.genres.map((genre) => (
              <Badge key={genre} variant="secondary" className="bg-primary/20 text-primary">
                {genre}
              </Badge>
            ))}
          </div>
        </div>

        {/* Notable Placements */}
        {profileUser.placements.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="font-semibold mb-3 text-foreground">Notable Placements</h3>
            <div className="flex flex-wrap gap-2">
              {profileUser.placements.map((artist) => (
                <Badge key={artist} className="bg-accent/20 text-accent">
                  {artist}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="posts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-muted">
          <TabsTrigger value="posts">My Posts</TabsTrigger>
          <TabsTrigger value="replies">My Replies</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading posts...
            </div>
          ) : userPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No posts yet
            </div>
          ) : (
             userPosts.map((postData) => (
               <div key={postData.id}>
                 <UserPost
                   post={{
                    id: postData.id,
                    content: postData.content,
                    author: {
                      name: currentProfile?.name || 'Anonymous',
                      avatar: currentProfile?.avatar || ''
                    },
                    timestamp: new Date(postData.created_at).toLocaleDateString(),
                    likes: postData.likes_count || 0,
                    comments: postData.comments_count || 0,
                    isLiked: false
                  }}
                  onLike={() => {
                    // Handle like functionality - no need to prevent event since UserPost handles it
                  }}
                  onComment={() => {
                    // Handle comment functionality
                  }}
                  onShare={() => {
                    // Handle share functionality
                  }}
                  onPostClick={() => onPostClick?.(postData.id)}
                />
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="replies" className="space-y-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading replies...
            </div>
          ) : userReplies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No replies yet
            </div>
          ) : (
             userReplies.map((reply) => (
               <div 
                 key={reply.id} 
                 className="beat-card space-y-4 cursor-pointer hover:bg-muted/50 transition-colors"
                 onClick={(e) => {
                   e.preventDefault();
                   onPostClick?.(reply.post_id);
                 }}
               >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {currentProfile?.avatar ? (
                      <img 
                        src={currentProfile.avatar}
                        alt={currentProfile?.name || 'User'}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-lg font-bold text-muted-foreground">
                          {(currentProfile?.name || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{currentProfile?.name || 'Anonymous'}</span>
                      <span className="text-muted-foreground text-sm">replied with a beat</span>
                      <span className="text-muted-foreground text-sm">•</span>
                      <span className="text-muted-foreground text-sm">{new Date(reply.created_at).toLocaleDateString()}</span>
                    </div>
                    {reply.content && (
                      <p className="text-foreground mb-3">{reply.content}</p>
                    )}
                    {reply.beats && (
                      <div 
                        className="bg-muted/30 rounded-lg border border-border overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <BeatPlayer
                          audioUrl={reply.beats.file_url || ''}
                          title={reply.beats.title || 'Untitled Beat'}
                          artist={reply.beats.artist || currentProfile?.name || 'Anonymous'}
                          bpm={reply.beats.bpm || undefined}
                          key={reply.beats.key || undefined}
                          mood={reply.beats.mood || undefined}
                          className="p-4"
                         />
                       </div>
                     )}
                     
                     {/* Reply Actions - Show likes only */}
                     <div className="flex items-center gap-4 pt-3 border-t border-border/30 mt-3">
                       <div className="flex items-center gap-1 text-muted-foreground">
                         <Heart className={`w-4 h-4 ${reply.isLiked ? 'fill-current text-red-500' : ''}`} />
                         <span className="text-sm">{reply.likes_count || 0} likes</span>
                       </div>
                     </div>
                   </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Profile Modal */}
      <ProfileEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        currentProfile={currentProfile || user}
        onProfileUpdate={handleProfileUpdate}
      />
    </div>
  );
};