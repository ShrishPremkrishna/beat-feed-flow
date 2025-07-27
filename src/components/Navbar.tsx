import { useState } from 'react';
import { Search, Bell, User, Menu, Music } from 'lucide-react';
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
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Beatify
            </h1>
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