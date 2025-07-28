import { useState } from 'react';
import { Search, Bell, User, Menu, Music, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface NavbarProps {
  onProfileClick?: () => void;
  onNotificationsClick?: () => void;
  currentUser?: {
    name: string;
    avatar: string;
    notifications: number;
  };
}

export const Navbar = ({ onProfileClick, onNotificationsClick, currentUser }: NavbarProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const defaultUser = {
    name: 'Current User',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    notifications: 3
  };

  const user = currentUser || defaultUser;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Enhanced Logo inspired by reference */}
          <div className="flex items-center gap-3 group cursor-pointer">
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
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent group-hover:bg-gradient-accent group-hover:bg-clip-text transition-all duration-300">
                Beatify
              </h1>
              <div className="w-full h-0.5 bg-gradient-primary rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Search beats, artists, or genres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted border-muted-foreground/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Navigation Actions */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onNotificationsClick}
              className="relative"
            >
              <Bell className="w-5 h-5" />
              {user.notifications > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs"
                >
                  {user.notifications}
                </Badge>
              )}
            </Button>

            {/* Profile */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onProfileClick}
              className="flex items-center gap-2"
            >
              <img 
                src={user.avatar} 
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-primary/20"
              />
              <span className="hidden md:inline text-sm font-medium">{user.name}</span>
            </Button>

            {/* Mobile Menu */}
            <Button variant="ghost" size="sm" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};