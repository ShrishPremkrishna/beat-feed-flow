import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { Feed } from '@/components/Feed';
import { DiscoverPage } from '@/components/DiscoverPage';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { UserProfile } from '@/components/UserProfile';
import { AuthModal } from '@/components/AuthModal';

const Index = () => {
  const [currentPage, setCurrentPage] = useState('feed');
  const [showProfile, setShowProfile] = useState(false);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);

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
            <button 
              onClick={() => setShowAuth(true)}
              className="btn-gradient px-8 py-3 rounded-xl text-lg font-semibold"
            >
              Join the Community
            </button>
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
        currentUser={user}
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
          onLogout={() => setUser(null)}
        />
        
        <main className="flex-1 p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Index;
