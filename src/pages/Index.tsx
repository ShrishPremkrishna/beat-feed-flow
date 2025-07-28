import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Feed } from '@/components/Feed';
import { UserProfile } from '@/components/UserProfile';
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

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Fetch user profile if logged in
        if (session?.user) {
          setTimeout(() => {
            fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setUserProfile(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        setTimeout(() => {
          fetchUserProfile(session.user.id);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserProfile(null);
  };

  const handleProfileClick = () => {
    setShowProfile(true);
    setHighlightedPostId(null);
  };

  const handleBackToFeed = () => {
    setShowProfile(false);
    setHighlightedPostId(null);
    // Refresh profile data when going back to feed
    if (user) {
      fetchUserProfile(user.id);
    }
  };

  const handlePostClick = (postId: string) => {
    setHighlightedPostId(postId);
    setShowProfile(false);
  };

  // Create navbar user object
  const navbarUser = userProfile ? {
    name: userProfile.display_name || 'User',
    avatar: userProfile.avatar_url || '',
    notifications: 0
  } : undefined;

  const renderContent = () => {
    if (showProfile) {
      return (
        <UserProfile 
          user={userProfile ? {
            name: userProfile.display_name || 'Anonymous User',
            username: userProfile.username || '@user',
            avatar: userProfile.avatar_url || '',
            bio: userProfile.bio || 'No bio available',
            location: userProfile.location || 'Unknown',
            joinDate: userProfile.created_at ? new Date(userProfile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently',
            website: userProfile.website || '',
            social: {
              instagram: '',
              twitter: '',
              beatstars: ''
            },
            stats: {
              followers: userProfile.followers_count || 0,
              following: userProfile.following_count || 0,
              beats: userProfile.beats_count || 0,
              likes: userProfile.likes_count || 0
            },
            genres: [],
            placements: [],
            rating: 0,
            isVerified: false
          } : undefined}
          isOwnProfile={true}
          onBackToFeed={handleBackToFeed}
          onPostClick={handlePostClick}
        />
      );
    }
    return <Feed highlightedPostId={highlightedPostId} />;
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
          onLogoClick={handleBackToFeed}
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
