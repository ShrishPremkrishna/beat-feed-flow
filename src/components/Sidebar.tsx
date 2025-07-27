import { Home, Search, Compass, TrendingUp, BarChart3, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SidebarProps {
  currentPage?: string;
  onPageChange?: (page: string) => void;
  onLogout?: () => void;
}

export const Sidebar = ({ currentPage = 'feed', onPageChange, onLogout }: SidebarProps) => {
  const menuItems = [
    { id: 'feed', label: 'Feed', icon: Home },
    { id: 'discover', label: 'Discover', icon: Compass },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: 'Pro' },
  ];

  return (
    <aside className="w-64 h-screen sticky top-16 p-4 border-r border-border">
      <nav className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full justify-start gap-3 ${isActive ? 'bg-primary/10 text-primary' : ''}`}
              onClick={() => onPageChange?.(item.id)}
            >
              <Icon className="w-5 h-5" />
              {item.label}
              {item.badge && (
                <Badge variant="secondary" className="ml-auto text-xs bg-primary/20 text-primary">
                  {item.badge}
                </Badge>
              )}
            </Button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="absolute bottom-4 left-4 right-4 space-y-2">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3"
          onClick={() => onPageChange?.('settings')}
        >
          <Settings className="w-5 h-5" />
          Settings
        </Button>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-destructive hover:text-destructive"
          onClick={onLogout}
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
      </div>
    </aside>
  );
};