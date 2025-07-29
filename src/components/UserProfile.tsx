import { useState, useEffect } from 'react';
import { MapPin, Link as LinkIcon, Calendar, Star, Edit, Instagram, Twitter, Music, ArrowLeft, MessageCircle, Heart, Play, Volume2, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPost } from './UserPost';
import { ProfileEditModal } from './ProfileEditModal';
import { BeatPlayer } from './BeatPlayer';

import { InitialsAvatar } from '@/components/ui/initials-avatar';

import { ShareModal } from './ShareModal';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatNumber, formatFollowerCount } from '@/lib/utils';

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
      likes: number;
    };

  };
  isOwnProfile?: boolean;
  onBackToFeed?: () => void;
  onPostClick?: (postId: string) => void;
  userId?: string;
}

export const UserProfile = ({ user, isOwnProfile, onBackToFeed, onPostClick, userId }: UserProfileProps) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userReplies, setUserReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  
  // All stats as state variables
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [followingList, setFollowingList] = useState<any[]>([]);

  const [showFollowersList, setShowFollowersList] = useState(false);
  const [showFollowingList, setShowFollowingList] = useState(false);

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const { toast } = useToast();


  const defaultUser = {
    name: 'User',
    username: '@user',
    avatar: '',
    bio: '',
    joinDate: 'Recently',
    social: {
      instagram: '',
      twitter: '',
      beatstars: ''
    },
    stats: {
      followers: 0,
      following: 0,
      likes: 0
    }
  };

  const profileUser = currentProfile || user || defaultUser;

  useEffect(() => {
    console.log('UserProfile useEffect triggered with userId:', userId);
    setLoading(true);
    
    const loadAll = async () => {
      try {
        await loadUserActivity();
        if (userId) {
          await checkFollowStatus();
        }
        // Always load profile stats (for own profile or other user's profile)
        await loadProfileStats();
      } catch (error) {
        console.error('Error in UserProfile useEffect:', error);
      }
    };
    
    loadAll();
  }, [userId]);

  const loadUserActivity = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Use the provided userId or fall back to current user
      const targetUserId = userId || currentUser.id;
      console.log('Loading activity for user ID:', targetUserId);

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
        .eq('user_id', targetUserId)
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
        .eq('user_id', targetUserId)
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

      // Load user profile for display (the one being viewed)
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      console.log('User profile:', userProfile);

      // Transform replies to include like state
      const transformedReplies = replies?.map(reply => ({
        ...reply,
        isLiked: userLikes.includes(reply.id)
      })) || [];

      setUserPosts(posts || []);
      setUserReplies(transformedReplies);
      
      // Update follower/following counts from the user profile
      if (userProfile) {
        setFollowersCount(userProfile.followers_count || 0);
        setFollowingCount(userProfile.following_count || 0);
        
        // Set current profile with complete database data
        setCurrentProfile({
          ...(user || defaultUser),
          name: userProfile.display_name || userProfile.username || 'Anonymous User',
          avatar: userProfile.avatar_url || '',
          // Include all database profile fields for editing
          ...userProfile,
          // Update stats with fresh data
          stats: {
            ...(user?.stats || defaultUser.stats),
            followers: userProfile.followers_count || 0,
            following: userProfile.following_count || 0
          }
        });
      }
    } catch (error) {
      console.error('Error loading user activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser || !userId || userId === currentUser.id) {
        setIsFollowing(false);
        return;
      }

      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        throw error;
      }

      setIsFollowing(!!data);
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser || !userId || userId === currentUser.id) return;

      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', userId);

        if (error) throw error;

        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: userId
          });

        if (error) throw error;

        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
      
      // Reload stats to ensure they're accurate
      setTimeout(() => {
        loadProfileStats();
      }, 100);
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const loadFollowersList = async () => {
    try {
      let targetUserId = userId;
      
      // If no userId provided, get current user's ID
      if (!targetUserId) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        targetUserId = currentUser?.id;
      }
      
      if (!targetUserId) return;

      console.log('Loading followers for user:', targetUserId);

      // First get the follow relationships
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', targetUserId);

      if (followsError) throw followsError;

      console.log('Follows data:', followsData);

      if (!followsData || followsData.length === 0) {
        setFollowersList([]);
        setShowFollowersList(true);
        return;
      }

      // Then get the profiles for those followers
      const followerIds = followsData.map(follow => follow.follower_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url')
        .in('user_id', followerIds);

      if (profilesError) throw profilesError;

      console.log('Followers profiles:', profilesData);

      const followers = profilesData || [];
      setFollowersList(followers);
      setShowFollowersList(true);
    } catch (error) {
      console.error('Error loading followers:', error);
    }
  };

  const loadFollowingList = async () => {
    try {
      let targetUserId = userId;
      
      // If no userId provided, get current user's ID
      if (!targetUserId) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        targetUserId = currentUser?.id;
      }
      
      if (!targetUserId) return;

      console.log('Loading following for user:', targetUserId);

      // First get the follow relationships
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', targetUserId);

      if (followsError) throw followsError;

      console.log('Following data:', followsData);

      if (!followsData || followsData.length === 0) {
        setFollowingList([]);
        setShowFollowingList(true);
        return;
      }

      // Then get the profiles for those users being followed
      const followingIds = followsData.map(follow => follow.following_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url')
        .in('user_id', followingIds);

      if (profilesError) throw profilesError;

      console.log('Following profiles:', profilesData);

      const following = profilesData || [];
      setFollowingList(following);
      setShowFollowingList(true);
    } catch (error) {
      console.error('Error loading following:', error);
    }
  };

  const loadProfileStats = async () => {
    try {
      let targetUserId = userId;
      
      // If no userId provided, try to get it from the current user
      if (!targetUserId) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        targetUserId = currentUser?.id;
      }
      
      if (!targetUserId) return;

      // Get follower/following counts from profiles
      const { data: profileStats, error } = await supabase
        .from('profiles')
        .select('followers_count, following_count')
        .eq('user_id', targetUserId)
        .single();

      if (error) {
        console.error('Error loading profile stats:', error);
        return;
      }

      if (profileStats) {
        setFollowersCount(profileStats.followers_count || 0);
        setFollowingCount(profileStats.following_count || 0);
      }

      // Calculate total likes from actual posts and replies
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('likes_count')
        .eq('user_id', targetUserId);

      const { data: replies, error: repliesError } = await supabase
        .from('comments')
        .select('likes_count')
        .eq('user_id', targetUserId);

      if (!postsError && !repliesError) {
        const totalPostLikes = posts?.reduce((sum, post) => sum + (post.likes_count || 0), 0) || 0;
        const totalReplyLikes = replies?.reduce((sum, reply) => sum + (reply.likes_count || 0), 0) || 0;
        const totalLikes = totalPostLikes + totalReplyLikes;
        setLikesCount(totalLikes);
      }
    } catch (error) {
      console.error('Error loading profile stats:', error);
    }
  };

  const handleProfileUpdate = (updatedProfile: any) => {
    // Update currentProfile with complete database data and proper structure
    setCurrentProfile({
      ...(user || defaultUser),
      name: updatedProfile.display_name || updatedProfile.username || 'Anonymous User',
      avatar: updatedProfile.avatar_url || '',
      // Include all database profile fields
      ...updatedProfile,
      // Preserve stats structure
      stats: {
        ...(user?.stats || defaultUser.stats),
        followers: updatedProfile.followers_count || 0,
        following: updatedProfile.following_count || 0
      }
    });
  };

  const handleShare = (postId: string) => {
    // Generate the direct link to the post detail view
    const postUrl = `${window.location.origin}/post/${postId}`;
    setShareUrl(postUrl);
    setShowShareModal(true);
  };

  // Show followers/following lists
  if (showFollowersList) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => setShowFollowersList(false)}
          className="mb-4 hover:bg-muted"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profile
        </Button>
        
        <div className="beat-card">
          <h2 className="text-2xl font-bold mb-6">Followers ({followersList.length})</h2>
          <div className="space-y-4">
            {followersList.map((follower) => (
              <div key={follower.user_id} className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors">
                {follower.avatar_url ? (
                  <img 
                    src={follower.avatar_url} 
                    alt={follower.display_name || follower.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-lg font-bold">
                      {(follower.display_name || follower.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <div className="font-medium">{follower.display_name || 'Anonymous'}</div>
                  <div className="text-sm text-muted-foreground">@{follower.username}</div>
                </div>
              </div>
            ))}
            {followersList.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No followers yet
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showFollowingList) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => setShowFollowingList(false)}
          className="mb-4 hover:bg-muted"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profile
        </Button>
        
        <div className="beat-card">
          <h2 className="text-2xl font-bold mb-6">Following ({followingList.length})</h2>
          <div className="space-y-4">
            {followingList.map((following) => (
              <div key={following.user_id} className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors">
                {following.avatar_url ? (
                  <img 
                    src={following.avatar_url} 
                    alt={following.display_name || following.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-lg font-bold">
                      {(following.display_name || following.username || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <div className="font-medium">{following.display_name || 'Anonymous'}</div>
                  <div className="text-sm text-muted-foreground">@{following.username}</div>
                </div>
              </div>
            ))}
            {followingList.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Not following anyone yet
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while data is being fetched
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
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
        <div className="text-center py-12 text-muted-foreground">
          Loading profile...
        </div>
      </div>
    );
  }

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
            <InitialsAvatar
              name={profileUser.name}
              avatarUrl={profileUser.avatar}
              size="xl"
            />
          </div>

          {/* Profile Info */}
          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">{profileUser.name}</h1>
              </div>
              <p className="text-muted-foreground text-lg">{profileUser.username}</p>
            </div>

            <p className="text-foreground leading-relaxed">{profileUser.bio}</p>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Joined {profileUser.joinDate}
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-3 flex-wrap">
              {profileUser.instagram && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://instagram.com/${profileUser.instagram}`} target="_blank" rel="noopener noreferrer">
                    <Instagram className="w-4 h-4 mr-2" />
                    Instagram
                  </a>
                </Button>
              )}
              {profileUser.twitter && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://twitter.com/${profileUser.twitter}`} target="_blank" rel="noopener noreferrer">
                    <Twitter className="w-4 h-4 mr-2" />
                    Twitter
                  </a>
                </Button>
              )}
              {profileUser.beatstars && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://beatstars.com/${profileUser.beatstars}`} target="_blank" rel="noopener noreferrer">
                    <Music className="w-4 h-4 mr-2" />
                    BeatStars
                  </a>
                </Button>
              )}
              {profileUser.soundcloud && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://soundcloud.com/${profileUser.soundcloud}`} target="_blank" rel="noopener noreferrer">
                    <Volume2 className="w-4 h-4 mr-2" />
                    SoundCloud
                  </a>
                </Button>
              )}
              {profileUser.spotify && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://open.spotify.com/artist/${profileUser.spotify}`} target="_blank" rel="noopener noreferrer">
                    <Music className="w-4 h-4 mr-2" />
                    Spotify
                  </a>
                </Button>
              )}
              {profileUser.youtube && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://youtube.com/@${profileUser.youtube}`} target="_blank" rel="noopener noreferrer">
                    <Youtube className="w-4 h-4 mr-2" />
                    YouTube
                  </a>
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
                    onClick={handleFollow}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
          <div 
            className={`text-center p-2 rounded transition-colors ${
              isOwnProfile 
                ? 'cursor-pointer hover:bg-muted/50' 
                : 'cursor-default'
            }`}
            onClick={isOwnProfile ? loadFollowersList : undefined}
          >
                            <div className="text-2xl font-bold text-foreground">{formatFollowerCount(followersCount)}</div>
            <div className="text-sm text-muted-foreground">Followers</div>
          </div>
          <div 
            className={`text-center p-2 rounded transition-colors ${
              isOwnProfile 
                ? 'cursor-pointer hover:bg-muted/50' 
                : 'cursor-default'
            }`}
            onClick={isOwnProfile ? loadFollowingList : undefined}
          >
                            <div className="text-2xl font-bold text-foreground">{formatFollowerCount(followingCount)}</div>
            <div className="text-sm text-muted-foreground">Following</div>
          </div>
          <div className="text-center">
                            <div className="text-2xl font-bold text-foreground">{formatNumber(likesCount)}</div>
            <div className="text-sm text-muted-foreground">Total Likes</div>
          </div>
        </div>




      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="posts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-muted">
          <TabsTrigger value="posts">My Posts ({userPosts.length})</TabsTrigger>
          <TabsTrigger value="replies">My Replies ({userReplies.length})</TabsTrigger>
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
                  onShare={() => handleShare(postData.id)}
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
                    <InitialsAvatar
                      name={currentProfile?.name || 'User'}
                      avatarUrl={currentProfile?.avatar}
                      size="md"
                    />
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
                         <span className="text-sm">{formatNumber(reply.likes_count || 0)} likes</span>
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