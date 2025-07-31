import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Feed } from '@/components/Feed';
import { UserProfile } from '@/components/UserProfile';
import { PostDetail } from '@/components/PostDetail';
import { BeatSwiper } from '@/components/BeatSwiper';
import { Chat } from '@/components/Chat';
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
  const [showChat, setShowChat] = useState(false);
  const [chatUserId, setChatUserId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'home' | 'following'>('home');

  const [profileLoading, setProfileLoading] = useState(false);
  const [currentProfileForPost, setCurrentProfileForPost] = useState<any>(null);


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
      setProfileLoading(true);
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
    } finally {
      setProfileLoading(false);
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

  const handleProfileUpdate = async (updatedProfile: any) => {
    // Update the userProfile state with the fresh data from the database
    setUserProfile(updatedProfile);
    
    // Also refresh the profile data to ensure everything is in sync
    if (user) {
      await fetchUserProfile(user.id);
    }
  };

  const handlePostClick = (postId: string) => {
    // When clicking from profile, go directly to post detail view
    setSelectedPostId(postId);
    setShowPostDetail(true);
    setShowProfile(false);
    setHighlightedPostId(null);
  };

  const handlePostClickWithProfile = (postId: string, profileData: any) => {
    // When clicking from profile with profile data, pass it to PostDetail
    setSelectedPostId(postId);
    setShowPostDetail(true);
    setShowProfile(false);
    setHighlightedPostId(null);
    // Store the profile data for PostDetail to use
    setCurrentProfileForPost(profileData);
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
    // Navigate to post detail view instead of going back to feed
    if (beatSwiperPostId) {
      setSelectedPostId(beatSwiperPostId);
      setShowPostDetail(true);
    }
    setShowBeatSwiper(false);
    setBeatSwiperPostId(null);
  };

  const handleUserSearch = (query: string) => {
    // This function can be expanded for additional search logic if needed
    console.log('User search:', query);
  };

  const handleUserSelect = async (userId: string) => {
    if (user && userId === user.id) {
      // Viewing own profile - clear viewing states and refresh own profile data
      setViewingUserId(null);
      setViewingUserProfile(null);
      setShowProfile(true);
      setShowPostDetail(false);
      setHighlightedPostId(null);
      // Refresh current user's profile data
      await fetchUserProfile(user.id);
    } else {
      // Viewing someone else's profile
      const profile = await fetchAnyUserProfile(userId);
      if (profile) {
        setViewingUserId(userId);
        setViewingUserProfile(profile);
        setShowProfile(true);
        setShowPostDetail(false);
        setHighlightedPostId(null);
      }
    }
  };

  const handleTabChange = (tab: 'home' | 'following') => {
    setActiveTab(tab);
    // Reset any detail views when changing tabs
    setShowProfile(false);
    setShowPostDetail(false);
    setShowBeatSwiper(false);
    setShowChat(false);
    setHighlightedPostId(null);
  };

  const handleMessagesClick = () => {
    setShowChat(true);
    setShowProfile(false);
    setShowPostDetail(false);
    setShowBeatSwiper(false);
    setChatUserId(null);
  };

  const handleMessageUser = (userId: string) => {
    setChatUserId(userId);
    setShowChat(true);
    setShowProfile(false);
    setShowPostDetail(false);
    setShowBeatSwiper(false);
  };

  const handleBackFromChat = () => {
    setShowChat(false);
    setChatUserId(null);
  };

  // Create navbar user object
  const navbarUser = userProfile ? {
    name: userProfile.display_name || 'User',
    avatar: userProfile.avatar_url || '',
    notifications: 0,
    user_id: userProfile.user_id
  } : undefined;

  const renderContent = () => {
    if (showChat) {
      return (
        <Chat 
          onBack={handleBackFromChat}
          initialUserId={chatUserId}
        />
      );
    }

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
          onUserProfileClick={handleUserSelect}
          onSignIn={() => setShowAuth(true)}
          currentProfile={currentProfileForPost}
        />
      );
    }
    
    if (showProfile) {
      // Show loading state when refreshing own profile
      if (!viewingUserId && profileLoading) {
        return (
          <div className="text-center py-12 text-muted-foreground">
            Loading profile...
          </div>
        );
      }
      
      // Determine which profile to show
      const profileToShow = viewingUserId ? viewingUserProfile : userProfile;
      const isOwnProfile = !viewingUserId;
      
      // Don't render if we don't have profile data
      if (!profileToShow) {
        return (
          <div className="text-center py-12 text-muted-foreground">
            Loading profile...
          </div>
        );
      }
      
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
                likes: profileToShow.likes_count || 0
              }
            } : undefined}
            isOwnProfile={!!isOwnProfile}
            onBackToFeed={handleBackToFeed}
            onPostClick={handlePostClickWithProfile}
            userId={viewingUserId || user?.id}
            onProfileUpdate={handleProfileUpdate}
            onSignIn={() => setShowAuth(true)}
            onMessageUser={handleMessageUser}
          />
        );
    }
    
    return <Feed highlightedPostId={highlightedPostId} onPostDetailView={handlePostDetailView} onUserProfileClick={handleUserSelect} activeTab={activeTab} onTabChange={handleTabChange} onSignIn={() => setShowAuth(true)} />;
  };



  return (
    <div className={`${showChat ? 'h-screen flex flex-col' : 'min-h-screen'} bg-gradient-hero`}>
      <div className="navbar">
        <Navbar 
          currentUser={navbarUser}
          onUserProfileClick={handleUserSelect}
          onLogout={handleLogout}
          onLogoClick={handleBackToFeed}
          onUserSearch={handleUserSearch}
          onSignIn={() => setShowAuth(true)}
          onMessagesClick={handleMessagesClick}
        />
      </div>
      
      <main className={showChat ? "flex-1 flex flex-col" : "p-6 max-w-4xl mx-auto"}>
        <div className={showChat ? "flex-1" : "space-y-6"}>
          {renderContent()}
        </div>
      </main>
      
      <AuthModal 
        isOpen={showAuth} 
        onClose={() => setShowAuth(false)}
        onAuth={setUser}
      />
    </div>
  );
};

export default Index;
