import { useState } from 'react';
import { MapPin, Link as LinkIcon, Calendar, Star, Edit, Instagram, Twitter, Music, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BeatCard } from './BeatCard';
import { ProfileEditModal } from './ProfileEditModal';

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

  const handleProfileUpdate = (updatedProfile: any) => {
    setCurrentProfile(updatedProfile);
  };

  // Mock user beats
  const userBeats = [
    {
      id: '1',
      title: 'Dark Trap Vibes',
      artist: profileUser.name,
      avatar: profileUser.avatar,
      coverArt: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
      bpm: 140,
      key: 'E Minor',
      mood: ['Dark', 'Trap', 'Energetic'],
      description: 'Perfect for rap vocals, dark atmosphere with heavy 808s',
      price: 75,
      likes: 234,
      comments: 45,
      duration: '3:24',
      isLiked: false
    }
  ];

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
      <Tabs defaultValue="beats" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-muted">
          <TabsTrigger value="beats">Beats</TabsTrigger>
          <TabsTrigger value="likes">Likes</TabsTrigger>
          <TabsTrigger value="playlists">Playlists</TabsTrigger>
        </TabsList>

        <TabsContent value="beats" className="space-y-6">
          {userBeats.map((beat) => (
            <BeatCard
              key={beat.id}
              beat={beat}
              onSwipe={() => {}}
              onLike={() => {}}
              onComment={() => {}}
            />
          ))}
        </TabsContent>

        <TabsContent value="likes" className="space-y-6">
          <div className="text-center py-12 text-muted-foreground">
            Liked beats will appear here
          </div>
        </TabsContent>

        <TabsContent value="playlists" className="space-y-6">
          <div className="text-center py-12 text-muted-foreground">
            User playlists will appear here
          </div>
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