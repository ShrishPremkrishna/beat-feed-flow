import { useParams, useNavigate } from 'react-router-dom';
import { PostDetail } from '@/components/PostDetail';
import { Navbar } from '@/components/Navbar';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

const PostPage = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Fetch user profile if logged in
        if (session?.user) {
          fetchUserProfile(session.user.id);
        } else {
          setUserProfile(null);
        }
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }

        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session?.user) {
          fetchUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
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

  const handleLogout = async () => {
    try {
      console.log('Logging out...');
      
      // Clear auth state first
      setUser(null);
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
    navigate('/');
  };

  const handleProfileClick = () => {
    navigate('/');
  };

  const handleUserSearch = (query: string) => {
    console.log('User search:', query);
  };

  const handleUserSelect = async (userId: string) => {
    navigate('/');
  };

  // Create navbar user object
  const navbarUser = userProfile ? {
    name: userProfile.display_name || 'User',
    avatar: userProfile.avatar_url || '',
    notifications: 0
  } : undefined;

  if (!postId) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Post not found</h1>
          <button 
            onClick={handleBackToFeed}
            className="btn-gradient px-6 py-3 rounded-lg"
          >
            Back to Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="navbar">
        <Navbar 
          currentUser={navbarUser}
          onUserProfileClick={() => {}}
          onLogout={handleLogout}
          onLogoClick={handleBackToFeed}
          onUserSearch={handleUserSearch}
          onTabChange={() => {}}
          activeTab="home"
        />
      </div>
      
      <main className="p-6 max-w-4xl mx-auto">
        <div className="space-y-6">
          <PostDetail 
            postId={postId}
            onBack={handleBackToFeed}
            onUserProfileClick={handleUserSelect}
          />
        </div>
      </main>
    </div>
  );
};

export default PostPage; 