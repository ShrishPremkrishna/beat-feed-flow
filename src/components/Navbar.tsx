import { useState, useRef, useEffect } from 'react';
import { Search, Home, Heart, User, LogOut, Headphones, Music, Menu, MessageCircle, Bell } from 'lucide-react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { InitialsAvatar } from '@/components/ui/initials-avatar';

interface NavbarProps {
  onLogoClick?: () => void;
  onUserProfileClick?: (userId: string) => void;
  onUserSearch?: (query: string) => void;
  onLogout?: () => void;
  onSignIn?: () => void;
  onMessagesClick?: () => void;
  onNotificationsClick?: () => void;
  currentUser?: {
    user_id?: string;
    name: string;
    avatar: string;
    notifications: number;
  };
}

export const Navbar = ({ 
  onLogoClick, 
  onLogout, 
  onUserSearch, 
  onUserProfileClick,
  onSignIn,
  onMessagesClick,
  onNotificationsClick,
  currentUser 
}: NavbarProps) => {

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDropdownPosition = () => {
      if (searchRef.current) {
        const rect = searchRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX,
          width: rect.width
        });
      }
    };

    if (showSearchResults) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [showSearchResults]);

  const user = currentUser;

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    onUserSearch?.(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url')
        .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(5);

      if (error) throw error;

      setSearchResults(profiles || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    }
  };

  const handleUserSelect = (userId: string) => {
    setShowSearchResults(false);
    setSearchQuery('');
    onUserProfileClick?.(userId);
  };

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="relative flex items-center">
            {/* Logo - Left Side */}
            <div className="flex items-center gap-3 group cursor-pointer" onClick={onLogoClick}>
              <div className="p-1 rounded-lg">
                <img 
                  src="/beatify-logo-new.png" 
                  alt="Beatify" 
                  className="h-10 w-auto transition-all duration-300 group-hover:scale-110"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                    if (nextElement) nextElement.style.display = 'block';
                  }}
                />
                <span className="text-white font-bold text-lg hidden">Beatify</span>
              </div>
            </div>

            {/* Absolutely Centered Search Bar */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 max-w-lg" ref={searchRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search artists or producers..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                  onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                  className="pl-10 bg-muted border-muted-foreground/20 focus:border-primary w-full"
                />
              </div>
            </div>

            {/* Right Side Actions - Pushed to far right */}
            <div className="flex items-center gap-2 ml-auto">
              {currentUser && (
                <>
                  {/* Notifications Bell */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onNotificationsClick}
                    className="relative p-2"
                  >
                    <Bell className="w-5 h-5" />
                    {currentUser.notifications > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {currentUser.notifications > 9 ? '9+' : currentUser.notifications}
                      </span>
                    )}
                  </Button>

                  {/* Messages Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onMessagesClick}
                    className="p-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </Button>
                </>
              )}

              {/* User Profile */}
              {currentUser ? (
                /* User Profile Dropdown */
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded-full transition-colors"
                    >
                      <InitialsAvatar
                        name={user.name}
                        avatarUrl={user.avatar}
                        size="sm"
                      />
                      <span className="font-medium hidden sm:block">{user.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onUserProfileClick?.(user.user_id || '')} className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-destructive focus:text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                /* Sign In Button */
                <Button
                  onClick={onSignIn}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:block">Sign In</span>
                </Button>
              )}

              {/* Mobile Menu */}
              <Button variant="ghost" size="sm" className="md:hidden">
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Search Results Dropdown - Portal */}
      {showSearchResults && searchResults.length > 0 && createPortal(
        <div 
          className="fixed bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 9999
          }}
        >
          {searchResults.map((profile) => (
            <div
              key={profile.user_id}
              className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer transition-colors"
              onClick={() => handleUserSelect(profile.user_id)}
            >
              <InitialsAvatar
                name={profile.display_name || profile.username}
                avatarUrl={profile.avatar_url}
                size="sm"
              />
              <div className="flex flex-col">
                <span className="font-medium text-sm">{profile.display_name || profile.username}</span>
                {profile.display_name && profile.username && (
                  <span className="text-xs text-muted-foreground">@{profile.username}</span>
                )}
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};