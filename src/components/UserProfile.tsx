import { useState, useEffect } from 'react';
import { MapPin, Link as LinkIcon, Calendar, Star, Edit, Instagram, Twitter, Music, ArrowLeft, MessageCircle, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPost } from './UserPost';
import { ProfileEditModal } from './ProfileEditModal';
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
}

export const UserProfile = ({ user, isOwnProfile = false, onBackToFeed }: UserProfileProps) => {
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

      // Load user's posts
      const { data: posts } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          likes_count,
          comments_count,
          profiles!posts_user_id_fkey (
            display_name,
            username,
            avatar_url
          )
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      // Load user's replies (comments with beats)
      const { data: replies } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          post_id,
          beat_id,
          profiles!comments_user_id_fkey (
            display_name,
            username,
            avatar_url
          ),
          posts!comments_post_id_fkey (
            content,
            profiles!posts_user_id_fkey (
              display_name,
              username,
              avatar_url
            )
          ),
          beats (
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

      setUserPosts(posts || []);
      setUserReplies(replies || []);
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
              <UserPost
                key={postData.id}
                post={{
                  id: postData.id,
                  content: postData.content,
                  author: {
                    name: postData.profiles?.display_name || postData.profiles?.username || 'Anonymous',
                    avatar: postData.profiles?.avatar_url || ''
                  },
                  timestamp: new Date(postData.created_at).toLocaleDateString(),
                  likes: postData.likes_count || 0,
                  comments: postData.comments_count || 0,
                  isLiked: false
                }}
                onLike={() => {}}
                onComment={() => {}}
                onShare={() => {}}
              />
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
              <div key={reply.id} className="beat-card space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {reply.profiles?.avatar_url ? (
                      <img 
                        src={reply.profiles.avatar_url}
                        alt={reply.profiles?.display_name || 'User'}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-lg font-bold text-muted-foreground">
                          {(reply.profiles?.display_name || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{reply.profiles?.display_name || reply.profiles?.username || 'Anonymous'}</span>
                      <span className="text-muted-foreground text-sm">replied to</span>
                      <span className="font-semibold">{reply.posts?.profiles?.display_name || reply.posts?.profiles?.username || 'User'}</span>
                      <span className="text-muted-foreground text-sm">•</span>
                      <span className="text-muted-foreground text-sm">{new Date(reply.created_at).toLocaleDateString()}</span>
                    </div>
                    {reply.content && (
                      <p className="text-foreground mb-3">{reply.content}</p>
                    )}
                    {reply.beats && (
                      <div className="bg-muted/30 rounded-lg p-4 border border-border">
                        <div className="flex items-center gap-3">
                          {reply.beats.cover_art_url && (
                            <img 
                              src={reply.beats.cover_art_url}
                              alt={reply.beats.title}
                              className="w-16 h-16 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground">{reply.beats.title}</h4>
                            <p className="text-muted-foreground text-sm">{reply.beats.artist}</p>
                            {reply.beats.bpm && reply.beats.key && (
                              <div className="flex gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">{reply.beats.bpm} BPM</Badge>
                                <Badge variant="secondary" className="text-xs">{reply.beats.key}</Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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