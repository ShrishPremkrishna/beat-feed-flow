import { useState, useRef, useEffect } from 'react';
import { Search, Home, Heart, User, LogOut, Headphones, Music, Menu } from 'lucide-react';
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

  const defaultUser = {
    user_id: '',
    name: 'Current User',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    notifications: 3
  };

  const user = currentUser || defaultUser;

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
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Enhanced Logo inspired by reference */}
            <div className="flex items-center gap-3 group cursor-pointer" onClick={onLogoClick}>
              {/* Logo Icon - Headphones with Music Note */}
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center shadow-glow group-hover:shadow-intense transition-all duration-300 group-hover:scale-110">
                  <div className="relative">
                    <Headphones className="w-6 h-6 text-white" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-accent rounded-full flex items-center justify-center">
                      <Music className="w-2 h-2 text-white" />
                    </div>
                  </div>
                </div>
                {/* Glow ring */}
                <div className="absolute inset-0 w-10 h-10 rounded-full bg-gradient-primary opacity-20 blur-md group-hover:opacity-40 transition-opacity duration-300"></div>
              </div>
              
              {/* Brand Text */}
              <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-accent transition-all duration-300">
              Beatify
            </h1>
                <div className="w-full h-0.5 bg-gradient-primary rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
              </div>
            </div>

            {/* Spacer for centering */}
            <div className="flex-1"></div>

            {/* Search Bar */}
            <div className="flex-1 max-w-md relative" ref={searchRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search artists..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
                  onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                  className="pl-10 bg-muted border-muted-foreground/20 focus:border-primary"
                />
              </div>
            </div>

            {/* User Profile */}
            <div className="flex items-center gap-4 flex-shrink-0">
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