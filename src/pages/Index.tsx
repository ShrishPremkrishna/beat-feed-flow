import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Feed } from '@/components/Feed';
import { UserProfile } from '@/components/UserProfile';
import { PostDetail } from '@/components/PostDetail';
import { BeatSwiper } from '@/components/BeatSwiper';
import { AuthModal } from '@/components/AuthModal';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

const Index = () => {
  const [showProfile, setShowProfile] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
  const [showPostDetail, setShowPostDetail] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [viewingUserProfile, setViewingUserProfile] = useState<any>(null);
  const [showBeatSwiper, setShowBeatSwiper] = useState(false);
  const [beatSwiperPostId, setBeatSwiperPostId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state change:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Fetch user profile if logged in
        if (session?.user) {
          setTimeout(() => {
            if (mounted) {
              fetchUserProfile(session.user.id);
            }
          }, 0);
        } else {
          setUserProfile(null);
        }
      }
    );

    // THEN check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        if (!mounted) return;

        console.log('Initial session check:', session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session?.user) {
          setTimeout(() => {
            if (mounted) {
              fetchUserProfile(session.user.id);
            }
          }, 0);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Beat Swiper event listener
    const handleBeatSwiperOpen = (event: any) => {
      if (event.detail?.postId) {
        setBeatSwiperPostId(event.detail.postId);
        setShowBeatSwiper(true);
        setShowPostDetail(false);
        setShowProfile(false);
      }
    };

    window.addEventListener('openBeatSwiper', handleBeatSwiperOpen);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('openBeatSwiper', handleBeatSwiperOpen);
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }
      
      setUserProfile(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchAnyUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error:', error);
      return null;
    }
  };

  const handleLogout = async () => {
    try {
      console.log('Logging out...');
      
      // Clear auth state first
      setUser(null);
      setSession(null);
      setUserProfile(null);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error('Logout error:', error);
      } else {
        console.log('Logout successful');
      }
      
      // Force page reload to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('Logout exception:', error);
      // Force reload even if there's an error
      window.location.reload();
    }
  };


  const handleProfileClick = () => {
    setShowProfile(true);
    setShowPostDetail(false);
    setHighlightedPostId(null);
    setViewingUserId(null);
    setViewingUserProfile(null);
  };

  const handleBackToFeed = () => {
    setShowProfile(false);
    setShowPostDetail(false);
    setHighlightedPostId(null);
    setViewingUserId(null);
    setViewingUserProfile(null);
    // Refresh profile data when going back to feed
    if (user) {
      fetchUserProfile(user.id);
    }
  };

  const handlePostClick = (postId: string) => {
    // When clicking from profile, go directly to post detail view
    setSelectedPostId(postId);
    setShowPostDetail(true);
    setShowProfile(false);
    setHighlightedPostId(null);
  };

  const handlePostDetailView = (postId: string) => {
    setSelectedPostId(postId);
    setShowPostDetail(true);
    setShowProfile(false);
    setHighlightedPostId(null);
  };

  const handleBackFromPostDetail = () => {
    setShowPostDetail(false);
    setSelectedPostId(null);
  };

  const handleBackFromBeatSwiper = () => {
    setShowBeatSwiper(false);
    setBeatSwiperPostId(null);
  };

  const handleUserSearch = (query: string) => {
    // This function can be expanded for additional search logic if needed
    console.log('User search:', query);
  };

  const handleUserSelect = async (userId: string) => {
    // Fetch the selected user's profile and show it
    const profile = await fetchAnyUserProfile(userId);
    if (profile) {
      setViewingUserId(userId);
      setViewingUserProfile(profile);
      setShowProfile(true);
      setShowPostDetail(false);
      setHighlightedPostId(null);
    }
  };

  // Create navbar user object
  const navbarUser = userProfile ? {
    name: userProfile.display_name || 'User',
    avatar: userProfile.avatar_url || '',
    notifications: 0
  } : undefined;

  const renderContent = () => {
    if (showBeatSwiper && beatSwiperPostId) {
      return (
        <BeatSwiper 
          postId={beatSwiperPostId}
          onBack={handleBackFromBeatSwiper}
        />
      );
    }
    
    if (showPostDetail && selectedPostId) {
      return (
        <PostDetail 
          postId={selectedPostId}
          onBack={handleBackFromPostDetail}
        />
      );
    }
    
    if (showProfile) {
      // Determine which profile to show
      const profileToShow = viewingUserProfile || userProfile;
      const isOwnProfile = !viewingUserId && userProfile;
      
      return (
        <UserProfile 
          user={profileToShow ? {
            name: profileToShow.display_name || 'Anonymous User',
            username: profileToShow.username || '@user',
            avatar: profileToShow.avatar_url || '',
            bio: profileToShow.bio || 'No bio available',
            location: profileToShow.location || 'Unknown',
            joinDate: profileToShow.created_at ? new Date(profileToShow.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently',
            website: profileToShow.website || '',
            social: {
              instagram: '',
              twitter: '',
              beatstars: ''
            },
            stats: {
              followers: profileToShow.followers_count || 0,
              following: profileToShow.following_count || 0,
              beats: profileToShow.beats_count || 0,
              likes: profileToShow.likes_count || 0
            },
            genres: [],
            placements: [],
            rating: 0,
            isVerified: false
          } : undefined}
          isOwnProfile={!!isOwnProfile}
          onBackToFeed={handleBackToFeed}
          onPostClick={handlePostClick}
          userId={viewingUserId || user?.id}
        />
      );
    }
    
    return <Feed highlightedPostId={highlightedPostId} onPostDetailView={handlePostDetailView} onUserProfileClick={handleUserSelect} />;
  };

  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-gradient-hero flex items-center justify-center relative overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          </div>
          
          <div className="text-center space-y-8 relative z-10 max-w-2xl px-6">
            <div className="space-y-4">
              <h1 className="text-7xl md:text-8xl font-bold bg-gradient-primary bg-clip-text text-transparent animate-fade-in">
                Beatify
              </h1>
              <div className="w-32 h-1 bg-gradient-primary mx-auto rounded-full shadow-glow"></div>
            </div>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
              The social platform where music creators connect, share beats, and discover new collaborations
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button 
                onClick={() => setShowAuth(true)}
                size="lg"
                className="btn-gradient px-8 py-4 text-lg font-semibold min-w-[200px] shadow-glow"
              >
                Join the Community
              </Button>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 bg-gradient-primary rounded-full border-2 border-background"></div>
                  <div className="w-8 h-8 bg-gradient-accent rounded-full border-2 border-background"></div>
                  <div className="w-8 h-8 bg-gradient-ai rounded-full border-2 border-background"></div>
                </div>
                <span>Join 10,000+ creators</span>
              </div>
            </div>
          </div>
        </div>
        <AuthModal 
          isOpen={showAuth} 
          onClose={() => setShowAuth(false)}
          onAuth={setUser}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="navbar">
        <Navbar 
          currentUser={navbarUser}
          onProfileClick={handleProfileClick}
          onNotificationsClick={() => console.log('Notifications clicked')}
          onLogout={handleLogout}
          onLogoClick={handleBackToFeed}
          onUserSearch={handleUserSearch}
          onUserSelect={handleUserSelect}
        />
      </div>
      
      <main className="p-6 max-w-4xl mx-auto">
        <div className="space-y-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Index;
