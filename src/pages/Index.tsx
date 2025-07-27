import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Feed } from '@/components/Feed';
import { DiscoverPage } from '@/components/DiscoverPage';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { UserProfile } from '@/components/UserProfile';
import { AuthModal } from '@/components/AuthModal';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

const Index = () => {
  const [currentPage, setCurrentPage] = useState('feed');
  const [showProfile, setShowProfile] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(true);

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

  // Create navbar user object
  const navbarUser = userProfile ? {
    name: userProfile.display_name || userProfile.username || 'User',
    avatar: userProfile.avatar_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    notifications: 0 // You can implement notifications later
  } : undefined;

  const renderContent = () => {
    if (showProfile) {
      return <UserProfile isOwnProfile={true} />;
    }

    switch (currentPage) {
      case 'feed':
        return <Feed />;
      case 'discover':
        return <DiscoverPage />;
      case 'analytics':
        return <AnalyticsDashboard />;
      default:
        return <Feed />;
    }
  };

  if (!user) {
    return (
      <>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-6">
            <h1 className="text-6xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Beatify
            </h1>
            <p className="text-xl text-muted-foreground max-w-md">
              The social platform where music creators connect, share beats, and discover new collaborations
            </p>
            <Button 
              onClick={() => setShowAuth(true)}
              size="lg"
              className="btn-gradient px-8 py-3 text-lg font-semibold"
            >
              Join the Community
            </Button>
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
    <div className="min-h-screen bg-background">
      <Navbar 
        currentUser={navbarUser}
        onProfileClick={() => setShowProfile(!showProfile)}
        onNotificationsClick={() => console.log('Notifications clicked')}
      />
      
      <div className="flex">
        <Sidebar 
          currentPage={currentPage}
          onPageChange={(page) => {
            setCurrentPage(page);
            setShowProfile(false);
          }}
          onLogout={handleLogout}
        />
        
        <main className="flex-1 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Index;
