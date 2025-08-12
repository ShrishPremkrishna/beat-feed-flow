import { useState, useEffect } from 'react';
import { MapPin, Link as LinkIcon, Calendar, Star, Edit, Instagram, Twitter, Music, ArrowLeft, MessageCircle, Heart, Play, Volume2, Youtube, Download, X } from 'lucide-react';
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
  onPostClick?: (postId: string, profileData?: any) => void;
  userId?: string;
  onProfileUpdate?: (profile: any) => void;
  onSignIn?: () => void;
  onMessageUser?: (userId: string) => void;
}

export const UserProfile = ({ user, isOwnProfile, onBackToFeed, onPostClick, userId, onProfileUpdate, onSignIn, onMessageUser }: UserProfileProps) => {
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
  const [showDownloadsModal, setShowDownloadsModal] = useState(false);
  const [userDownloads, setUserDownloads] = useState<any[]>([]);
  const [loadingDownloads, setLoadingDownloads] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<{[key: string]: boolean}>({});
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
            purchase_link
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
          isLiked: userLikes.includes(reply.id),
          beatReaction: null
        })) || [];

      // Load download status for beats (only for own profile)
      if (isOwnProfile && transformedReplies.length > 0) {
        // Note: downloads functionality temporarily disabled for type safety
        // const beatIds = transformedReplies
        //   .filter(reply => reply.beats?.id)
        //   .map(reply => reply.beats.id);
        
        // if (beatIds.length > 0) {
        //   const { data: downloadsData } = await supabase
        //     .from('downloads')
        //     .select('beat_id')
        //     .in('beat_id', beatIds);
          
        const downloadMap: {[key: string]: boolean} = {};
        //   downloadsData?.forEach((download: any) => {
        //     downloadMap[download.beat_id] = true;
        //   });
          
        setDownloadStatus(downloadMap);
        // }
      }

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
      if (!currentUser) {
        onSignIn?.();
        return;
      }
      
      if (!userId || userId === currentUser.id) return;

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
    
    // Also notify the parent component to update the navbar
    onProfileUpdate?.(updatedProfile);
  };

  const handleShare = (postId: string) => {
    // Generate the direct link to the post detail view for GitHub Pages (hash routing)
    const postUrl = `${window.location.origin}${import.meta.env.BASE_URL}#/post/${postId}`;
    setShareUrl(postUrl);
    setShowShareModal(true);
  };

  const handleUnfollow = async (userIdToUnfollow: string) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Remove the follow relationship
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', userIdToUnfollow);

      if (error) throw error;

      // Remove the user from the following list
      setFollowingList(prev => prev.filter(user => user.user_id !== userIdToUnfollow));
      
      // Update the following count
      setFollowingCount(prev => Math.max(0, prev - 1));

      toast({
        title: "Unfollowed",
        description: "User has been removed from your following list.",
      });
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toast({
        title: "Error",
        description: "Failed to unfollow user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const loadUserDownloads = async () => {
    try {
      setLoadingDownloads(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Get all downloads for the current user
      const { data: downloads, error } = await (supabase as any)
        .from('downloads')
        .select(`
          beat_id,
          downloaded_at,
          beats (
            id,
            title,
            artist,
            file_url,
            bpm,
            key,
            purchase_link,
            user_id
          )
        `)
        .eq('downloaded_by', currentUser.id)
        .order('downloaded_at', { ascending: false });

      if (error) throw error;

      // Get producer names for the beats
      const beatUserIds = downloads?.map(download => download.beats?.user_id).filter(Boolean) || [];
      const { data: producerProfiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username')
        .in('user_id', beatUserIds);

      // Create profile map
      const profileMap = new Map();
      producerProfiles?.forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });

      // Remove duplicates and add producer names
      const uniqueDownloads = downloads?.reduce((acc: any[], download: any) => {
        const existingIndex = acc.findIndex(d => d.beat_id === download.beat_id);
        if (existingIndex === -1) {
          const producerProfile = profileMap.get(download.beats?.user_id);
          acc.push({
            ...download,
            beats: {
              ...download.beats,
              producer_name: producerProfile?.display_name || producerProfile?.username || 'Anonymous'
            }
          });
        }
        return acc;
      }, []) || [];

      setUserDownloads(uniqueDownloads);
    } catch (error) {
      console.error('Error loading downloads:', error);
      toast({
        title: "Error",
        description: "Failed to load downloads. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingDownloads(false);
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
                <InitialsAvatar
                  name={follower.display_name || follower.username || 'User'}
                  avatarUrl={follower.avatar_url}
                  size="md"
                />
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
              <div key={following.user_id} className="flex items-center justify-between p-3 hover:bg-muted rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <InitialsAvatar
                    name={following.display_name || following.username || 'User'}
                    avatarUrl={following.avatar_url}
                    size="md"
                  />
                  <div>
                    <div className="font-medium">{following.display_name || 'Anonymous'}</div>
                    <div className="text-sm text-muted-foreground">@{following.username}</div>
                  </div>
                </div>
                {isOwnProfile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnfollow(following.user_id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                  >
                    Unfollow
                  </Button>
                )}
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
          className="mb-4"
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
                <>
                  <Button className="btn-gradient" onClick={() => setShowEditModal(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setShowDownloadsModal(true);
                    loadUserDownloads();
                  }}>
                    <Download className="w-4 h-4 mr-2" />
                    My Downloads
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    className="btn-gradient"
                    onClick={handleFollow}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                  <Button variant="outline" onClick={() => onMessageUser?.(userId || '')}>
                    <MessageCircle className="w-4 h-4 mr-2" />
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
          <TabsTrigger value="posts">Posts ({userPosts.length})</TabsTrigger>
          <TabsTrigger value="replies">Replies ({userReplies.length})</TabsTrigger>
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
                  onPostClick={() => onPostClick?.(postData.id, currentProfile)}
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
                        className="bg-muted/30 rounded-lg border border-border overflow-hidden relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Downloaded indicator - only show to beat creator */}
                        {isOwnProfile && downloadStatus[reply.beats.id] && (
                          <div className="absolute top-2 left-2 z-10">
                            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1">
                              <Download className="w-3 h-3" />
                              Downloaded by Artist
                            </div>
                          </div>
                        )}


                        <BeatPlayer
                          audioUrl={reply.beats.file_url || ''}
                          title={reply.beats.title || 'Untitled Beat'}
                          artist={reply.beats.artist || currentProfile?.name || 'Anonymous'}
                          bpm={reply.beats.bpm || undefined}
                          beatKey={reply.beats.key || undefined}
                          purchaseLink={reply.beats.purchase_link || undefined}
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

      {/* Downloads Modal */}
      {showDownloadsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-2xl font-bold text-foreground">My Downloads</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDownloadsModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingDownloads ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading downloads...
                </div>
              ) : userDownloads.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Download className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold mb-2">No downloads yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Download some beats to see them here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userDownloads.map((download) => (
                    <div key={download.beat_id} className="beat-card space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Download className="w-5 h-5 text-green-500" />
                          <div>
                            <div className="font-semibold text-foreground">
                              Downloaded on {new Date(download.downloaded_at).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(download.downloaded_at).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {download.beats && (
                        <div className="bg-muted/30 rounded-lg border border-border overflow-hidden">
                          <div onClick={(e) => e.stopPropagation()}>
                            <BeatPlayer
                              audioUrl={download.beats.file_url || ''}
                              title={download.beats.title || 'Untitled Beat'}
                              artist={download.beats.artist || 'Anonymous'}
                              bpm={download.beats.bpm || undefined}
                              beatKey={download.beats.key || undefined}
                              purchaseLink={download.beats.purchase_link || undefined}
                              className="p-4"
                            />
                          </div>
                          
                          {/* Download Button */}
                          <div className="p-4 border-t border-border/30">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                handleDownloadBeat(
                                  download.beats.file_url,
                                  download.beats,
                                  download.beats.id
                                );
                              }}
                              className="flex items-center gap-2 w-full"
                            >
                              <Download className="w-4 h-4" />
                              Download Again
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
